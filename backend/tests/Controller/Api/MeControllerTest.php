<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class MeControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/me sans token : 401.
     */
    public function testMeWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/me');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * GET /api/me avec JWT valide : 200 et profil utilisateur.
     */
    public function testMeWithValidJwtReturns200(): void
    {
        $client = self::createClient();
        [$user, $token] = $this->createUserAndJwt($client, [
            'username' => 'SheriffTest',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/me', $token);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('id', $data);
        self::assertSame($user->getDiscordId(), $data['discordId']);
        self::assertSame('SheriffTest', $data['username']);
        self::assertArrayHasKey('grade', $data);
        self::assertArrayHasKey('allowedFormations', $data);
        self::assertArrayHasKey('roles', $data);
    }

    /**
     * GET /api/me avec un grade Sheriff Deputy : allowedFormations est un tableau (structure id/label depuis le référentiel).
     * Le contenu dépend du CountyReference en base ; on vérifie uniquement la structure.
     */
    public function testMeWithSheriffDeputyGradeReturnsLimitedFormations(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'username' => 'DeputyUser',
            'grade' => 'Sheriff Deputy',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/me', $token);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data['allowedFormations']);
        foreach ($data['allowedFormations'] as $formation) {
            self::assertIsArray($formation);
            self::assertArrayHasKey('id', $formation);
            self::assertArrayHasKey('label', $formation);
        }
    }

    /**
     * POST /api/me/join-guild sans token : 401.
     */
    public function testJoinGuildWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('POST', '/api/me/join-guild', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"accessToken":"some-token"}');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/me/join-guild sans corps ou sans accessToken : 400.
     */
    public function testJoinGuildWithoutAccessTokenReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['username' => 'JoinGuildUser']);

        $this->requestWithJwt($client, 'POST', '/api/me/join-guild', $token, '{}');
        self::assertResponseStatusCodeSame(400);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
        self::assertStringContainsString('accessToken', $data['error']);

        $this->requestWithJwt($client, 'POST', '/api/me/join-guild', $token, '{"accessToken":""}');
        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/me/join-guild avec JWT et accessToken : appelle le resolver.
     * En env test (Discord non configuré), le resolver renvoie une erreur → 422.
     */
    public function testJoinGuildWithValidBodyCallsResolver(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['username' => 'JoinGuildUser']);

        $this->requestWithJwt($client, 'POST', '/api/me/join-guild', $token, '{"accessToken":"oauth-token"}');

        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
        // En test, Discord n'est pas configuré → 422 avec message du resolver
        self::assertResponseStatusCodeSame(422);
    }
}
