<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class BureauInventoryControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/coffres sans token : 401.
     */
    public function testListWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/coffres');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * GET /api/coffres avec un grade non autorisé (Sheriff Deputy) : 403.
     */
    public function testListWithNonAllowedGradeReturns403(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'grade' => 'Sheriff Deputy',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/coffres', $token);

        self::assertResponseStatusCodeSame(403);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * GET /api/coffres avec JWT et grade Sheriff Adjoint : 200 et structure inventaire / accessoiresBureau.
     */
    public function testListWithAllowedGradeReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'grade' => 'Sheriff Adjoint',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/coffres', $token);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('inventaire', $data);
        self::assertArrayHasKey('accessoiresBureau', $data);
        self::assertIsArray($data['inventaire']);
        self::assertIsArray($data['accessoiresBureau']);
    }

    /**
     * PATCH /api/coffres sans token : 401.
     */
    public function testPatchWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('PATCH', '/api/coffres', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"section":"inventaire","type":"Munition de revolver","quantity":10}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * PATCH /api/coffres avec body invalide (section manquante) : 400.
     */
    public function testPatchWithInvalidBodyReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/coffres',
            $token,
            '{"type":"Munition de revolver","quantity":10}'
        );

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/coffres avec type inconnu pour la section : 400.
     */
    public function testPatchWithUnknownTypeReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/coffres',
            $token,
            '{"section":"inventaire","type":"TypeInconnu","quantity":5}'
        );

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/coffres avec JWT et body valide : 200.
     */
    public function testPatchWithValidBodyReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'section' => 'inventaire',
            'type' => 'Munition de revolver',
            'quantity' => 25,
        ]);
        $this->requestWithJwt($client, 'PATCH', '/api/coffres', $token, $body);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('type', $data);
        self::assertSame('Munition de revolver', $data['type']);
        self::assertArrayHasKey('quantite', $data);
        self::assertSame(25, $data['quantite']);
    }
}
