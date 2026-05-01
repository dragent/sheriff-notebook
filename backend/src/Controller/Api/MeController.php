<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Domain\Grade;
use App\Entity\User;
use App\Repository\CountyReferenceRepository;
use App\Service\DiscordGuildMemberResolver;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

final class MeController
{
    public function __construct(
        private readonly CountyReferenceRepository $referenceRepository,
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('/api/me', name: 'api_me', methods: ['GET'])]
    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        $this->refreshUsernameFromDiscordIfNeeded($user);
        $grade = $user->getGrade();
        $allowedFormations = $this->getAllowedFormationsForGrade($grade);
        $allFormations = $this->getAllFormations();
        $recruitedAt = $user->getRecruitedAt();

        return new JsonResponse([
            'id' => $user->getId()->toRfc4122(),
            'discordId' => $user->getDiscordId(),
            'username' => $user->getUsername(),
            'avatarUrl' => $user->getAvatarUrl(),
            'grade' => $grade,
            'recruitedAt' => null !== $recruitedAt ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            'allowedFormations' => $allowedFormations,
            'allFormations' => $allFormations,
            'roles' => $user->getRoles(),
        ]);
    }

    #[Route('/api/me/join-guild', name: 'api_me_join_guild', methods: ['POST'])]
    public function joinGuild(#[CurrentUser] User $user, Request $request): JsonResponse
    {
        $body = $request->getContent();
        $data = \is_string($body) ? json_decode($body, true) : null;
        $accessToken = isset($data['accessToken']) && \is_string($data['accessToken']) ? trim($data['accessToken']) : '';

        if ('' === $accessToken) {
            return new JsonResponse(['error' => 'Corps de requête invalide (accessToken requis).'], Response::HTTP_BAD_REQUEST);
        }

        $grade = $user->getGrade();
        $error = $this->discordGuildMemberResolver->addMemberToGuildWithSheriffDeputyRole($user->getDiscordId(), $accessToken, $grade);
        if (null !== $error) {
            return new JsonResponse(['error' => $error], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return new JsonResponse(['ok' => true], Response::HTTP_OK);
    }

    /** @return list<array{id: string, label: string, maxGradeOrder: int}> */
    private function getAllFormations(): array
    {
        $ref = $this->referenceRepository->getSingleton();
        $data = $ref->getData();
        $catalog = $data['formations'] ?? [];
        $formationsByGrade = $data['formationsByGrade'] ?? [];
        if (!\is_array($catalog)) {
            return [];
        }
        $maxOrderByFormationId = [];
        if (\is_array($formationsByGrade)) {
            foreach ($formationsByGrade as $config) {
                if (!\is_array($config)) {
                    continue;
                }
                $configGrade = $config['grade'] ?? null;
                $ids = $config['formationIds'] ?? $config['keys'] ?? null;
                if (!\is_string($configGrade) || !\is_array($ids)) {
                    continue;
                }
                $order = Grade::tryFromLabel($configGrade)?->order();
                if (null === $order) {
                    continue;
                }
                foreach ($ids as $id) {
                    if (\is_string($id) && '' !== $id) {
                        $maxOrderByFormationId[$id] = max($maxOrderByFormationId[$id] ?? -1, $order);
                    }
                }
            }
        }
        $result = [];
        foreach ($catalog as $item) {
            if (\is_array($item) && isset($item['id'], $item['label']) && \is_string($item['id']) && \is_string($item['label'])) {
                $result[] = [
                    'id' => $item['id'],
                    'label' => $item['label'],
                    'maxGradeOrder' => $maxOrderByFormationId[$item['id']] ?? 4,
                ];
            }
        }

        return $result;
    }

    private function refreshUsernameFromDiscordIfNeeded(User $user): void
    {
        $display = $this->discordGuildMemberResolver->getServerDisplayName($user->getDiscordId());
        if (null !== $display && '' !== $display && $user->getUsername() !== $display) {
            $user->setUsername($display);
            $this->entityManager->flush();
        }
    }

    /** Formations allowed for this grade (from reference formations + formationsByGrade); higher grades inherit lower-grade formations.
     * @return list<array{id: string, label: string}>
     */
    private function getAllowedFormationsForGrade(?string $grade): array
    {
        $parsed = Grade::tryFromLabel($grade);
        if (null === $parsed || Grade::CountySheriff === $parsed) {
            return [];
        }

        // Deputy has same formation access as Sheriff Deputy (order 4).
        $effectiveOrder = Grade::Deputy === $parsed ? Grade::SheriffDeputy->order() : $parsed->order();

        $ref = $this->referenceRepository->getSingleton();
        $data = $ref->getData();
        $catalog = $data['formations'] ?? [];
        $formationsByGrade = $data['formationsByGrade'] ?? [];
        if (!\is_array($catalog) || !\is_array($formationsByGrade)) {
            return [];
        }

        $catalogById = [];
        foreach ($catalog as $item) {
            if (\is_array($item) && isset($item['id'], $item['label']) && \is_string($item['id']) && \is_string($item['label'])) {
                $catalogById[$item['id']] = $item['label'];
            }
        }

        $formationIds = [];
        foreach ($formationsByGrade as $config) {
            if (!\is_array($config)) {
                continue;
            }
            $configGrade = $config['grade'] ?? null;
            $ids = $config['formationIds'] ?? $config['keys'] ?? null;
            if (!\is_string($configGrade) || !\is_array($ids)) {
                continue;
            }
            $configOrder = Grade::tryFromLabel($configGrade)?->order();
            if (null === $configOrder || $configOrder < $effectiveOrder) {
                continue;
            }
            foreach ($ids as $id) {
                if (\is_string($id) && '' !== $id) {
                    $formationIds[$id] = true;
                }
            }
        }

        $result = [];
        foreach (array_keys($formationIds) as $id) {
            if (isset($catalogById[$id])) {
                $result[] = ['id' => $id, 'label' => $catalogById[$id]];
            }
        }

        return $result;
    }
}
