<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Domain\Grade;
use App\Repository\UserRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/sheriffs')]
final class SheriffController
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {
    }

    #[Route('', name: 'api_sheriffs_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        // Filter at SQL level (was findBy([])+PHP filter); only sheriffs need to be returned to the UI.
        $users = $this->userRepository->createQueryBuilder('u')
            ->andWhere('u.grade IN (:grades)')
            ->setParameter('grades', Grade::labels())
            ->orderBy('u.username', 'ASC')
            ->getQuery()
            ->getResult();

        $sheriffs = [];
        foreach ($users as $user) {
            $grade = $user->getGrade();
            if (null === $grade || '' === $grade) {
                continue;
            }
            $recruitedAt = $user->getRecruitedAt();
            $sheriffs[] = [
                'id' => $user->getId()->toRfc4122(),
                'username' => $user->getUsername(),
                'avatarUrl' => $user->getAvatarUrl(),
                'grade' => $grade,
                'recruitedAt' => null !== $recruitedAt ? $recruitedAt->format(\DateTimeInterface::ATOM) : null,
            ];
        }

        usort($sheriffs, static function (array $a, array $b): int {
            $orderA = Grade::tryFromLabel($a['grade'])?->order() ?? 99;
            $orderB = Grade::tryFromLabel($b['grade'])?->order() ?? 99;
            if ($orderA !== $orderB) {
                return $orderA <=> $orderB;
            }
            $dateA = $a['recruitedAt'];
            $dateB = $b['recruitedAt'];
            if (null === $dateA && null === $dateB) {
                return strcasecmp($a['username'], $b['username']);
            }
            if (null === $dateA) {
                return 1;
            }
            if (null === $dateB) {
                return -1;
            }
            $cmp = strcmp((string) $dateA, (string) $dateB);
            if (0 !== $cmp) {
                return $cmp;
            }

            return strcasecmp($a['username'], $b['username']);
        });

        return new JsonResponse($sheriffs);
    }
}
