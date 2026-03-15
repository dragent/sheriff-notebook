<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;

trait ApiTestHelperTrait
{
    /**
     * Crée un utilisateur en base et retourne un JWT valide pour l'authentification.
     *
     * @param array{discordId?: string, username?: string, grade?: string|null} $overrides
     */
    protected function createUserAndJwt(KernelBrowser $client, array $overrides = []): array
    {
        $discordId = $overrides['discordId'] ?? ('test-discord-' . uniqid());
        $username = $overrides['username'] ?? 'TestUser';
        $grade = $overrides['grade'] ?? null;

        $container = $client->getContainer();
        /** @var EntityManagerInterface $em */
        $em = $container->get(EntityManagerInterface::class);
        $user = new User($discordId, $username);
        if ($grade !== null) {
            $user->setGrade($grade);
        }
        $em->persist($user);
        $em->flush();

        $secret = getenv('BACKEND_JWT_SECRET') ?: '';
        $now = time();
        $payload = [
            'sub' => $discordId,
            'username' => $username,
            'avatarUrl' => null,
            'iat' => $now,
            'exp' => $now + 3600,
        ];
        $token = JWT::encode($payload, $secret, 'HS256');

        return [$user, $token];
    }

    protected function requestWithJwt(KernelBrowser $client, string $method, string $uri, string $token, ?string $body = null): void
    {
        $client->request($method, $uri, [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer ' . $token,
            'CONTENT_TYPE' => 'application/json',
        ], $body ?? '');
    }
}
