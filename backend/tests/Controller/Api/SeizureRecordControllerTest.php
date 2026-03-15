<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class SeizureRecordControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/saisies sans token : 401.
     */
    public function testListWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/saisies');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * GET /api/saisies avec un utilisateur sans grade sheriff : 403.
     */
    public function testListWithNonSheriffReturns403(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => null]);

        $this->requestWithJwt($client, 'GET', '/api/saisies', $token);

        self::assertResponseStatusCodeSame(403);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * GET /api/saisies avec JWT et grade sheriff : 200 et structure data.
     */
    public function testListWithSheriffGradeReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt($client, 'GET', '/api/saisies', $token);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('data', $data);
        self::assertIsArray($data['data']);
    }

    /**
     * POST /api/saisies sans token : 401.
     */
    public function testCreateWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('POST', '/api/saisies', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"type":"item","date":"2025-01-15","sheriff":"Test","quantity":1,"itemName":"Objet"}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * POST /api/saisies avec champs requis manquants : 400.
     */
    public function testCreateWithMissingFieldsReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'POST',
            '/api/saisies',
            $token,
            '{"type":"item","date":"2025-01-15","quantity":1}'
        );

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/saisies type item sans itemName : 400.
     */
    public function testCreateItemWithoutItemNameReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'type' => 'item',
            'date' => '2025-01-15',
            'sheriff' => 'Sheriff Test',
            'quantity' => 2,
        ]);
        $this->requestWithJwt($client, 'POST', '/api/saisies', $token, $body);

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/saisies type weapon sans weaponModel : 400.
     */
    public function testCreateWeaponWithoutWeaponModelReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'type' => 'weapon',
            'date' => '2025-01-15',
            'sheriff' => 'Sheriff Test',
            'quantity' => 1,
        ]);
        $this->requestWithJwt($client, 'POST', '/api/saisies', $token, $body);

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/saisies avec body valide (item) : 201.
     */
    public function testCreateItemWithValidBodyReturns201(): void
    {
        $client = self::createClient();
        [$user, $token] = $this->createUserAndJwt($client, ['username' => 'SheriffSaisie', 'grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'type' => 'item',
            'date' => '2025-01-20',
            'sheriff' => $user->getUsername(),
            'quantity' => 3,
            'itemName' => 'Objet de test',
        ]);
        $this->requestWithJwt($client, 'POST', '/api/saisies', $token, $body);

        self::assertResponseStatusCodeSame(201);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('id', $data);
        self::assertSame('item', $data['type']);
        self::assertSame('2025-01-20', $data['date']);
        self::assertSame(3, $data['quantity']);
        self::assertSame('Objet de test', $data['itemName']);
    }
}
