<?php

declare(strict_types=1);

namespace App\Message\Discord;

/**
 * Async-friendly instruction to post a Discord channel message via the bot API.
 */
final class PostChannelMessage
{
    public function __construct(
        private readonly string $channelId,
        private readonly string $content,
    ) {
    }

    public function getChannelId(): string
    {
        return $this->channelId;
    }

    public function getContent(): string
    {
        return $this->content;
    }
}
