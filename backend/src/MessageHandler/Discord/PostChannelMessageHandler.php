<?php

declare(strict_types=1);

namespace App\MessageHandler\Discord;

use App\Message\Discord\PostChannelMessage;
use App\Service\DiscordChannelNotifier;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class PostChannelMessageHandler
{
    public function __construct(
        private readonly DiscordChannelNotifier $notifier,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function __invoke(PostChannelMessage $message): void
    {
        $err = $this->notifier->sendMessage($message->getChannelId(), $message->getContent());
        if (null !== $err) {
            $this->logger->warning('Discord channel message failed (async handler)', [
                'channelId' => $message->getChannelId(),
                'error' => $err,
            ]);
        }
    }
}
