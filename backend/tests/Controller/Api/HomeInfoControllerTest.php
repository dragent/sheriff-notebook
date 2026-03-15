<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class HomeInfoControllerTest extends WebTestCase
{
    /**
     * GET /api/home-info est public : 200 et structure avec homeInfoCategories.
     */
    public function testHomeInfoReturns200AndStructure(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/home-info');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        self::assertArrayHasKey('homeInfoCategories', $data);
        self::assertIsArray($data['homeInfoCategories']);
    }
}
