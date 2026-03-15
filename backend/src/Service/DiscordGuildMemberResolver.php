<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

/**
 * Resolves guild nickname (or global username) for a Discord user via Bot API; used for JWT auth display name.
 */
final class DiscordGuildMemberResolver
{
    private const API_BASE = 'https://discord.com/api/v10';
    private const CDN_AVATAR_BASE = 'https://cdn.discordapp.com/avatars';

    private const TIMEOUT_GET = 5.0;
    private const TIMEOUT_PUT_BODY = 10.0;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $guildId,
        private readonly string $botToken,
        private readonly string $appEnv = 'prod',
    ) {
    }

    /** @return array<string, string> */
    private function getDefaultHeaders(): array
    {
        return [
            'Authorization' => 'Bot ' . $this->botToken,
            'Accept' => 'application/json',
        ];
    }

    /** @return list<array{id: string, name: string}> */
    public function listGuildRoles(): array
    {
        if ($this->guildId === '' || $this->botToken === '') {
            return [];
        }
        $url = self::API_BASE . '/guilds/' . $this->guildId . '/roles';
        $json = $this->fetch($url);
        if ($json === null) {
            return [];
        }
        $data = json_decode($json, true);
        if (!\is_array($data)) {
            return [];
        }
        if (isset($data['code'], $data['message'])) {
            return [];
        }
        $roles = [];
        foreach ($data as $role) {
            if (\is_array($role) && isset($role['id'], $role['name']) && \is_string($role['id']) && \is_string($role['name'])) {
                $roles[] = ['id' => $role['id'], 'name' => $role['name']];
            }
        }
        return $roles;
    }

    /** @return list<string> */
    public function getSheriffRoleIds(): array
    {
        $roles = $this->listGuildRoles();
        $ids = [];
        foreach ($roles as $role) {
            if (stripos($role['name'], 'sheriff') !== false) {
                $ids[] = $role['id'];
            }
        }
        return $ids;
    }

    /** @return list<array{discord_id: string, username: string, avatar_url: ?string, roles: array<string>}> */
    public function listGuildMembers(): array
    {
        if ($this->guildId === '' || $this->botToken === '') {
            return [];
        }
        $all = [];
        $after = '0';
        do {
            $url = self::API_BASE . '/guilds/' . $this->guildId . '/members?limit=1000&after=' . $after;
            $json = $this->fetch($url);
            if ($json === null) {
                break;
            }
            $data = json_decode($json, true);
            if (!\is_array($data) || isset($data['code'], $data['message'])) {
                break;
            }
            $lastId = $after;
            foreach ($data as $member) {
                if (!\is_array($member) || !isset($member['user']['id'])) {
                    continue;
                }
                $user = $member['user'];
                $discordId = (string) $user['id'];
                $username = isset($user['username']) && \is_string($user['username']) ? $user['username'] : $discordId;
                if (isset($member['nick']) && \is_string($member['nick']) && trim($member['nick']) !== '') {
                    $username = trim($member['nick']);
                }
                $avatarHash = isset($user['avatar']) && \is_string($user['avatar']) ? $user['avatar'] : null;
                $avatarUrl = $avatarHash
                    ? self::CDN_AVATAR_BASE . '/' . $discordId . '/' . $avatarHash . '.png'
                    : null;
                $roles = \is_array($member['roles'] ?? null) ? array_map('strval', $member['roles']) : [];
                $all[] = [
                    'discord_id' => $discordId,
                    'username' => $username,
                    'avatar_url' => $avatarUrl,
                    'roles' => $roles,
                ];
                $lastId = $discordId;
            }
            $after = $lastId;
            if (\count($data) < 1000) {
                break;
            }
        } while (true);

        return $all;
    }

    /** @param list<string> $roleIdsToExclude
     * @return list<array{discord_id: string, username: string, avatar_url: ?string, roles: array<string>}>
     */
    public function listGuildMembersWithoutRoles(array $roleIdsToExclude): array
    {
        $members = $this->listGuildMembers();
        if ($roleIdsToExclude === []) {
            return $members;
        }
        $excludeSet = array_flip($roleIdsToExclude);
        return array_values(array_filter($members, static function (array $m) use ($excludeSet): bool {
            foreach ($m['roles'] as $roleId) {
                if (isset($excludeSet[$roleId])) {
                    return false;
                }
            }
            return true;
        }));
    }

    public function getServerDisplayName(string $discordUserId): ?string
    {
        $data = $this->fetchMember($discordUserId);

        if ($data === null) {
            return null;
        }

        if (isset($data['code'], $data['message'])) {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] API Discord: ' . (string) $data['message'] . ' (code ' . (int) $data['code'] . '). Vérifie que le bot est dans le serveur et que l\'intent Server Members est activé.');
            }
            return null;
        }

        $nick = isset($data['nick']) && \is_string($data['nick']) ? trim($data['nick']) : null;
        if ($nick !== null && $nick !== '') {
            return $nick;
        }

        $user = $data['user'] ?? null;
        if (\is_array($user) && isset($user['username']) && \is_string($user['username'])) {
            $global = trim($user['username']);
            if ($global !== '') {
                return $global;
            }
        }

        return null;
    }

    /** @return array{user: array{id: string, username: string, avatar?: string}, nick?: string}|null */
    public function getMember(string $discordUserId): ?array
    {
        return $this->fetchMember($discordUserId);
    }

    private function fetchMember(string $discordUserId): ?array
    {
        if ($this->guildId === '' || $this->botToken === '') {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN non définis.');
            }
            return null;
        }
        $url = self::API_BASE . '/guilds/' . $this->guildId . '/members/' . $discordUserId;
        $json = $this->fetch($url);
        if ($json === null) {
            return null;
        }
        $data = json_decode($json, true);
        if (!\is_array($data) || isset($data['code'], $data['message'])) {
            if ($this->appEnv === 'dev' && isset($data['message'])) {
                error_log('[DiscordGuildMemberResolver] API Discord: ' . (string) ($data['message'] ?? ''));
            }
            return null;
        }
        return $data;
    }

    public function pingGuild(): array
    {
        if ($this->guildId === '' || $this->botToken === '') {
            return [
                'ok' => false,
                'guildName' => null,
                'error' => 'DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN non définis dans .env',
            ];
        }

        $url = self::API_BASE . '/guilds/' . $this->guildId;
        $json = $this->fetch($url);

        if ($json === null) {
            return [
                'ok' => false,
                'guildName' => null,
                'error' => 'Impossible de joindre l\'API Discord (réseau ou timeout).',
            ];
        }

        $data = json_decode($json, true);
        if (!is_array($data)) {
            return [
                'ok' => false,
                'guildName' => null,
                'error' => 'Réponse Discord invalide.',
            ];
        }

        if (isset($data['code'], $data['message'])) {
            $msg = (string) $data['message'];
            $code = (int) $data['code'];
            $hint = match ($code) {
                404 => 'Le bot n\'est pas dans ce serveur, ou le GUILD_ID est incorrect.',
                403 => 'Accès refusé. Active l\'intent « Server Members » dans le portail Discord (Bot → Privileged Gateway Intents).',
                default => 'Vérifie que le bot est invité sur le serveur et que l\'intent Server Members est activé.',
            };
            return [
                'ok' => false,
                'guildName' => null,
                'error' => $msg . ' (code ' . $code . '). ' . $hint,
            ];
        }

        $name = isset($data['name']) && is_string($data['name']) ? $data['name'] : null;
        return [
            'ok' => true,
            'guildName' => $name,
            'error' => null,
        ];
    }

    /**
     * Adds user to guild using OAuth access token.
     * - New user (no grade in app): assigns Deputy role; caller should persist it in DB.
     * - Existing user (already has grade in DB): only assigns Discord role if the member was not yet on the server.
     */
    public function addMemberToGuildWithSheriffDeputyRole(string $discordUserId, string $accessToken, ?string $gradeInDb = null): ?string
    {
        if ($this->guildId === '' || $this->botToken === '' || $discordUserId === '' || $accessToken === '') {
            return 'Configuration Discord incomplète ou token utilisateur manquant.';
        }

        $isNewUser = $gradeInDb === null || $gradeInDb === '';
        $url = self::API_BASE . '/guilds/' . $this->guildId . '/members/' . $discordUserId;

        if ($isNewUser) {
            // First app login: create member with Deputy role directly.
            $roleId = $this->getRoleIdForGrade('Deputy');
            if ($roleId === null) {
                return 'Aucun rôle Deputy trouvé sur le serveur Discord.';
            }
            $body = json_encode([
                'access_token' => $accessToken,
                'roles' => [$roleId],
            ], \JSON_THROW_ON_ERROR);
        } else {
            // Existing user in DB: just ensure they are in the guild; roles handled only if they were not yet present.
            $body = json_encode([
                'access_token' => $accessToken,
            ], \JSON_THROW_ON_ERROR);
        }

        $result = $this->sendPutWithBody($url, $body);
        if ($result['error'] !== null) {
            return $result['error'];
        }

        $status = $result['status'];
        if ($status === 201 || $status === 200) {
            // Member has just been created/added.
            if (!$isNewUser) {
                $effectiveGrade = $gradeInDb ?? '';
                if ($effectiveGrade !== '') {
                    return $this->addSheriffRoleToMember($discordUserId, $effectiveGrade);
                }
            }
            return null;
        }
        if ($status === 204) {
            // Member was already on the server.
            if ($isNewUser) {
                // First app login but member already in guild (invited manually, etc.): ensure Deputy role.
                return $this->addSheriffRoleToMember($discordUserId, 'Deputy');
            }
            // Existing user and already on the server: do not touch roles.
            return null;
        }

        return 'Erreur API Discord (status ' . $status . ') lors de l\'ajout au serveur.';
    }

    /**
     * Returns the Discord role ID for the given grade name (exact match first, else first role containing "sheriff").
     */
    private function getRoleIdForGrade(string $grade): ?string
    {
        $roles = $this->listGuildRoles();
        foreach ($roles as $role) {
            if (strcasecmp($role['name'], $grade) === 0) {
                return $role['id'];
            }
        }
        foreach ($roles as $role) {
            if (stripos($role['name'], 'sheriff') !== false) {
                return $role['id'];
            }
        }
        return null;
    }

    /** @return array{status: int, error: string|null} */
    private function sendPutWithBody(string $url, string $jsonBody): array
    {
        try {
            $response = $this->httpClient->request('PUT', $url, [
                'headers' => $this->getDefaultHeaders() + ['Content-Type' => 'application/json'],
                'body' => $jsonBody,
                'timeout' => self::TIMEOUT_PUT_BODY,
            ]);
            $status = $response->getStatusCode();
            if ($status >= 200 && $status < 300) {
                return ['status' => $status, 'error' => null];
            }
            $content = $response->getContent(false);
            $message = 'Erreur API Discord';
            $data = json_decode($content, true);
            if (\is_array($data) && isset($data['message']) && \is_string($data['message'])) {
                $message = $data['message'];
            }
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] PUT ' . $url . ' → ' . $status . ' — ' . $message);
            }
            return ['status' => $status, 'error' => $message . ' (status ' . $status . ')'];
        } catch (TransportExceptionInterface $e) {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] PUT ' . $url . ' — ' . $e->getMessage());
            }
            return ['status' => 0, 'error' => 'Impossible de joindre l\'API Discord (réseau ou timeout).'];
        }
    }

    /**
     * Assigns a sheriff Discord role to member: exact grade name first, else first role whose name contains "sheriff".
     */
    public function addSheriffRoleToMember(string $discordUserId, ?string $grade): ?string
    {
        if ($this->guildId === '' || $this->botToken === '' || $discordUserId === '') {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $roles = $this->listGuildRoles();
        if ($roles === []) {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] Aucun rôle Discord récupéré sur le serveur (listGuildRoles() vide). Vérifie DISCORD_GUILD_ID, DISCORD_BOT_TOKEN et les permissions du bot.');
            }
            return 'Aucun rôle Discord récupéré sur le serveur (vérifie DISCORD_GUILD_ID, DISCORD_BOT_TOKEN et les permissions du bot).';
        }

        $targetRoleId = null;
        if ($grade !== null && $grade !== '') {
            foreach ($roles as $role) {
                if (strcasecmp($role['name'], $grade) === 0) {
                    $targetRoleId = $role['id'];
                    break;
                }
            }
        }

        if ($targetRoleId === null) {
            foreach ($roles as $role) {
                if (stripos($role['name'], 'sheriff') !== false) {
                    $targetRoleId = $role['id'];
                    break;
                }
            }
        }

        if ($targetRoleId === null) {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] Aucun rôle sheriff compatible trouvé pour le grade "' . (string) $grade . '".');
            }
            return 'Aucun rôle Discord sheriff compatible trouvé pour le grade "' . (string) $grade . '".';
        }

        $url = self::API_BASE . '/guilds/' . $this->guildId . '/members/' . $discordUserId . '/roles/' . $targetRoleId;
        return $this->sendWriteRequest('PUT', $url);
    }

    public function clearSheriffRolesForMember(string $discordUserId): ?string
    {
        if ($this->guildId === '' || $this->botToken === '' || $discordUserId === '') {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $sheriffRoleIds = $this->getSheriffRoleIds();
        if ($sheriffRoleIds === []) {
            return null;
        }

        $lastError = null;
        foreach ($sheriffRoleIds as $roleId) {
            $url = self::API_BASE . '/guilds/' . $this->guildId . '/members/' . $discordUserId . '/roles/' . $roleId;
            $err = $this->sendWriteRequest('DELETE', $url);
            if ($err !== null) {
                $lastError = $err;
            }
        }

        return $lastError;
    }

    private function fetch(string $url): ?string
    {
        try {
            $response = $this->httpClient->request('GET', $url, [
                'headers' => $this->getDefaultHeaders(),
                'timeout' => self::TIMEOUT_GET,
            ]);
            $content = $response->getContent(false);
            if ($this->appEnv === 'dev' && $response->getStatusCode() !== 200) {
                error_log('[DiscordGuildMemberResolver] HTTP: ' . $response->getStatusCode() . ' — body: ' . substr($content, 0, 200));
            }
            return $content;
        } catch (TransportExceptionInterface $e) {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] ' . $e->getMessage());
            }
            return null;
        }
    }

    private function sendWriteRequest(string $method, string $url): ?string
    {
        $method = strtoupper($method);
        if ($method === '' || $this->guildId === '' || $this->botToken === '') {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        try {
            $response = $this->httpClient->request($method, $url, [
                'headers' => $this->getDefaultHeaders(),
                'timeout' => self::TIMEOUT_GET,
            ]);
            $status = $response->getStatusCode();
            if ($status >= 200 && $status < 300) {
                return null;
            }
            $content = $response->getContent(false);
            if ($this->appEnv === 'dev') {
                error_log(sprintf(
                    '[DiscordGuildMemberResolver] HTTP write %s %s → %d — body: %s',
                    $method,
                    $url,
                    $status,
                    substr($content, 0, 200)
                ));
            }
            $data = json_decode($content, true);
            $message = \is_array($data) && isset($data['message']) && \is_string($data['message'])
                ? $data['message']
                : 'Erreur API Discord';
            return 'Erreur API Discord lors de la mise à jour du rôle : ' . $message . ' (status ' . $status . ')';
        } catch (TransportExceptionInterface $e) {
            if ($this->appEnv === 'dev') {
                error_log('[DiscordGuildMemberResolver] ' . $method . ' ' . $url . ' — ' . $e->getMessage());
            }
            return 'Impossible de joindre l\'API Discord (aucune réponse HTTP).';
        }
    }
}
