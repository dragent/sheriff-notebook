<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class CountyReferenceControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/reference sans auth : 401.
     */
    public function testGetReferenceWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/reference');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * GET /api/reference avec un user sans grade autorisé : 200, lecture seule.
     */
    public function testGetReferenceWithForbiddenGradeReturns200AndCannotEdit(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => null]);

        $this->requestWithJwt($client, 'GET', '/api/reference', $token);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertArrayHasKey('data', $data);
        self::assertArrayHasKey('updatedAt', $data);
        self::assertArrayHasKey('canEdit', $data);
        self::assertFalse($data['canEdit']);
    }

    /**
     * GET /api/reference avec Sheriff de comté : 200 et données.
     */
    public function testGetReferenceWithAllowedGradeReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff de comté']);

        $this->requestWithJwt($client, 'GET', '/api/reference', $token);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertArrayHasKey('data', $data);
        self::assertArrayHasKey('updatedAt', $data);
        self::assertArrayHasKey('canEdit', $data);
        self::assertTrue($data['canEdit']);
    }

    /**
     * PUT /api/reference sans auth : 401.
     */
    public function testPutReferenceWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('PUT', '/api/reference', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"fusil":["Test"]}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * PUT /api/reference avec JSON valide et grade autorisé : 200.
     */
    public function testPutReferenceWithValidBodyReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode(['fusil' => ['Springfield', 'Bolt'], 'carabine' => ['Henry']]);
        $this->requestWithJwt($client, 'PUT', '/api/reference', $token, $body);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertArrayHasKey('data', $data);
        self::assertSame([
            ['name' => 'Springfield', 'destructionValue' => ''],
            ['name' => 'Bolt', 'destructionValue' => ''],
        ], $data['data']['fusil'] ?? null);
    }
}
