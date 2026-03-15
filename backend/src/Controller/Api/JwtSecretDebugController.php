<?php

declare(strict_types=1);

namespace App\Controller\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Diagnostic BACKEND_JWT_SECRET (longueur + aperçu masqué).
 * À utiliser en dev uniquement — désactiver en prod.
 */
final class JwtSecretDebugController
{
    public function __construct(
        private readonly string $jwtSecret = '',
        private readonly string $appEnv = 'prod',
    ) {
    }

    #[Route('/api/debug/jwt-secret', name: 'api_debug_jwt_secret', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        if ($this->appEnv === 'prod') {
            return new JsonResponse(null, 404);
        }

        $length = strlen($this->jwtSecret);
        $masked = $length >= 4
            ? substr($this->jwtSecret, 0, 2) . '…' . substr($this->jwtSecret, -2)
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
