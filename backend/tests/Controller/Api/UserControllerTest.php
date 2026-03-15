<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class UserControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/users sans token : 401.
     */
    public function testListWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/users');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * GET /api/users avec JWT et grade Sheriff Adjoint : 200 et tableau d'utilisateurs.
     */
    public function testListWithSheriffAdjointReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'username' => 'AdjointList',
            'grade' => 'Sheriff Adjoint',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/users', $token);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
    }

    /**
     * PATCH /api/users/{id} sans token : 401.
     */
    public function testPatchWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        [$user,] = $this->createUserAndJwt($client, ['username' => 'PatchTarget']);
        $id = $user->getId()->toRfc4122();

        $client->request('PATCH', '/api/users/' . $id, [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], '{"grade":"Sheriff Deputy"}');

        self::assertResponseStatusCodeSame(401);
    }

    /**
     * PATCH /api/users/{id} avec body invalide (grade inconnu) : 400.
     */
    public function testPatchWithInvalidGradeReturns400(): void
    {
        $client = self::createClient();
        [$user, $token] = $this->createUserAndJwt($client, [
            'username' => 'TargetUser',
            'grade' => 'Sheriff Adjoint',
        ]);
        $id = $user->getId()->toRfc4122();

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/users/' . $id,
            $token,
            '{"grade":"GradeInvalide"}'
        );

        self::assertResponseStatusCodeSame(400);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/users/{id} avec UUID inexistant : 404.
     */
    public function testPatchWithUnknownUuidReturns404(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, ['grade' => 'Sheriff Adjoint']);

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/users/00000000-0000-0000-0000-000000000099',
            $token,
            '{"grade":"Sheriff Deputy"}'
        );

        self::assertResponseStatusCodeSame(404);
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('error', $data);
    }

    /**
     * PATCH /api/users/{id} avec grade valide (mise à jour du grade) : 200.
     */
    public function testPatchWithValidGradeReturns200(): void
    {
        $client = self::createClient();
        [$user, $token] = $this->createUserAndJwt($client, [
            'username' => 'UserToPromote',
            'grade' => 'Sheriff Adjoint',
        ]);
        $id = $user->getId()->toRfc4122();

        $this->requestWithJwt(
            $client,
            'PATCH',
            '/api/users/' . $id,
            $token,
            '{"grade":"Sheriff Deputy"}'
        );

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('id', $data);
        self::assertArrayHasKey('username', $data);
        self::assertArrayHasKey('grade', $data);
        self::assertSame('Sheriff Deputy', $data['grade']);
    }
}
