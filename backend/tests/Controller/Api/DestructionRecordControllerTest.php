<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\DestructionRecord;
use App\Tests\ApiTestHelperTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class DestructionRecordControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/destructions sans token : 401.
     */
    public function testListWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/destructions');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * GET /api/destructions avec un utilisateur sans grade sheriff : 403.
     */
    public function testListWithNonSheriffReturns403(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => null]);

        $this->requestWithJwt($client, 'GET', '/api/destructions', $token);

        self::assertResponseStatusCodeSame(403);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * GET /api/destructions avec JWT et grade sheriff : 200 et structure data.
     */
    public function testListWithSheriffGradeReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt($client, 'GET', '/api/destructions', $token);

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('data', $data);
        self::assertIsArray($data['data']);
    }

    /**
     * POST /api/destructions sans token : 401.
     */
    public function testCreateWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('POST', '/api/destructions', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"lines":[]}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * POST /api/destructions avec body invalide (ligne sans type destruction) : 400.
     */
    public function testCreateWithMissingDestructionTypeReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'lines' => [
                [
                    'date' => (new \DateTimeImmutable('today'))->format('Y-m-d'),
                    'qte' => 1,
                    'sommes' => '',
                    'destruction' => '',
                ],
            ],
        ]);
        $this->requestWithJwt($client, 'POST', '/api/destructions', $token, $body);

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * POST /api/destructions avec quantité invalide (qte < 1) : 400.
     */
    public function testCreateWithInvalidQuantityReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $body = json_encode([
            'lines' => [
                [
                    'date' => (new \DateTimeImmutable('today'))->format('Y-m-d'),
                    'qte' => 0,
                    'sommes' => '',
                    'destruction' => 'SomeItem',
                ],
            ],
        ]);
        $this->requestWithJwt($client, 'POST', '/api/destructions', $token, $body);

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/destructions/{id} sans token : 401.
     */
    public function testValidateWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('PATCH', '/api/destructions/00000000-0000-0000-0000-000000000001', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"status":"reussie"}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * PATCH /api/destructions/{id} avec id invalide : 400.
     */
    public function testValidateWithInvalidIdReturns400(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/destructions/not-a-uuid',
            $token,
            '{"status":"reussie"}'
        );

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/destructions/{id} avec enregistrement inexistant : 404.
     * Utiliser un UUID v4 valide pour éviter 400 "Identifiant invalide" (Symfony Uid rejette les UUID version 0).
     */
    public function testValidateWithUnknownIdReturns404(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/destructions/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            $token,
            '{"status":"reussie"}'
        );

        self::assertResponseStatusCodeSame(404);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/destructions/{id} avec status invalide : 400.
     */
    public function testValidateWithInvalidStatusReturns400(): void
    {
        $client = self::createClient();
        $container = $client->getContainer();
        /** @var EntityManagerInterface $em */
        $em = $container->get(EntityManagerInterface::class);

        $record = new DestructionRecord(
            [['date' => (new \DateTimeImmutable('today'))->format('Y-m-d'), 'qte' => 1, 'sommes' => '', 'destruction' => 'ItemX']],
            'TestUser'
        );
        $em->persist($record);
        $em->flush();
        $id = $record->getId()->toRfc4122();

        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);
        $this->requestWithJwt($client, 'PATCH', '/api/destructions/' . $id, $token, '{"status":"invalid"}');

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/destructions/{id} avec status valide : 200.
     */
    public function testValidateWithValidStatusReturns200(): void
    {
        $client = self::createClient();
        $container = $client->getContainer();
        /** @var EntityManagerInterface $em */
        $em = $container->get(EntityManagerInterface::class);

        $record = new DestructionRecord(
            [['date' => (new \DateTimeImmutable('today'))->format('Y-m-d'), 'qte' => 1, 'sommes' => '', 'destruction' => 'ItemY']],
            'TestUser'
        );
        $em->persist($record);
        $em->flush();
        $id = $record->getId()->toRfc4122();

        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);
        $this->requestWithJwt($client, 'PATCH', '/api/destructions/' . $id, $token, '{"status":"perdue"}');

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('id', $data);
        self::assertArrayHasKey('status', $data);
        self::assertSame('perdue', $data['status']);
    }
}
