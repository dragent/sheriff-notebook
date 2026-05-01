<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class BureauInventoryPatchDto
{
    public function __construct(
        #[Assert\NotBlank(message: 'La section est requise.')]
        #[Assert\Choice(
            choices: ['inventaire', 'accessoiresBureau'],
            message: 'La section doit être "inventaire" ou "accessoiresBureau".',
        )]
        public string $section,

        #[Assert\NotBlank(message: 'Le type est requis.')]
        #[Assert\Length(max: 64, maxMessage: 'Le type ne doit pas dépasser {{ limit }} caractères.')]
        public string $type,

        #[Assert\NotNull(message: 'La quantité est requise.')]
        #[Assert\GreaterThanOrEqual(value: 0, message: 'La quantité doit être supérieure ou égale à 0.')]
        public int $quantity,
    ) {
    }
}
