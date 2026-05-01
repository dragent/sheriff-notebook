<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Validator\ConstraintViolationListInterface;

/**
 * Single source of truth for the JSON error envelope returned by every /api endpoint.
 *
 * The shape stays intentionally compatible with what the Next.js proxy already consumes
 * (`{ error: string }`), but lets controllers attach optional `hint`, `field`, `fields`
 * (validation), `code` (machine-readable identifier) and `details` keys without each
 * controller reinventing the structure.
 *
 * Used by `ApiExceptionSubscriber` to convert thrown HttpExceptions into JSON, and can
 * be returned directly from controllers when richer context (hint / field / violations)
 * is needed.
 */
final class ApiErrorResponse
{
    private function __construct()
    {
    }

    /**
     * Build a JSON error response with the canonical envelope.
     *
     * @param array{
     *     hint?: string|null,
     *     field?: string|null,
     *     code?: string|null,
     *     fields?: array<string, list<string>>,
     *     details?: array<string, mixed>,
     * } $extras
     */
    public static function create(string $message, int $status, array $extras = []): JsonResponse
    {
        $payload = ['error' => $message];

        if (isset($extras['code']) && null !== $extras['code'] && '' !== $extras['code']) {
            $payload['code'] = $extras['code'];
        }
        if (isset($extras['hint']) && null !== $extras['hint'] && '' !== $extras['hint']) {
            $payload['hint'] = $extras['hint'];
        }
        if (isset($extras['field']) && null !== $extras['field'] && '' !== $extras['field']) {
            $payload['field'] = $extras['field'];
        }
        if (isset($extras['fields']) && [] !== $extras['fields']) {
            $payload['fields'] = $extras['fields'];
        }
        if (isset($extras['details']) && [] !== $extras['details']) {
            $payload['details'] = $extras['details'];
        }

        return new JsonResponse($payload, $status, ['Content-Type' => 'application/json']);
    }

    public static function badRequest(string $message, ?string $field = null, ?string $hint = null): JsonResponse
    {
        return self::create($message, Response::HTTP_BAD_REQUEST, ['field' => $field, 'hint' => $hint]);
    }

    public static function unauthorized(string $message = 'Authentification requise.'): JsonResponse
    {
        return self::create($message, Response::HTTP_UNAUTHORIZED);
    }

    public static function forbidden(string $message = 'Accès refusé.'): JsonResponse
    {
        return self::create($message, Response::HTTP_FORBIDDEN);
    }

    public static function notFound(string $message = 'Ressource introuvable.'): JsonResponse
    {
        return self::create($message, Response::HTTP_NOT_FOUND);
    }

    public static function conflict(string $message, ?string $hint = null): JsonResponse
    {
        return self::create($message, Response::HTTP_CONFLICT, ['hint' => $hint]);
    }

    public static function serviceUnavailable(string $message): JsonResponse
    {
        return self::create($message, Response::HTTP_SERVICE_UNAVAILABLE);
    }

    public static function badGateway(string $message): JsonResponse
    {
        return self::create($message, Response::HTTP_BAD_GATEWAY);
    }

    public static function serverError(string $message = 'Erreur serveur. Vérifiez les logs ou exécutez les migrations.', ?string $hint = null): JsonResponse
    {
        return self::create($message, Response::HTTP_INTERNAL_SERVER_ERROR, ['hint' => $hint]);
    }

    /**
     * Convert a Symfony Validator violation list into a single 400 response with a per-field map.
     */
    public static function fromViolations(ConstraintViolationListInterface $violations, string $message = 'Corps de requête invalide.'): JsonResponse
    {
        $byField = [];
        foreach ($violations as $violation) {
            $field = '' !== $violation->getPropertyPath() ? $violation->getPropertyPath() : '_';
            $byField[$field] = $byField[$field] ?? [];
            $byField[$field][] = (string) $violation->getMessage();
        }

        return self::create($message, Response::HTTP_BAD_REQUEST, ['fields' => $byField]);
    }
}
