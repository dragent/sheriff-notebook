<?php

declare(strict_types=1);

namespace App\Controller\Api;

use Symfony\Component\DependencyInjection\Attribute\When;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Diagnostic BACKEND_JWT_SECRET (longueur + aperçu masqué).
 *
 * #[When('dev')] keeps this controller out of the service container in prod/staging; the
 * appEnv runtime check is kept as belt-and-braces protection.
 */
#[When('dev')]
final class JwtSecretDebugController
{
    public function __construct(
        private readonly string $jwtSecret = '',
        private readonly string $appEnv = 'prod',
    ) {
    }

    #[Route(
        '/api/debug/jwt-secret',
        name: 'api_debug_jwt_secret',
        methods: ['GET'],
        condition: "env('APP_ENV') === 'dev'",
    )]
    public function __invoke(): JsonResponse
    {
        if ('prod' === $this->appEnv) {
            return new JsonResponse(null, 404);
        }

        $length = \strlen($this->jwtSecret);
        $masked = $length >= 4
            ? substr($this->jwtSecret, 0, 2).'…'.substr($this->jwtSecret, -2)
            : ($length > 0 ? '***' : '(vide)');

        return new JsonResponse([
            'BACKEND_JWT_SECRET' => [
                'length' => $length,
                'masked' => $masked,
                'ok' => $length >= 32,
            ],
            '_env' => $this->appEnv,
        ]);
    }
}
