<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class SeizureRecordCancelDto
{
    public function __construct(
        #[Assert\NotBlank(message: 'La raison est requise.')]
        #[Assert\Length(max: 255, maxMessage: 'La raison ne doit pas dépasser {{ limit }} caractères.')]
        public string $reason,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $reason = isset($data['reason']) && \is_string($data['reason']) ? trim($data['reason']) : '';

        return new self($reason);
    }
}
