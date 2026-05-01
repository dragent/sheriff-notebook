<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Domain\Grade;
use App\Domain\GradeHierarchy;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\Voter\ReferenceVoter;
use App\Service\DiscordChannelNotifier;
use App\Service\EffectifMessageBuilder;
use Symfony\Component\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/discord/effectif')]
#[IsGranted(ReferenceVoter::MANAGE, message: 'Accès réservé au Sheriff de comté et Adjoint.')]
final class DiscordEffectifController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EffectifMessageBuilder $messageBuilder,
        private readonly DiscordChannelNotifier $channelNotifier,
        private readonly ClockInterface $clock,
        private readonly string $effectifChannelId = '',
    ) {
    }

    #[Route('', name: 'api_discord_effectif_preview', methods: ['GET'])]
    public function preview(): JsonResponse
    {
        $sheriffs = $this->getSheriffsList();
        $now = $this->clock->now();
        $markdown = $this->messageBuilder->build($sheriffs, $now);

        return new JsonResponse([
            'markdown' => $markdown,
            'effectif' => \count($sheriffs),
            'maxEffectif' => EffectifMessageBuilder::MAX_EFFECTIF,
            'date' => $now->format('d/m/Y'),
            'recruitmentTelegrams' => $this->getRecruitmentTelegrams($sheriffs),
        ]);
    }

    #[Route('/send', name: 'api_discord_effectif_send', methods: ['POST'])]
    public function send(): JsonResponse
    {
        if ('' === $this->effectifChannelId) {
            return new JsonResponse([
                'error' => 'Canal Discord non configuré (DISCORD_EFFECTIF_CHANNEL_ID).',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $sheriffs = $this->getSheriffsList();
        $now = $this->clock->now();
        $markdown = $this->messageBuilder->build($sheriffs, $now);

        $err = $this->channelNotifier->sendMessage($this->effectifChannelId, $markdown);
        if (null !== $err) {
            return new JsonResponse(['error' => $err], Response::HTTP_BAD_GATEWAY);
        }

        return new JsonResponse([
            'markdown' => $markdown,
            'effectif' => \count($sheriffs),
            'maxEffectif' => EffectifMessageBuilder::MAX_EFFECTIF,
            'date' => $now->format('d/m/Y'),
            'recruitmentTelegrams' => $this->getRecruitmentTelegrams($sheriffs),
        ]);
    }

    /** @return list<array{username: string, grade: string, badge?: string, telegram?: string}> */
    private function getSheriffsList(): array
    {
        // Filter graded users at SQL level + eager-load service record so getTelegramForUser() does not trigger N+1.
        $candidates = $this->userRepository->createQueryBuilder('u')
            ->leftJoin('u.serviceRecord', 'sr')->addSelect('sr')
            ->andWhere('u.grade IN (:grades)')
            ->setParameter('grades', Grade::labels())
            ->orderBy('u.username', 'ASC')
            ->getQuery()
            ->getResult();

        usort($candidates, static function (User $a, User $b): int {
            $oa = Grade::tryFromLabel($a->getGrade())?->order() ?? 99;
            $ob = Grade::tryFromLabel($b->getGrade())?->order() ?? 99;
            if ($oa !== $ob) {
                return $oa <=> $ob;
            }
            $da = $a->getRecruitedAt();
            $db = $b->getRecruitedAt();
            if (null === $da && null === $db) {
                return strcasecmp($a->getUsername(), $b->getUsername());
            }
            if (null === $da) {
                return 1;
            }
            if (null === $db) {
                return -1;
            }
            $cmp = $da <=> $db;
            if (0 !== $cmp) {
                return $cmp;
            }

            return strcasecmp($a->getUsername(), $b->getUsername());
        });

        $sheriffs = [];
        foreach ($candidates as $u) {
            $grade = $u->getGrade();
            if (null === $grade || '' === $grade) {
                continue;
            }
            $badge = $this->getBadgeForUser($u);
            $telegram = $this->getTelegramForUser($u);
            $sheriffs[] = [
                'username' => $u->getUsername(),
                'grade' => $grade,
                'badge' => $badge,
                'telegram' => $telegram,
            ];
        }

        return $sheriffs;
    }

    private function getBadgeForUser(User $user): ?string
    {
        return null;
    }

    private function getTelegramForUser(User $user): ?string
    {
        $record = $user->getServiceRecord();
        if (null === $record) {
            return null;
        }
        $telegram = $record->getTelegramPrimary();

        return null !== $telegram && '' !== $telegram ? trim($telegram) : null;
    }

    /** @param list<array{username: string, grade: string, badge?: string, telegram?: string}> $sheriffs */
    private function getRecruitmentTelegrams(array $sheriffs): array
    {
        $telegrams = [];
        foreach ($sheriffs as $sheriff) {
            $grade = $sheriff['grade'] ?? null;
            $telegram = $sheriff['telegram'] ?? null;
            if (!\is_string($grade) || !GradeHierarchy::canManageReference(Grade::tryFromLabel($grade))) {
                continue;
            }
            if (!\is_string($telegram) || '' === $telegram) {
                continue;
            }
            $telegrams[] = $telegram;
        }

        return array_values(array_unique($telegrams));
    }
}
