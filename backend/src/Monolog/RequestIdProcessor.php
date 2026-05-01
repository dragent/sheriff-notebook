<?php

declare(strict_types=1);

namespace App\Monolog;

use App\EventSubscriber\RequestIdSubscriber;
use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Adds request_id to log records when a web request is active (from {@see RequestIdSubscriber}).
 */
final class RequestIdProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly RequestStack $requestStack,
    ) {
    }

    public function __invoke(LogRecord $record): LogRecord
    {
        $request = $this->requestStack->getCurrentRequest();
        if (null === $request) {
            return $record;
        }

        $id = $request->attributes->get(RequestIdSubscriber::ATTRIBUTE);
        if (\is_string($id) && '' !== $id) {
            $record->extra['request_id'] = $id;
        }

        return $record;
    }
}
