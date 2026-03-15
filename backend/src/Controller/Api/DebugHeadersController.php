<?php

declare(strict_types=1);

namespace App\Controller\Api;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Debug : indique si le header Authorization est présent (sans afficher le token).
 * GET /api/debug/headers — pas d'auth requise.
 * Désactivé en production.
 */
final class DebugHeadersController
{
    public function __construct(
        private readonly string $appEnv = 'prod',
    ) {
    }

    #[Route('/api/debug/headers', name: 'api_debug_headers', methods: ['GET'])]
    public function __invoke(Request $request): JsonResponse
    {
        if ($this->appEnv === 'prod') {
            return new JsonResponse(null, 404);
        }

        $auth = $request->headers->get('Authorization');
        $hasAuth = $auth !== null && $auth !== '';
        $isBearer = $hasAuth && str_starts_with((string) $auth, 'Bearer ');
        $tokenLength = 0;
        if ($isBearer) {
            $token = trim(substr((string) $auth, 7));
            $tokenLength = strlen($token);
        }
        $xToken = $request->headers->get('X-Bearer-Token');
        $xTokenLength = $xToken !== null && $xToken !== '' ? strlen(trim($xToken)) : 0;

        return new JsonResponse([
            'Authorization_header_present' => $hasAuth,
            'Authorization_is_bearer' => $isBearer,
            'Bearer_token_length' => $tokenLength,
            'X_Bearer_Token_present' => $xTokenLength > 0,
            'X_Bearer_Token_length' => $xTokenLength,
        ]);
    }
}
