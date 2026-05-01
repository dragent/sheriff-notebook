<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Domain\Grade;
use App\Domain\GradeHierarchy;
use App\Entity\User;
use App\Message\Discord\SetSheriffRoleMessage;
use App\Repository\UserRepository;
use App\Service\DiscordGuildMemberResolver;
use App\Service\UserServiceRecordProvisioner;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;

#[Route('/api/users')]
final class UserController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
        private readonly UserServiceRecordProvisioner $userServiceRecordProvisioner,
        private readonly Security $security,
        private readonly MessageBusInterface $messageBus,
        #[Autowire(service: 'limiter.api_user_grade_patch')]
        private readonly RateLimiterFactory $userGradePatchLimiter,
    ) {
    }

    #[Route('', name: 'api_users_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $users = $this->userRepository->findBy([], ['username' => 'ASC']);
        $list = array_map(static function (User $user): array {
            $recruitedAt = $user->getRecruitedAt();

            return [
                'id' => $user->getId()->toRfc4122(),
                'username' => $user->getUsername(),
                'avatarUrl' => $user->getAvatarUrl(),
                'grade' => $user->getGrade(),
                'recruitedAt' => null !== $recruitedAt ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            ];
        }, $users);

        return new JsonResponse($list);
    }

    #[Route('/{id}', name: 'api_users_patch', methods: ['PATCH'])]
    public function patch(string $id, Request $request): JsonResponse
    {
        $user = null;

        if (str_starts_with($id, 'discord-')) {
            $discordId = substr($id, \strlen('discord-'));
            if ('' === $discordId) {
                return new JsonResponse(['error' => 'Invalid user id'], 400);
            }
            $user = $this->userRepository->findOneBy(['discordId' => $discordId]);
            if (null === $user) {
                $member = $this->discordGuildMemberResolver->getMember($discordId);
                if (null === $member || !isset($member['user']['id'], $member['user']['username'])) {
                    return new JsonResponse(['error' => 'Membre Discord introuvable ou bot sans accès au serveur'], 404);
                }
                $username = isset($member['nick']) && \is_string($member['nick']) && '' !== trim($member['nick'])
                    ? trim($member['nick'])
                    : (string) $member['user']['username'];
                $avatarUrl = null;
                if (isset($member['user']['avatar']) && \is_string($member['user']['avatar'])) {
                    $avatarUrl = 'https://cdn.discordapp.com/avatars/'.$discordId.'/'.$member['user']['avatar'].'.png';
                }
                $user = new User($discordId, $username);
                $user->setAvatarUrl($avatarUrl);
                $this->entityManager->persist($user);
                $this->userServiceRecordProvisioner->provisionForNewUser($user);
            }
        } else {
            try {
                $uuid = Uuid::fromString($id);
            } catch (\ValueError) {
                return new JsonResponse(['error' => 'Invalid user id'], 400);
            }
            $user = $this->userRepository->find($uuid);
            if (!$user instanceof User) {
                return new JsonResponse(['error' => 'User not found'], 404);
            }
        }

        $previousGrade = $user instanceof User ? Grade::tryFromLabel($user->getGrade()) : null;
        $actorEntity = $this->security->getUser();
        $actor = $actorEntity instanceof User ? Grade::tryFromLabel($actorEntity->getGrade()) : null;

        $data = json_decode((string) $request->getContent(), true);
        if (!\is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON'], 400);
        }

        if (\array_key_exists('grade', $data)) {
            if (!$this->userGradePatchLimiter->create((string) ($request->getClientIp() ?? 'anon'))->consume()->isAccepted()) {
                return new JsonResponse(['error' => 'Trop de modifications de grade. Réessayez dans une minute.'], 429);
            }
            $rawGrade = $data['grade'];
            if (null !== $rawGrade && '' !== $rawGrade) {
                $newGrade = Grade::tryFromLabel((string) $rawGrade);
                if (null === $newGrade) {
                    return new JsonResponse(
                        ['error' => 'Invalid grade. Use: '.implode(', ', Grade::labels())],
                        400,
                    );
                }

                if ($actorEntity instanceof User && !$actorEntity->getId()->equals($user->getId())) {
                    if (!GradeHierarchy::canChangeGradeOf($actor, $previousGrade)) {
                        return new JsonResponse(['error' => 'Promotion non autorisée (grade insuffisant pour modifier ce sheriff).'], 403);
                    }
                }

                $user->setGrade($newGrade->value);
            } else {
                // Clearing a grade is gated only when the target currently HAS a grade. The legacy
                // controller skipped the auth check on a null-to-null no-op; we preserve that.
                if (null !== $previousGrade && !GradeHierarchy::canClearGradeOf($actor, $previousGrade)) {
                    return new JsonResponse(['error' => 'Suppression de grade non autorisée (grade insuffisant).'], 403);
                }

                $user->setGrade(null);
            }
        }

        $this->entityManager->flush();
        $newGrade = $user->getGrade();
        $discordRoleQueued = false;
        if (\array_key_exists('grade', $data) && $newGrade !== $previousGrade?->value) {
            $previousIsSheriff = null !== $previousGrade;
            $newIsSheriff = null !== $newGrade && null !== Grade::tryFromLabel($newGrade);
            if ($previousIsSheriff || $newIsSheriff) {
                $this->messageBus->dispatch(new SetSheriffRoleMessage(
                    $user->getDiscordId(),
                    $newIsSheriff ? $newGrade : null,
                ));
                $discordRoleQueued = true;
            }
        }

        $recruitedAt = $user->getRecruitedAt();

        return new JsonResponse([
            'id' => $user->getId()->toRfc4122(),
            'username' => $user->getUsername(),
            'avatarUrl' => $user->getAvatarUrl(),
            'grade' => $user->getGrade(),
            'recruitedAt' => null !== $recruitedAt ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            'discordRoleQueued' => $discordRoleQueued,
            'discordRoleError' => null,
        ]);
    }
}
