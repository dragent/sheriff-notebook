<?php

declare(strict_types=1);

namespace App\Controller\Api;

use Symfony\Component\DependencyInjection\Attribute\When;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Debug : indique si le header Authorization est présent (sans afficher le token).
 * GET /api/debug/headers — pas d'auth requise.
 * #[When('dev')] keeps the controller (and thus the route) out of prod/staging.
 */
#[When('dev')]
final class DebugHeadersController
{
    public function __construct(
        private readonly string $appEnv = 'prod',
    ) {
    }

    #[Route(
        '/api/debug/headers',
        name: 'api_debug_headers',
        methods: ['GET'],
        condition: "env('APP_ENV') === 'dev'",
    )]
    public function __invoke(Request $request): JsonResponse
    {
        if ('prod' === $this->appEnv) {
            return new JsonResponse(null, 404);
        }

        $auth = $request->headers->get('Authorization');
        $hasAuth = null !== $auth && '' !== $auth;
        $isBearer = $hasAuth && str_starts_with((string) $auth, 'Bearer ');
        $tokenLength = 0;
        if ($isBearer) {
            $token = trim(substr((string) $auth, 7));
            $tokenLength = \strlen($token);
        }
        $xToken = $request->headers->get('X-Bearer-Token');
        $xTokenLength = null !== $xToken && '' !== $xToken ? \strlen(trim($xToken)) : 0;

        return new JsonResponse([
            'Authorization_header_present' => $hasAuth,
            'Authorization_is_bearer' => $isBearer,
            'Bearer_token_length' => $tokenLength,
            'X_Bearer_Token_present' => $xTokenLength > 0,
            'X_Bearer_Token_length' => $xTokenLength,
        ]);
    }
}
