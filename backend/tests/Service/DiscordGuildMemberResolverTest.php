<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\DiscordGuildMemberResolver;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class DiscordGuildMemberResolverTest extends TestCase
{
    private const GUILD_ID = '1478333253633966132';
    private const BOT_TOKEN = 'test-token';

    public function testReturnsNullWhenConfigurationIsMissing(): void
    {
        $resolver = new DiscordGuildMemberResolver(
            new MockHttpClient([], 'https://discord.com'),
            guildId: '',
            botToken: '',
        );

        self::assertNull($resolver->getServerDisplayName('123'));
        self::assertSame([], $resolver->listGuildRoles());
        self::assertSame([], $resolver->getSheriffRoleIds());
    }

    public function testGetServerDisplayNameUsesNickWhenAvailable(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode([
                'nick' => 'Sheriff McLane',
                'user' => ['id' => '123', 'username' => 'mclane'],
            ])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        self::assertSame('Sheriff McLane', $resolver->getServerDisplayName('123'));
        self::assertSame(1, $client->getRequestsCount());
    }

    public function testGetServerDisplayNameFallsBackToGlobalUsername(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode([
                'user' => ['id' => '123', 'username' => 'mclane'],
            ])),
        ], 'https://discord.com');

        self::assertSame('mclane', $this->makeResolver($client)->getServerDisplayName('123'));
    }

    public function testGetServerDisplayNameIsCachedAcrossCalls(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode([
                'nick' => 'Cached Name',
                'user' => ['id' => '123', 'username' => 'mclane'],
            ])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        self::assertSame('Cached Name', $resolver->getServerDisplayName('123'));
        self::assertSame('Cached Name', $resolver->getServerDisplayName('123'));
        self::assertSame(1, $client->getRequestsCount(), 'Second call must hit the cache, not Discord.');
    }

    public function testInvalidateDisplayNameCacheForcesRefresh(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode(['nick' => 'First'])),
            new MockResponse((string) json_encode(['nick' => 'Second'])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        self::assertSame('First', $resolver->getServerDisplayName('123'));
        $resolver->invalidateDisplayNameCache('123');
        self::assertSame('Second', $resolver->getServerDisplayName('123'));
    }

    public function testGetServerDisplayNameDoesNotCacheTransientErrors(): void
    {
        // First a transient 500, then a real success: cache must NOT poison the first failure.
        $client = new MockHttpClient([
            new MockResponse('Server Error', ['http_code' => 500]),
            new MockResponse((string) json_encode(['nick' => 'Recovered'])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        self::assertNull($resolver->getServerDisplayName('123'));
        self::assertSame('Recovered', $resolver->getServerDisplayName('123'));
    }

    public function testListGuildRolesParsesRoles(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode([
                ['id' => '1', 'name' => 'Sheriff'],
                ['id' => '2', 'name' => 'Deputy'],
                ['id' => '3'], // missing name → ignored
            ])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        self::assertSame([
            ['id' => '1', 'name' => 'Sheriff'],
            ['id' => '2', 'name' => 'Deputy'],
        ], $resolver->listGuildRoles());
    }

    public function testGetSheriffRoleIdsMatchesByCanonicalGradeName(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode([
                ['id' => '10', 'name' => 'Sheriff de comté'],
                ['id' => '11', 'name' => 'Deputy'],
                ['id' => '12', 'name' => 'Maréchal'], // not a grade → not selected
            ])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        $ids = $resolver->getSheriffRoleIds();
        sort($ids);
        self::assertSame(['10', '11'], $ids);
    }

    public function testSetSheriffRoleIsNoOpWhenRolesAlreadyMatch(): void
    {
        $client = new MockHttpClient([
            // fetchMember
            new MockResponse((string) json_encode([
                'user' => ['id' => '999', 'username' => 'foo'],
                'roles' => ['100', '42'],
            ])),
            // listGuildRoles (sheriff role IDs lookup)
            new MockResponse((string) json_encode([
                ['id' => '42', 'name' => 'Sheriff'],
            ])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        // Member already has role "42" matching grade "Sheriff" → no PATCH expected.
        self::assertNull($resolver->setSheriffRoleForMember('999', 'Sheriff'));
        self::assertSame(2, $client->getRequestsCount(), 'Only the GETs should fire (no PATCH).');
    }

    public function testSetSheriffRolePatchesWhenGradeChanges(): void
    {
        $client = new MockHttpClient([
            // fetchMember: currently holds "Deputy" id 11
            new MockResponse((string) json_encode([
                'user' => ['id' => '999', 'username' => 'foo'],
                'roles' => ['11', '500'],
            ])),
            // listGuildRoles
            new MockResponse((string) json_encode([
                ['id' => '10', 'name' => 'Sheriff'],
                ['id' => '11', 'name' => 'Deputy'],
            ])),
            // PATCH /guilds/{id}/members/{userId}
            new MockResponse('', ['http_code' => 204]),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        self::assertNull($resolver->setSheriffRoleForMember('999', 'Sheriff'));
        self::assertSame(3, $client->getRequestsCount());
    }

    public function testSetSheriffRoleReportsMissingRoleByName(): void
    {
        $client = new MockHttpClient([
            new MockResponse((string) json_encode([
                'user' => ['id' => '1', 'username' => 'foo'],
                'roles' => [],
            ])),
            new MockResponse((string) json_encode([
                ['id' => '10', 'name' => 'Sheriff'],
            ])),
        ], 'https://discord.com');

        $resolver = $this->makeResolver($client);
        $error = $resolver->setSheriffRoleForMember('1', 'Maréchal');
        self::assertNotNull($error);
        self::assertStringContainsString('Maréchal', $error);
    }

    public function testGetRecruitmentExcludedRoleIdsIncludesHardcodedHierarchy(): void
    {
        $client = new MockHttpClient([], 'https://discord.com');
        $resolver = $this->makeResolver($client);
        $ids = $resolver->getRecruitmentExcludedRoleIds();

        // Hardcoded hierarchy (Deputy … Sheriff de comté + Sheriff Papier role) is always present.
        self::assertContains('1478333880925819014', $ids); // Sheriff de comté
        self::assertContains('1479909556044697700', $ids); // Sheriff Papier
    }

    private function makeResolver(MockHttpClient $client): DiscordGuildMemberResolver
    {
        return new DiscordGuildMemberResolver(
            $client,
            guildId: self::GUILD_ID,
            botToken: self::BOT_TOKEN,
            cache: new ArrayAdapter(),
        );
    }
}
