<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Resolves guild nickname (or global username) for a Discord user via Bot API; used for JWT auth display name.
 */
final class DiscordGuildMemberResolver
{
    private const API_BASE = 'https://discord.com/api/v10';
    private const CDN_AVATAR_BASE = 'https://cdn.discordapp.com/avatars';
    private const DEFAULT_SHERIFF_PAPIER_ROLE_ID = '1479909556044697700';
    /** @var list<string> */
    private const DEFAULT_HIERARCHY_ROLE_IDS = [
        '1478333880925819014', // Sheriff de comté
        '1478334122404483215', // Sheriff Adjoint
        '1478334176695685213', // Sheriff en chef
        '1478334303619514419', // Sheriff
        '1478334349072928808', // Sheriff Deputy
        '1482747651668574218', // Deputy
    ];
    /** Discord Developer Portal -> Bot -> Privileged Gateway Intents. */
    private const REQUIRED_PRIVILEGED_INTENTS = ['GUILD_MEMBERS'];

    private const TIMEOUT_GET = 5.0;
    private const TIMEOUT_PUT_BODY = 10.0;
    /** Maximum time (ms) we are willing to sleep before retrying after a Discord 429. */
    private const MAX_RATE_LIMIT_RETRY_WAIT_MS = 5000;

    /** Cache TTL for cross-request resolutions (display name, role list). */
    public const DISPLAY_NAME_CACHE_TTL_SECONDS = 600;
    public const GUILD_ROLES_CACHE_TTL_SECONDS = 600;

    /**
     * Per-instance cache for /guilds/{id}/roles. Service is request-scoped under PHP-FPM,
     * so this avoids 2-3 redundant role-list GETs during a single PATCH /api/users/{id}.
     *
     * @var list<array{id: string, name: string}>|null
     */
    private ?array $cachedGuildRoles = null;

    private readonly CacheInterface $cache;
    private readonly LoggerInterface $logger;

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $guildId,
        private readonly string $botToken,
        ?CacheInterface $cache = null,
        ?LoggerInterface $logger = null,
        /** @param list<string> $recruitmentExcludedHierarchyRoleIds Override via services.yaml (empty = use defaults). */
        private readonly array $recruitmentExcludedHierarchyRoleIds = [],
        private readonly ?string $sheriffPapierRoleId = null,
    ) {
        // ArrayAdapter fallback keeps unit tests and bootstrapped environments simple.
        $this->cache = $cache ?? new ArrayAdapter();
        $this->logger = $logger ?? new NullLogger();
    }

    /** @return list<string> */
    private function configuredHierarchyRoleIds(): array
    {
        return [] !== $this->recruitmentExcludedHierarchyRoleIds
            ? $this->recruitmentExcludedHierarchyRoleIds
            : self::DEFAULT_HIERARCHY_ROLE_IDS;
    }

    private function configuredSheriffPapierRoleId(): string
    {
        return (null !== $this->sheriffPapierRoleId && '' !== $this->sheriffPapierRoleId)
            ? $this->sheriffPapierRoleId
            : self::DEFAULT_SHERIFF_PAPIER_ROLE_ID;
    }

    /** @return list<string> */
    public function getRequiredPrivilegedIntents(): array
    {
        return self::REQUIRED_PRIVILEGED_INTENTS;
    }

    /** @return array<string, string> */
    private function getDefaultHeaders(): array
    {
        return [
            'Authorization' => 'Bot '.$this->botToken,
            'Accept' => 'application/json',
        ];
    }

    /** @return list<array{id: string, name: string}> */
    public function listGuildRoles(): array
    {
        if (null !== $this->cachedGuildRoles) {
            return $this->cachedGuildRoles;
        }
        if ('' === $this->guildId || '' === $this->botToken) {
            return $this->cachedGuildRoles = [];
        }

        $cacheKey = 'discord.guild_roles.'.hash('xxh3', $this->guildId);
        $roles = $this->cache->get($cacheKey, function (ItemInterface $item): array {
            $item->expiresAfter(self::GUILD_ROLES_CACHE_TTL_SECONDS);
            $url = self::API_BASE.'/guilds/'.$this->guildId.'/roles';
            $json = $this->fetch($url);
            if (null === $json) {
                // Force the cache to skip storage on transient failures.
                $item->expiresAfter(0);

                return [];
            }
            $data = json_decode($json, true);
            if (!\is_array($data) || isset($data['code'], $data['message'])) {
                $item->expiresAfter(0);

                return [];
            }
            $roles = [];
            foreach ($data as $role) {
                if (\is_array($role) && isset($role['id'], $role['name']) && \is_string($role['id']) && \is_string($role['name'])) {
                    $roles[] = ['id' => $role['id'], 'name' => $role['name']];
                }
            }

            return $roles;
        });

        return $this->cachedGuildRoles = $roles;
    }

    /**
     * Invalidate the cached guild role list (e.g. after a write that mutates roles).
     */
    public function invalidateGuildRolesCache(): void
    {
        $this->cachedGuildRoles = null;
        if ('' !== $this->guildId) {
            $this->cache->delete('discord.guild_roles.'.hash('xxh3', $this->guildId));
        }
    }

    /**
     * Discord role IDs whose names match an in-app sheriff grade (Deputy … Sheriff de comté).
     * Used for recruitment filtering and when clearing sheriff roles from a member.
     *
     * @return list<string>
     */
    public function getSheriffRoleIds(): array
    {
        if ('' === $this->guildId || '' === $this->botToken) {
            return [];
        }

        $gradeNames = User::getSheriffGradeValues();
        $guildRoles = $this->listGuildRoles();
        $ids = [];
        foreach ($guildRoles as $role) {
            $name = trim($role['name']);
            foreach ($gradeNames as $grade) {
                if (0 === strcasecmp($name, $grade)) {
                    $ids[] = $role['id'];
                    break;
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Roles excluded from recruitment list:
     * - sheriff hierarchy roles (Deputy -> Sheriff de comté),
     * - special "Sheriff Papier" role.
     *
     * @return list<string>
     */
    public function getRecruitmentExcludedRoleIds(): array
    {
        $ids = [
            ...$this->configuredHierarchyRoleIds(),
            $this->configuredSheriffPapierRoleId(),
        ];

        if ('' === $this->guildId || '' === $this->botToken) {
            return array_values(array_unique($ids));
        }

        // Keep dynamic matching as fallback safety when role IDs change.
        $ids = [...$ids, ...$this->getSheriffRoleIds()];
        $guildRoles = $this->listGuildRoles();
        foreach ($guildRoles as $role) {
            $name = mb_strtolower(trim($role['name']));
            // Be tolerant to naming variants in Discord (e.g. accents/casing/custom labels).
            if (
                str_contains($name, 'sheriff')
                || str_contains($name, 'shérif')
                || str_contains($name, 'deputy')
                || str_contains($name, 'papier')
            ) {
                $ids[] = $role['id'];
            }
        }

        return array_values(array_unique($ids));
    }

    /** @return list<array{discord_id: string, username: string, avatar_url: ?string, roles: array<string>}> */
    public function listGuildMembers(): array
    {
        if ('' === $this->guildId || '' === $this->botToken) {
            return [];
        }
        $all = [];
        $after = '0';
        while (true) {
            $url = self::API_BASE.'/guilds/'.$this->guildId.'/members?limit=1000&after='.$after;
            $json = $this->fetch($url);
            if (null === $json) {
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
                if (isset($member['nick']) && \is_string($member['nick']) && '' !== trim($member['nick'])) {
                    $username = trim($member['nick']);
                }
                $avatarHash = isset($user['avatar']) && \is_string($user['avatar']) ? $user['avatar'] : null;
                $avatarUrl = $avatarHash
                    ? self::CDN_AVATAR_BASE.'/'.$discordId.'/'.$avatarHash.'.png'
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
        }

        return $all;
    }

    /** @param list<string> $roleIdsToExclude
     * @return list<array{discord_id: string, username: string, avatar_url: ?string, roles: array<string>}>
     */
    public function listGuildMembersWithoutRoles(array $roleIdsToExclude): array
    {
        $members = $this->listGuildMembers();
        if ([] === $roleIdsToExclude) {
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
        if ('' === $discordUserId || '' === $this->guildId || '' === $this->botToken) {
            return null;
        }

        $cacheKey = 'discord.display_name.'.hash('xxh3', $this->guildId.'|'.$discordUserId);
        // Sentinel '' means "Discord answered but no usable name", cached to avoid hammering on misses.
        $cached = $this->cache->get($cacheKey, function (ItemInterface $item) use ($discordUserId): string {
            $item->expiresAfter(self::DISPLAY_NAME_CACHE_TTL_SECONDS);
            $resolved = $this->resolveServerDisplayName($discordUserId);
            if (null === $resolved) {
                // Treat as transient failure: do not poison the cache for 10 minutes.
                $item->expiresAfter(0);

                return '';
            }

            return $resolved;
        });

        return '' !== $cached ? $cached : null;
    }

    /**
     * Force-refresh the cached nickname for a Discord user (e.g. after a known nickname change).
     */
    public function invalidateDisplayNameCache(string $discordUserId): void
    {
        if ('' === $discordUserId || '' === $this->guildId) {
            return;
        }
        $this->cache->delete('discord.display_name.'.hash('xxh3', $this->guildId.'|'.$discordUserId));
    }

    private function resolveServerDisplayName(string $discordUserId): ?string
    {
        $data = $this->fetchMember($discordUserId);

        if (null === $data) {
            return null;
        }

        if (isset($data['code'], $data['message'])) {
            $this->logger->warning('Discord display-name resolution failed', [
                'discordUserId' => $discordUserId,
                'code' => (int) $data['code'],
                'message' => (string) $data['message'],
            ]);

            return null;
        }

        $nick = isset($data['nick']) && \is_string($data['nick']) ? trim($data['nick']) : null;
        if (null !== $nick && '' !== $nick) {
            return $nick;
        }

        $user = $data['user'] ?? null;
        if (\is_array($user) && isset($user['username']) && \is_string($user['username'])) {
            $global = trim($user['username']);
            if ('' !== $global) {
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
        if ('' === $this->guildId || '' === $this->botToken) {
            $this->logger->warning('Discord configuration missing (guild id or bot token)');

            return null;
        }
        $url = self::API_BASE.'/guilds/'.$this->guildId.'/members/'.$discordUserId;
        $json = $this->fetch($url);
        if (null === $json) {
            return null;
        }
        $data = json_decode($json, true);
        if (!\is_array($data) || isset($data['code'], $data['message'])) {
            if (\is_array($data) && isset($data['message'])) {
                $this->logger->warning('Discord member fetch returned API error', [
                    'discordUserId' => $discordUserId,
                    'message' => (string) ($data['message'] ?? ''),
                    'code' => isset($data['code']) ? (int) $data['code'] : null,
                ]);
            }

            return null;
        }

        return $data;
    }

    public function pingGuild(): array
    {
        if ('' === $this->guildId || '' === $this->botToken) {
            return [
                'ok' => false,
                'guildName' => null,
                'error' => 'DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN non définis dans .env',
            ];
        }

        $url = self::API_BASE.'/guilds/'.$this->guildId;
        $json = $this->fetch($url);

        if (null === $json) {
            return [
                'ok' => false,
                'guildName' => null,
                'error' => 'Impossible de joindre l\'API Discord (réseau ou timeout).',
            ];
        }

        $data = json_decode($json, true);
        if (!\is_array($data)) {
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
                'error' => $msg.' (code '.$code.'). '.$hint,
            ];
        }

        $name = isset($data['name']) && \is_string($data['name']) ? $data['name'] : null;

        return [
            'ok' => true,
            'guildName' => $name,
            'error' => null,
        ];
    }

    /**
     * Adds user to guild using OAuth access token.
     * - New user (no grade in app): only joins the guild, no automatic role assignment.
     * - Existing user (already has grade in DB): assigns Discord role only if the member was not yet on the server.
     */
    public function addMemberToGuildWithSheriffDeputyRole(string $discordUserId, string $accessToken, ?string $gradeInDb = null): ?string
    {
        if ('' === $this->guildId || '' === $this->botToken || '' === $discordUserId || '' === $accessToken) {
            return 'Configuration Discord incomplète ou token utilisateur manquant.';
        }

        $isNewUser = null === $gradeInDb || '' === $gradeInDb;
        $url = self::API_BASE.'/guilds/'.$this->guildId.'/members/'.$discordUserId;

        // Join guild only; role management is explicit and handled elsewhere.
        $body = json_encode([
            'access_token' => $accessToken,
        ], \JSON_THROW_ON_ERROR);

        $result = $this->sendPutWithBody($url, $body);
        if (null !== $result['error']) {
            return $result['error'];
        }

        $status = $result['status'];
        if (201 === $status || 200 === $status) {
            // Member has just been created/added.
            if (!$isNewUser) {
                $effectiveGrade = $gradeInDb ?? '';
                if ('' !== $effectiveGrade) {
                    return $this->addSheriffRoleToMember($discordUserId, $effectiveGrade);
                }
            }

            return null;
        }
        if (204 === $status) {
            // Member was already on the server.
            // Do not touch roles when member is already in guild.
            return null;
        }

        return 'Erreur API Discord (status '.$status.') lors de l\'ajout au serveur.';
    }

    /** @return array{status: int, error: string|null} */
    private function sendPutWithBody(string $url, string $jsonBody): array
    {
        $options = [
            'headers' => $this->getDefaultHeaders() + ['Content-Type' => 'application/json'],
            'body' => $jsonBody,
            'timeout' => self::TIMEOUT_PUT_BODY,
        ];
        try {
            $response = $this->httpClient->request('PUT', $url, $options);
            $status = $response->getStatusCode();
            if (429 === $status && $this->sleepForRetryAfter($response, 'PUT', $url)) {
                $response = $this->httpClient->request('PUT', $url, $options);
                $status = $response->getStatusCode();
            }
            if ($status >= 200 && $status < 300) {
                return ['status' => $status, 'error' => null];
            }
            $content = $response->getContent(false);
            $message = 'Erreur API Discord';
            $data = json_decode($content, true);
            if (\is_array($data) && isset($data['message']) && \is_string($data['message'])) {
                $message = $data['message'];
            }
            $this->logger->warning('Discord PUT failed', [
                'url' => $url,
                'status' => $status,
                'message' => $message,
            ]);

            return ['status' => $status, 'error' => $message.' (status '.$status.')'];
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord PUT transport error', [
                'url' => $url,
                'exception' => $e->getMessage(),
            ]);

            return ['status' => 0, 'error' => 'Impossible de joindre l\'API Discord (réseau ou timeout).'];
        }
    }

    /**
     * Sends a Discord write request with a JSON body (PATCH/POST/PUT) and one transparent retry
     * on HTTP 429, honouring Discord's `retry_after` (seconds, possibly fractional) capped at
     * MAX_RATE_LIMIT_RETRY_WAIT_MS to keep the user-facing PATCH responsive.
     */
    private function sendJsonWriteRequest(string $method, string $url, string $jsonBody): ?string
    {
        $method = strtoupper($method);
        if ('' === $this->guildId || '' === $this->botToken) {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $options = [
            'headers' => $this->getDefaultHeaders() + ['Content-Type' => 'application/json'],
            'body' => $jsonBody,
            'timeout' => self::TIMEOUT_PUT_BODY,
        ];

        try {
            $response = $this->httpClient->request($method, $url, $options);
            $status = $response->getStatusCode();
            if (429 === $status && $this->sleepForRetryAfter($response, $method, $url)) {
                $response = $this->httpClient->request($method, $url, $options);
                $status = $response->getStatusCode();
            }
            if ($status >= 200 && $status < 300) {
                return null;
            }
            $content = $response->getContent(false);
            $this->logger->warning('Discord write request failed', [
                'method' => $method,
                'url' => $url,
                'status' => $status,
                'body_preview' => substr($content, 0, 200),
            ]);
            $data = json_decode($content, true);
            $message = \is_array($data) && isset($data['message']) && \is_string($data['message'])
                ? $data['message']
                : 'Erreur API Discord';

            return 'Erreur API Discord lors de la mise à jour du rôle : '.$message.' (status '.$status.')';
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord write transport error', [
                'method' => $method,
                'url' => $url,
                'exception' => $e->getMessage(),
            ]);

            return 'Impossible de joindre l\'API Discord (aucune réponse HTTP).';
        }
    }

    /**
     * Reads Retry-After (header in seconds, or `retry_after` in the JSON body, possibly fractional)
     * and sleeps accordingly when the wait is below MAX_RATE_LIMIT_RETRY_WAIT_MS.
     * Returns true when a retry should be attempted.
     */
    private function sleepForRetryAfter(\Symfony\Contracts\HttpClient\ResponseInterface $response, string $method, string $url): bool
    {
        $waitMs = 0;
        try {
            $headers = $response->getHeaders(false);
            if (isset($headers['retry-after'][0])) {
                $waitMs = (int) round(((float) $headers['retry-after'][0]) * 1000);
            }
            if ($waitMs <= 0) {
                $body = $response->getContent(false);
                $data = json_decode($body, true);
                if (\is_array($data) && isset($data['retry_after']) && is_numeric($data['retry_after'])) {
                    $waitMs = (int) round(((float) $data['retry_after']) * 1000);
                }
            }
        } catch (\Throwable) {
            return false;
        }

        if ($waitMs <= 0 || $waitMs > self::MAX_RATE_LIMIT_RETRY_WAIT_MS) {
            $this->logger->warning('Discord 429 received but retry skipped', [
                'method' => $method,
                'url' => $url,
                'retry_after_ms' => $waitMs,
                'max_wait_ms' => self::MAX_RATE_LIMIT_RETRY_WAIT_MS,
            ]);

            return false;
        }
        $this->logger->info('Discord 429: sleeping before retry', [
            'method' => $method,
            'url' => $url,
            'retry_after_ms' => $waitMs,
        ]);
        usleep($waitMs * 1000);

        return true;
    }

    /**
     * Assigns a sheriff Discord role to member: exact grade name first, else first role whose name contains "sheriff".
     */
    public function addSheriffRoleToMember(string $discordUserId, ?string $grade): ?string
    {
        if ('' === $this->guildId || '' === $this->botToken || '' === $discordUserId) {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $roles = $this->listGuildRoles();
        if ([] === $roles) {
            $this->logger->warning('No Discord guild role retrieved (check DISCORD_GUILD_ID/BOT_TOKEN/perms)');

            return 'Aucun rôle Discord récupéré sur le serveur (vérifie DISCORD_GUILD_ID, DISCORD_BOT_TOKEN et les permissions du bot).';
        }

        $targetRoleId = null;
        if (null !== $grade && '' !== $grade) {
            foreach ($roles as $role) {
                if (0 === strcasecmp($role['name'], $grade)) {
                    $targetRoleId = $role['id'];
                    break;
                }
            }
        }

        if (null === $targetRoleId) {
            foreach ($roles as $role) {
                if (false !== stripos($role['name'], 'sheriff')) {
                    $targetRoleId = $role['id'];
                    break;
                }
            }
        }

        if (null === $targetRoleId) {
            $this->logger->warning('No matching sheriff Discord role for grade', ['grade' => (string) $grade]);

            return 'Aucun rôle Discord sheriff compatible trouvé pour le grade "'.(string) $grade.'".';
        }

        $url = self::API_BASE.'/guilds/'.$this->guildId.'/members/'.$discordUserId.'/roles/'.$targetRoleId;

        return $this->sendWriteRequest('PUT', $url);
    }

    /**
     * Atomically aligns the member's sheriff role with the given grade using Discord's
     * "Modify Guild Member" endpoint (PATCH /guilds/{guild.id}/members/{user.id}) with the
     * full roles array. One write call replaces the previous "DELETE x N + PUT x 1" sequence,
     * removing 7+ Discord API calls per promotion and the resulting 429 rate limits.
     *
     * Behaviour:
     * - removes every sheriff hierarchy role the member currently holds,
     * - adds the role matching $grade (case-insensitive name match), if provided,
     * - preserves all other roles,
     * - is a no-op (returns null without HTTP call) if the resulting role set is unchanged.
     */
    public function setSheriffRoleForMember(string $discordUserId, ?string $grade): ?string
    {
        if ('' === $this->guildId || '' === $this->botToken || '' === $discordUserId) {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $member = $this->fetchMember($discordUserId);
        if (null === $member) {
            return 'Membre Discord introuvable ou bot sans accès au serveur.';
        }

        $currentRoles = [];
        if (\is_array($member['roles'] ?? null)) {
            foreach ($member['roles'] as $roleId) {
                $rid = (string) $roleId;
                if ('' !== $rid) {
                    $currentRoles[] = $rid;
                }
            }
        }

        $sheriffRoleIds = $this->getSheriffRoleIds();

        $targetRoleId = null;
        if (null !== $grade && '' !== $grade) {
            foreach ($this->listGuildRoles() as $role) {
                if (0 === strcasecmp($role['name'], $grade)) {
                    $targetRoleId = $role['id'];
                    break;
                }
            }
            if (null === $targetRoleId) {
                $this->logger->warning('No matching sheriff Discord role for grade', ['grade' => $grade]);

                return 'Aucun rôle Discord sheriff compatible trouvé pour le grade "'.$grade.'".';
            }
        }

        $sheriffSet = array_flip($sheriffRoleIds);
        $newRoles = [];
        foreach ($currentRoles as $rid) {
            if (!isset($sheriffSet[$rid])) {
                $newRoles[] = $rid;
            }
        }
        if (null !== $targetRoleId) {
            $newRoles[] = $targetRoleId;
        }
        $newRoles = array_values(array_unique($newRoles));

        $sortedCurrent = $currentRoles;
        sort($sortedCurrent);
        $sortedNew = $newRoles;
        sort($sortedNew);
        if ($sortedCurrent === $sortedNew) {
            return null;
        }

        $url = self::API_BASE.'/guilds/'.$this->guildId.'/members/'.$discordUserId;
        try {
            $body = json_encode(['roles' => $newRoles], \JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return 'Impossible de sérialiser la requête Discord : '.$e->getMessage();
        }

        return $this->sendJsonWriteRequest('PATCH', $url, $body);
    }

    public function clearSheriffRolesForMember(string $discordUserId): ?string
    {
        if ('' === $this->guildId || '' === $this->botToken || '' === $discordUserId) {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $sheriffRoleIds = $this->getSheriffRoleIds();
        if ([] === $sheriffRoleIds) {
            return null;
        }

        $lastError = null;
        foreach ($sheriffRoleIds as $roleId) {
            $url = self::API_BASE.'/guilds/'.$this->guildId.'/members/'.$discordUserId.'/roles/'.$roleId;
            $err = $this->sendWriteRequest('DELETE', $url);
            if (null !== $err) {
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
            $status = $response->getStatusCode();
            if (200 !== $status) {
                $this->logger->warning('Discord GET returned non-200', [
                    'url' => $url,
                    'status' => $status,
                    'body_preview' => substr($content, 0, 200),
                ]);
            }

            return $content;
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord GET transport error', [
                'url' => $url,
                'exception' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function sendWriteRequest(string $method, string $url): ?string
    {
        $method = strtoupper($method);
        if ('' === $method || '' === $this->guildId || '' === $this->botToken) {
            return 'Configuration Discord incomplète (DISCORD_GUILD_ID ou DISCORD_BOT_TOKEN manquants).';
        }

        $options = [
            'headers' => $this->getDefaultHeaders(),
            'timeout' => self::TIMEOUT_GET,
        ];
        try {
            $response = $this->httpClient->request($method, $url, $options);
            $status = $response->getStatusCode();
            if (429 === $status && $this->sleepForRetryAfter($response, $method, $url)) {
                $response = $this->httpClient->request($method, $url, $options);
                $status = $response->getStatusCode();
            }
            if ($status >= 200 && $status < 300) {
                return null;
            }
            $content = $response->getContent(false);
            $this->logger->warning('Discord HTTP write failed', [
                'method' => $method,
                'url' => $url,
                'status' => $status,
                'body_preview' => substr($content, 0, 200),
            ]);
            $data = json_decode($content, true);
            $message = \is_array($data) && isset($data['message']) && \is_string($data['message'])
                ? $data['message']
                : 'Erreur API Discord';

            return 'Erreur API Discord lors de la mise à jour du rôle : '.$message.' (status '.$status.')';
        } catch (TransportExceptionInterface $e) {
            $this->logger->error('Discord HTTP write transport error', [
                'method' => $method,
                'url' => $url,
                'exception' => $e->getMessage(),
            ]);

            return 'Impossible de joindre l\'API Discord (aucune réponse HTTP).';
        }
    }
}
