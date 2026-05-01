<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ServiceRecordControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/services sans auth : 401.
     */
    public function testListWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/services');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * GET /api/services avec JWT valide : 200 et liste (éventuellement vide).
     */
    public function testListWithAuthReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client);

        $this->requestWithJwt($client, 'GET', '/api/services', $token);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
    }

    /**
     * GET /api/services/me avec JWT valide : 200 et fiche de service (créée si besoin).
     */
    public function testMeWithAuthReturns200(): void
    {
        $client = self::createClient();
        [$user, $token] = $this->createUserAndJwt($client, ['username' => 'ServiceUser']);

        $this->requestWithJwt($client, 'GET', '/api/services/me', $token);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('id', $data);
        self::assertArrayHasKey('name', $data);
        self::assertSame($user->getUsername(), $data['name']);
        self::assertArrayHasKey('monDay', $data);
        self::assertArrayHasKey('primaryWeapon', $data);
        self::assertArrayHasKey('version', $data);
        self::assertIsInt($data['version']);
    }
}
