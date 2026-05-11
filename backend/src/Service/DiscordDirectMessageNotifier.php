<?php

declare(strict_types=1);

namespace App\Service;

use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/** Sends a private message to a Discord user via the Bot API (create DM + post message). */
final class DiscordDirectMessageNotifier
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

    public function sendMessageToUser(string $recipientDiscordUserId, string $content): ?string
    {
        if ('' === $this->botToken || '' === $recipientDiscordUserId) {
            return 'Configuration Discord incomplète (DISCORD_BOT_TOKEN ou destinataire manquant).';
        }

        $dmChannelId = $this->createDmChannelId($recipientDiscordUserId);
        if (null === $dmChannelId) {
            return 'Impossible d\'ouvrir un canal MP avec ce membre Discord.';
        }

        $url = self::API_BASE.'/channels/'.$dmChannelId.'/messages';

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

            $this->logger->warning('Discord DM POST failed', [
                'recipientDiscordUserId' => $recipientDiscordUserId,
                'status' => $status,
                'message' => $message,
            ]);

            return $message.' (status '.$status.')';
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord DM POST transport error', [
                'recipientDiscordUserId' => $recipientDiscordUserId,
                'exception' => $e->getMessage(),
            ]);

            return 'Impossible de joindre l\'API Discord (réseau ou timeout).';
        }
    }

    private function createDmChannelId(string $recipientDiscordUserId): ?string
    {
        $url = self::API_BASE.'/users/@me/channels';

        try {
            $response = $this->httpClient->request('POST', $url, [
                'headers' => [
                    'Authorization' => 'Bot '.$this->botToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'json' => ['recipient_id' => $recipientDiscordUserId],
                'timeout' => self::TIMEOUT_SECONDS,
            ]);
            $status = $response->getStatusCode();
            $body = $response->getContent(false);
            if ($status >= 200 && $status < 300) {
                $data = json_decode($body, true);
                if (\is_array($data) && isset($data['id']) && \is_string($data['id']) && '' !== $data['id']) {
                    return $data['id'];
                }

                return null;
            }

            $data = json_decode($body, true);
            $message = \is_array($data) && isset($data['message']) && \is_string($data['message'])
                ? $data['message']
                : 'Erreur API Discord';

            $this->logger->warning('Discord create DM channel failed', [
                'recipientDiscordUserId' => $recipientDiscordUserId,
                'status' => $status,
                'message' => $message,
            ]);

            return null;
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord create DM transport error', [
                'recipientDiscordUserId' => $recipientDiscordUserId,
                'exception' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
