<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\DiscordChannelNotifier;
use App\Service\EffectifMessageBuilder;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/discord/effectif')]
final class DiscordEffectifController
{
    private const ALLOWED_GRADES = ['Sheriff de comté', 'Sheriff Adjoint', 'Sheriff adjoint'];

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EffectifMessageBuilder $messageBuilder,
        private readonly DiscordChannelNotifier $channelNotifier,
        private readonly string $effectifChannelId = '',
    ) {
    }

    #[Route('', name: 'api_discord_effectif_preview', methods: ['GET'])]
    public function preview(#[CurrentUser] User $user): JsonResponse
    {
        $grade = $user->getGrade();
        if ($grade === null || !\in_array($grade, self::ALLOWED_GRADES, true)) {
            return new JsonResponse(['error' => 'Accès réservé au Sheriff de comté et Adjoint.'], Response::HTTP_FORBIDDEN);
        }

        $sheriffs = $this->getSheriffsList();
        $now = new \DateTimeImmutable('now');
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
    public function send(#[CurrentUser] User $user): JsonResponse
    {
        $grade = $user->getGrade();
        if ($grade === null || !\in_array($grade, self::ALLOWED_GRADES, true)) {
            return new JsonResponse(['error' => 'Accès réservé au Sheriff de comté et Adjoint.'], Response::HTTP_FORBIDDEN);
        }

        if ($this->effectifChannelId === '') {
            return new JsonResponse([
                'error' => 'Canal Discord non configuré (DISCORD_EFFECTIF_CHANNEL_ID).',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $sheriffs = $this->getSheriffsList();
        $now = new \DateTimeImmutable('now');
        $markdown = $this->messageBuilder->build($sheriffs, $now);

        $err = $this->channelNotifier->sendMessage($this->effectifChannelId, $markdown);
        if ($err !== null) {
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
        $users = $this->userRepository->findBy([], ['username' => 'ASC']);
        $order = [
            'Sheriff de comté' => 0,
            'Sheriff Adjoint' => 1,
            'Sheriff en chef' => 2,
            'Sheriff' => 3,
            'Sheriff Deputy' => 4,
            'Deputy' => 5,
        ];
        $candidates = [];
        foreach ($users as $u) {
            $grade = $u->getGrade();
            if ($grade === null || $grade === '') {
                continue;
            }
            $candidates[] = $u;
        }
        usort($candidates, static function (User $a, User $b) use ($order): int {
            $ga = $a->getGrade() ?? '';
            $gb = $b->getGrade() ?? '';
            $oa = $order[$ga] ?? 99;
            $ob = $order[$gb] ?? 99;
            if ($oa !== $ob) {
                return $oa <=> $ob;
            }
            $da = $a->getRecruitedAt();
            $db = $b->getRecruitedAt();
            if ($da === null && $db === null) {
                return strcasecmp($a->getUsername(), $b->getUsername());
            }
            if ($da === null) {
                return 1;
            }
            if ($db === null) {
                return -1;
            }
            $cmp = $da <=> $db;
            if ($cmp !== 0) {
                return $cmp;
            }

            return strcasecmp($a->getUsername(), $b->getUsername());
        });

        $sheriffs = [];
        foreach ($candidates as $u) {
            $grade = $u->getGrade();
            if ($grade === null || $grade === '') {
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
        if ($record === null) {
            return null;
        }
        $telegram = $record->getTelegramPrimary();
        return $telegram !== null && $telegram !== '' ? trim($telegram) : null;
    }

    /** @param list<array{username: string, grade: string, badge?: string, telegram?: string}> $sheriffs */
    private function getRecruitmentTelegrams(array $sheriffs): array
    {
        $allowed = ['Sheriff de comté', 'Sheriff Adjoint', 'Sheriff adjoint'];
        $telegrams = [];
        foreach ($sheriffs as $sheriff) {
            $grade = $sheriff['grade'] ?? null;
            $telegram = $sheriff['telegram'] ?? null;
            if (!\is_string($grade) || !\in_array($grade, $allowed, true)) {
                continue;
            }
            if (!\is_string($telegram) || $telegram === '') {
                continue;
            }
            $telegrams[] = $telegram;
        }

        return array_values(array_unique($telegrams));
    }
}
