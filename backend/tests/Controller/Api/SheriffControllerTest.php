<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\ApiTestHelperTrait;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class SheriffControllerTest extends WebTestCase
{
    use ApiTestHelperTrait;

    /**
     * GET /api/sheriffs est public : 200 et tableau JSON.
     */
    public function testSheriffsListReturns200WithoutAuth(): void
    {
        $client = self::createClient();
        $client->request('GET', '/api/sheriffs');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('Content-Type', 'application/json');
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
    }

    /**
     * GET /api/sheriffs ne retourne que les utilisateurs ayant un grade (shérifs).
     */
    public function testSheriffsListReturnsOnlyUsersWithGrade(): void
    {
        $client = self::createClient();
        [$userWithGrade] = $this->createUserAndJwt($client, [
            'username' => 'SheriffListed',
            'grade' => 'Sheriff Deputy',
        ]);
        $this->createUserAndJwt($client, [
            'username' => 'UserWithoutGrade',
            'grade' => null,
        ]);

        $client->request('GET', '/api/sheriffs');

        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        self::assertIsArray($data);
        $usernames = array_column($data, 'username');
        self::assertContains('SheriffListed', $usernames);
        self::assertNotContains('UserWithoutGrade', $usernames);

        $sheriff = $data[array_search('SheriffListed', $usernames)];
        self::assertArrayHasKey('id', $sheriff);
        self::assertArrayHasKey('username', $sheriff);
        self::assertArrayHasKey('avatarUrl', $sheriff);
        self::assertArrayHasKey('grade', $sheriff);
        self::assertArrayHasKey('recruitedAt', $sheriff);
        self::assertSame('Sheriff Deputy', $sheriff['grade']);
    }
}
