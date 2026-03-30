<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\DiscordGuildMemberResolver;
use App\Service\UserServiceRecordProvisioner;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Uid\Uuid;
use Symfony\Bundle\SecurityBundle\Security;

#[Route('/api/users')]
final class UserController
{
    public const VALID_GRADES = ['Sheriff de comté', 'Sheriff Adjoint', 'Sheriff en chef', 'Sheriff', 'Sheriff Deputy', 'Deputy'];

    private const GRADE_ORDER = [
        'Sheriff de comté' => 0,
        'Sheriff Adjoint' => 1,
        'Sheriff en chef' => 2,
        'Sheriff' => 3,
        'Sheriff Deputy' => 4,
        'Deputy' => 5,
    ];

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
        private readonly UserServiceRecordProvisioner $userServiceRecordProvisioner,
        private readonly Security $security,
    ) {
    }

    #[Route('', name: 'api_users_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $users = $this->userRepository->findBy([], ['username' => 'ASC']);
        $list = array_map(function (User $user): array {
            $recruitedAt = $user->getRecruitedAt();
            return [
                'id' => $user->getId()->toRfc4122(),
                'username' => $user->getUsername(),
                'avatarUrl' => $user->getAvatarUrl(),
                'grade' => $user->getGrade(),
                'recruitedAt' => $recruitedAt !== null ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            ];
        }, $users);

        return new JsonResponse($list);
    }

    #[Route('/{id}', name: 'api_users_patch', methods: ['PATCH'])]
    public function patch(string $id, Request $request): JsonResponse
    {
        $user = null;
        $previousGrade = null;

        if (str_starts_with($id, 'discord-')) {
            $discordId = substr($id, \strlen('discord-'));
            if ($discordId === '') {
                return new JsonResponse(['error' => 'Invalid user id'], 400);
            }
            $user = $this->userRepository->findOneBy(['discordId' => $discordId]);
            if ($user === null) {
                $member = $this->discordGuildMemberResolver->getMember($discordId);
                if ($member === null || !isset($member['user']['id'], $member['user']['username'])) {
                    return new JsonResponse(['error' => 'Membre Discord introuvable ou bot sans accès au serveur'], 404);
                }
                $username = isset($member['nick']) && \is_string($member['nick']) && trim($member['nick']) !== ''
                    ? trim($member['nick'])
                    : (string) $member['user']['username'];
                $avatarUrl = null;
                if (isset($member['user']['avatar']) && \is_string($member['user']['avatar'])) {
                    $avatarUrl = 'https://cdn.discordapp.com/avatars/' . $discordId . '/' . $member['user']['avatar'] . '.png';
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

        $previousGrade = $user instanceof User ? $user->getGrade() : null;
        $actor = $this->security->getUser();

        $data = json_decode((string) $request->getContent(), true);
        if (!\is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON'], 400);
        }

        if (array_key_exists('grade', $data)) {
            $grade = $data['grade'];
            if ($grade !== null && $grade !== '') {
                $grade = trim((string) $grade);
                if (!\in_array($grade, self::VALID_GRADES, true)) {
                    return new JsonResponse(
                        ['error' => 'Invalid grade. Use: ' . implode(', ', self::VALID_GRADES)],
                        400,
                    );
                }

                if ($actor instanceof User && $user instanceof User && !$actor->getId()->equals($user->getId())) {
                    $actorGrade = $actor->getGrade();
                    $targetCurrentGrade = $user->getGrade();
                    $actorOrder = $actorGrade !== null ? (self::GRADE_ORDER[$actorGrade] ?? null) : null;
                    $targetOrder = $targetCurrentGrade !== null ? (self::GRADE_ORDER[$targetCurrentGrade] ?? 99) : 99;
                    if ($actorOrder === null || $actorOrder > 1 || $actorOrder >= $targetOrder) {
                        return new JsonResponse(['error' => 'Promotion non autorisée (grade insuffisant pour modifier ce sheriff).'], 403);
                    }
                }

                $user->setGrade($grade);
            } else {
                if ($actor instanceof User) {
                    $targetGrade = $user->getGrade();
                    $actorGrade = $actor->getGrade();
                    if ($targetGrade !== null && $actorGrade !== null) {
                        $targetOrder = self::GRADE_ORDER[$targetGrade] ?? null;
                        $actorOrder = self::GRADE_ORDER[$actorGrade] ?? null;
                        if ($targetOrder !== null && $actorOrder !== null) {
                            $allowed = false;
                            if ($actorOrder === 0) {
                                $allowed = true;
                            } elseif ($actorOrder === 1 && $actorOrder < $targetOrder) {
                                $allowed = true;
                            }

                            if (!$allowed) {
                                return new JsonResponse(['error' => 'Suppression de grade non autorisée (grade insuffisant).'], 403);
                            }
                        }
                    }
                }

                $user->setGrade(null);
            }
        }

        $this->entityManager->flush();
        $newGrade = $user->getGrade();
        $discordRoleError = null;
        if ($previousGrade !== null && \in_array($previousGrade, User::getSheriffGradeValues(), true)) {
            $discordRoleError = $this->discordGuildMemberResolver->clearSheriffRolesForMember($user->getDiscordId());
        }
        if ($newGrade !== null && $newGrade !== $previousGrade && \in_array($newGrade, User::getSheriffGradeValues(), true)) {
            $discordRoleError = $this->discordGuildMemberResolver->addSheriffRoleToMember($user->getDiscordId(), $newGrade);
        }

        $recruitedAt = $user->getRecruitedAt();
        return new JsonResponse([
            'id' => $user->getId()->toRfc4122(),
            'username' => $user->getUsername(),
            'avatarUrl' => $user->getAvatarUrl(),
            'grade' => $user->getGrade(),
            'recruitedAt' => $recruitedAt !== null ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            'discordRoleError' => $discordRoleError,
        ]);
    }
}
