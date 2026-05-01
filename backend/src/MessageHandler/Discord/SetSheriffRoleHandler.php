<?php

declare(strict_types=1);

namespace App\MessageHandler\Discord;

use App\Message\Discord\SetSheriffRoleMessage;
use App\Service\DiscordGuildMemberResolver;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class SetSheriffRoleHandler
{
    public function __construct(
        private readonly DiscordGuildMemberResolver $resolver,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function __invoke(SetSheriffRoleMessage $message): void
    {
        try {
            $err = $this->resolver->setSheriffRoleForMember(
                $message->getDiscordUserId(),
                $message->getNewGradeLabel(),
            );
            if (null !== $err) {
                $this->logger->warning('Discord sheriff role sync failed', [
                    'discordUserId' => $message->getDiscordUserId(),
                    'newGradeLabel' => $message->getNewGradeLabel(),
                    'error' => $err,
                ]);
            }
            $this->resolver->invalidateDisplayNameCache($message->getDiscordUserId());
        } catch (\Throwable $e) {
            $this->logger->error('Discord sheriff role handler exception', [
                'discordUserId' => $message->getDiscordUserId(),
                'exception' => $e->getMessage(),
            ]);
        }
    }
}
