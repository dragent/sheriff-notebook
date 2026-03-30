<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/sheriffs')]
final class SheriffController
{
    /** Du plus gradé (0) au moins gradé (5). Variantes acceptées (ex. "Sheriff de comté"). */
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
    ) {
    }

    #[Route('', name: 'api_sheriffs_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $users = $this->userRepository->findBy([], ['username' => 'ASC']);
        $sheriffs = [];
        foreach ($users as $user) {
            $grade = $user->getGrade();
            if ($grade === null || $grade === '') {
                continue;
            }
            $recruitedAt = $user->getRecruitedAt();
            $sheriffs[] = [
                'id' => $user->getId()->toRfc4122(),
                'username' => $user->getUsername(),
                'avatarUrl' => $user->getAvatarUrl(),
                'grade' => $grade,
                'recruitedAt' => $recruitedAt !== null ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            ];
        }

        usort($sheriffs, function (array $a, array $b): int {
            $orderA = self::GRADE_ORDER[$a['grade']] ?? 99;
            $orderB = self::GRADE_ORDER[$b['grade']] ?? 99;
            if ($orderA !== $orderB) {
                return $orderA <=> $orderB;
            }
            $dateA = $a['recruitedAt'];
            $dateB = $b['recruitedAt'];
            if ($dateA === null && $dateB === null) {
                return strcasecmp($a['username'], $b['username']);
            }
            if ($dateA === null) {
                return 1;
            }
            if ($dateB === null) {
                return -1;
            }
            $cmp = strcmp((string) $dateA, (string) $dateB);
            if ($cmp !== 0) {
                return $cmp;
            }

            return strcasecmp($a['username'], $b['username']);
        });

        return new JsonResponse($sheriffs);
    }
}
