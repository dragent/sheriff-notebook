<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

/**
 * Ensures /api routes always return JSON: 401/403 from auth, 500 for any other exception (no HTML leak).
 * Supports RFC 7807 (application/problem+json) when the client sends Accept: application/problem+json.
 */
final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            // Late priority: let Security firewall handle entry-point routing first; we only catch
            // exceptions that escape Security (notably AccessDeniedHttpException from #[IsGranted]).
            KernelEvents::EXCEPTION => ['onKernelException', -64],
            KernelEvents::RESPONSE => ['onKernelResponse', -256],
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $throwable = $event->getThrowable();

        if ($throwable instanceof AuthenticationException) {
            $message = $throwable->getMessage();
            if ('' === $message) {
                $message = 'Authentication required.';
            }
            $event->setResponse($this->createApiErrorResponse(
                $request,
                $message,
                Response::HTTP_UNAUTHORIZED,
            ));

            return;
        }

        // Both flavours of access-denied: Security (firewall) and HttpKernel (IsGranted attribute).
        if ($throwable instanceof AccessDeniedException || $throwable instanceof AccessDeniedHttpException) {
            $message = $throwable->getMessage();
            if ('' === $message || 'Access Denied.' === $message) {
                $message = 'Accès refusé.';
            }
            $event->setResponse($this->createApiErrorResponse(
                $request,
                $message,
                Response::HTTP_FORBIDDEN,
            ));

            return;
        }

        // Preserve any other HttpException (e.g. 400 from MapRequestPayload, 404, 422, ...).
        if ($throwable instanceof HttpExceptionInterface) {
            $message = $throwable->getMessage();
            if ('' === $message) {
                $message = self::defaultMessageForStatus($throwable->getStatusCode());
            }
            $event->setResponse($this->createApiErrorResponse(
                $request,
                $message,
                $throwable->getStatusCode(),
            ));

            return;
        }

        $event->setResponse($this->createApiErrorResponse(
            $request,
            'Erreur serveur. Vérifiez les logs ou exécutez les migrations.',
            Response::HTTP_INTERNAL_SERVER_ERROR,
        ));
    }

    /**
     * Fallback: any 4xx/5xx response on /api with a non-JSON body (typically the HTML page produced
     * by HttpKernel ErrorListener after IsGranted, MapRequestPayload, or any uncaught HttpException)
     * is rewrapped as JSON so the Next.js proxy can read it.
     */
    public function onKernelResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $response = $event->getResponse();
        $status = $response->getStatusCode();
        if ($status < 400) {
            return;
        }

        $contentType = $response->headers->get('Content-Type', '');
        if (str_contains($contentType, 'application/json')) {
            return;
        }

        $event->setResponse($this->createApiErrorResponse(
            $request,
            self::defaultMessageForStatus($status),
            $status,
        ));
    }

    private function wantsProblemJson(Request $request): bool
    {
        foreach ($request->getAcceptableContentTypes() as $type) {
            if (str_contains($type, 'application/problem+json')) {
                return true;
            }
        }

        return false;
    }

    private function createApiErrorResponse(Request $request, string $message, int $status): JsonResponse
    {
        if ($this->wantsProblemJson($request)) {
            return new JsonResponse([
                'type' => 'about:blank',
                'title' => self::defaultMessageForStatus($status),
                'status' => $status,
                'detail' => $message,
            ], $status, [
                'Content-Type' => 'application/problem+json',
            ]);
        }

        return new JsonResponse(
            ['error' => $message],
            $status,
            ['Content-Type' => 'application/json'],
        );
    }

    private static function defaultMessageForStatus(int $status): string
    {
        return match ($status) {
            Response::HTTP_BAD_REQUEST => 'Requête invalide.',
            Response::HTTP_UNAUTHORIZED => 'Authentication required.',
            Response::HTTP_FORBIDDEN => 'Accès refusé.',
            Response::HTTP_NOT_FOUND => 'Ressource introuvable.',
            Response::HTTP_UNPROCESSABLE_ENTITY => 'Données invalides.',
            default => 'Erreur serveur.',
        };
    }
}
