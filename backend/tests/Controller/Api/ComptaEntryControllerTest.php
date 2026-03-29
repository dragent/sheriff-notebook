<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ComptaEntryControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/comptabilite sans token : 401.
     */
    public function testListWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/comptabilite');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * GET /api/comptabilite avec un grade non autorisé (Sheriff Deputy) : 403.
     */
    public function testListWithDeputyGradeReturns403(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'grade' => 'Sheriff Deputy',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/comptabilite', $token);

        self::assertResponseStatusCodeSame(403);
    }

    /**
     * GET /api/comptabilite avec JWT et grade Sheriff Adjoint : 200 et structure entrees/sorties.
     */
    public function testListWithAllowedGradeReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'grade' => 'Sheriff Adjoint',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/comptabilite', $token);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('entrees', $data);
        self::assertArrayHasKey('sorties', $data);
        self::assertIsArray($data['entrees']);
        self::assertIsArray($data['sorties']);
    }

    /**
     * POST /api/comptabilite sans token : 401.
     */
    public function testCreateWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('POST', '/api/comptabilite', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"type":"entree","dateIso":"2025-01-15","sheriff":"Test","raison":"Test","somme":10}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * POST /api/comptabilite avec body invalide (type manquant) : 400.
     */
    public function testCreateWithInvalidBodyReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'POST',
            '/api/comptabilite',
            $token,
            '{"dateIso":"2025-01-15","sheriff":"Test","raison":"Test","somme":10}'
        );

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/comptabilite avec JWT et body valide : 201 et écriture créée.
     */
    public function testCreateWithValidBodyReturns201(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'type' => 'entree',
            'dateIso' => '2025-01-15',
            'sheriff' => 'Sheriff Test',
            'raison' => 'Test création',
            'somme' => 42.50,
        ]);
        $this->requestWithJwt($client, 'POST', '/api/comptabilite', $token, $body);

        self::assertResponseStatusCodeSame(201);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('id', $data);
        self::assertSame('entree', $data['type']);
        self::assertSame('2025-01-15', $data['dateIso']);
        self::assertSame('Sheriff Test', $data['sheriff']);
        self::assertSame('Test création', $data['raison']);
        self::assertSame(42.5, $data['somme']);
    }

    /**
     * POST sortie après une entrée : solde calculé en SQL (amount VARCHAR) — doit répondre 201, pas 500.
     */
    public function testCreateSortieAfterEntreeReturns201(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'POST',
            '/api/comptabilite',
            $token,
            json_encode([
                'type' => 'entree',
                'dateIso' => '2025-01-10',
                'sheriff' => 'Sheriff Test',
                'raison' => 'Caisse',
                'somme' => 500,
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(201);

        $this->requestWithJwt(
            $client,
            'POST',
            '/api/comptabilite',
            $token,
            json_encode([
                'type' => 'sortie',
                'dateIso' => '2025-01-11',
                'sheriff' => 'Sheriff Test',
                'raison' => 'Achat fournitures',
                'somme' => 160,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertSame('sortie', $data['type']);
        self::assertSame(160.0, $data['somme']);
    }
}
