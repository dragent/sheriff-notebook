<?php

declare(strict_types=1);

namespace App\Service;

use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/** Sends messages to a Discord channel via the Bot API. */
final class DiscordChannelNotifier
{
    private const API_BASE = 'https://discord.com/api/v10';
    private const TIMEOUT_SECONDS = 10.0;

    private readonly LoggerInterface $logger;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $botToken,
        ?LoggerInterface $logger = null,
    ) {
        $this->logger = $logger ?? new NullLogger();
    }

    public function sendMessage(string $channelId, string $content): ?string
    {
        if ('' === $this->botToken || '' === $channelId) {
            return 'Configuration Discord incomplète (DISCORD_BOT_TOKEN ou channel ID manquant).';
        }

        $url = self::API_BASE.'/channels/'.$channelId.'/messages';

        try {
            $response = $this->httpClient->request('POST', $url, [
                'headers' => [
                    'Authorization' => 'Bot '.$this->botToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'json' => ['content' => $content],
                'timeout' => self::TIMEOUT_SECONDS,
            ]);
            $status = $response->getStatusCode();
            if ($status >= 200 && $status < 300) {
                return null;
            }

            $body = $response->getContent(false);
            $data = json_decode($body, true);
            $message = \is_array($data) && isset($data['message']) && \is_string($data['message'])
                ? $data['message']
                : 'Erreur API Discord';

            $this->logger->warning('Discord channel POST failed', [
                'channelId' => $channelId,
                'status' => $status,
                'message' => $message,
            ]);

            return $message.' (status '.$status.')';
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord channel POST transport error', [
                'channelId' => $channelId,
                'exception' => $e->getMessage(),
            ]);

            return 'Impossible de joindre l\'API Discord (réseau ou timeout).';
        }
    }
}
