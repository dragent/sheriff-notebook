<?php

declare(strict_types=1);

namespace App\Message\Discord;

/**
 * Ask the bot to send a welcome MP after a first sheriff grade is assigned (recruitment).
 */
final class SheriffRecruitmentWelcomeDmMessage
{
    public function __construct(
        private readonly string $discordUserId,
    ) {
    }

    public function getDiscordUserId(): string
    {
        return $this->discordUserId;
    }
}
