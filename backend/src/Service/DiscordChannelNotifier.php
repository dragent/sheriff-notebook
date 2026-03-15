<?php

declare(strict_types=1);

namespace App\Service;

/** Sends messages to a Discord channel via the Bot API. */
final class DiscordChannelNotifier
{
    private const API_BASE = 'https://discord.com/api/v10';

    public function __construct(
        private readonly string $botToken,
        private readonly string $appEnv = 'prod',
    ) {
    }

    public function sendMessage(string $channelId, string $content): ?string
    {
        if ($this->botToken === '' || $channelId === '') {
            return 'Configuration Discord incomplète (DISCORD_BOT_TOKEN ou channel ID manquant).';
        }

        $url = self::API_BASE . '/channels/' . $channelId . '/messages';
        $body = json_encode(['content' => $content], \JSON_THROW_ON_ERROR);

        $opts = [
            'http' => [
                'method' => 'POST',
                'header' => "Authorization: Bot {$this->botToken}\r\nContent-Type: application/json\r\nAccept: application/json\r\n",
                'content' => $body,
                'ignore_errors' => true,
                'timeout' => 10.0,
            ],
        ];
        $ctx = stream_context_create($opts);
        $result = @file_get_contents($url, false, $ctx);
        $statusLine = $http_response_header[0] ?? null;
        $status = 0;
        if ($statusLine !== null && preg_match('/ (\d{3}) /', $statusLine, $m)) {
            $status = (int) $m[1];
        }

        if ($status >= 200 && $status < 300) {
            return null;
        }

        $message = 'Erreur API Discord';
        if (\is_string($result)) {
            $data = json_decode($result, true);
            if (\is_array($data) && isset($data['message']) && \is_string($data['message'])) {
                $message = $data['message'];
            }
        }
        if ($this->appEnv === 'dev' && $statusLine !== null) {
            error_log('[DiscordChannelNotifier] POST ' . $url . ' → ' . $statusLine . ' — ' . $message);
        }

        return $message . ' (status ' . $status . ')';
    }
}
