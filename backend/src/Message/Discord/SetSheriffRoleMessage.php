<?php

declare(strict_types=1);

namespace App\Message\Discord;

/**
 * Sync Discord guild roles to match the in-app sheriff grade (or clear all sheriff roles).
 */
final class SetSheriffRoleMessage
{
    public function __construct(
        private readonly string $discordUserId,
        private readonly ?string $newGradeLabel,
    ) {
    }

    public function getDiscordUserId(): string
    {
        return $this->discordUserId;
    }

    public function getNewGradeLabel(): ?string
    {
        return $this->newGradeLabel;
    }
}
