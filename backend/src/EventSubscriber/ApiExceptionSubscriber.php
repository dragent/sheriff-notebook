<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

/**
 * Ensures /api routes always return JSON: 401/403 from auth, 500 for any other exception (no HTML leak).
 */
final class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => ['onKernelException', -200],
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
            if ($message === '') {
                $message = 'Authentication required.';
            }
            $event->setResponse(new JsonResponse(
                ['error' => $message],
                Response::HTTP_UNAUTHORIZED,
                ['Content-Type' => 'application/json'],
            ));
            return;
        }

        if ($throwable instanceof AccessDeniedException) {
            $event->setResponse(new JsonResponse(
                ['error' => 'Accès refusé.'],
                Response::HTTP_FORBIDDEN,
                ['Content-Type' => 'application/json'],
            ));
            return;
        }

        $event->setResponse(new JsonResponse(
            ['error' => 'Erreur serveur. Vérifiez les logs ou exécutez les migrations.'],
            Response::HTTP_INTERNAL_SERVER_ERROR,
            ['Content-Type' => 'application/json'],
        ));
    }

    /**
     * Fallback: if a 401 was returned as HTML on /api, replace with JSON.
     */
    public function onKernelResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $response = $event->getResponse();
        if ($response->getStatusCode() !== Response::HTTP_UNAUTHORIZED) {
            return;
        }

        $contentType = $response->headers->get('Content-Type', '');
        if (str_contains($contentType, 'application/json')) {
            return;
        }

        $event->setResponse(new JsonResponse(
            ['error' => 'Authentication required.'],
            Response::HTTP_UNAUTHORIZED,
            ['Content-Type' => 'application/json'],
        ));
    }
}
