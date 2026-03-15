<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class RecruitControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/recruits sans token : 401.
     */
    public function testRecruitsWithoutAuthReturns401(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/recruits');

        self::assertResponseStatusCodeSame(401);
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }

    /**
     * GET /api/recruits avec JWT valide (grade Sheriff Adjoint) : 200 et tableau (liste).
     */
    public function testRecruitsWithAuthReturns200(): void
    {
        $client = self::createClient();
        [, $token] = $this->createUserAndJwt($client, [
            'grade' => 'Sheriff Adjoint',
        ]);

        $this->requestWithJwt($client, 'GET', '/api/recruits', $token);

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
    }
}
