<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Captures X-Request-Id from the Next.js proxy (or generates one) for correlation in logs and support.
 */
final class RequestIdSubscriber implements EventSubscriberInterface
{
    public const ATTRIBUTE = 'request_id';

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onKernelRequest', 260]];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $raw = $request->headers->get('X-Request-Id') ?? $request->headers->get('X-Correlation-Id');
        $id = null !== $raw ? trim($raw) : '';
        if ('' === $id || \strlen($id) > 128) {
            $id = bin2hex(random_bytes(8));
        }
        $request->attributes->set(self::ATTRIBUTE, $id);
    }
}
