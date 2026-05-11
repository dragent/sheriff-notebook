<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class SeizureCorrectionNotifyDto
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le message de synthèse est requis.')]
        #[Assert\Length(
            max: 1800,
            maxMessage: 'Le message ne doit pas dépasser {{ limit }} caractères.'
        )]
        public string $message,
    ) {
    }
}
