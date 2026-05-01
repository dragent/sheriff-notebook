<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Shared payload for POST and PATCH /api/bureau-weapons.
 *
 * On PATCH the controller decides which fields to apply (any field left null means "do not touch").
 * On POST the controller asserts model + serialNumber are present.
 */
final class BureauWeaponWriteDto
{
    public function __construct(
        #[Assert\Length(max: 64, maxMessage: 'Le modèle ne doit pas dépasser {{ limit }} caractères.')]
        public ?string $model = null,

        #[Assert\Length(max: 32, maxMessage: 'Le numéro de série ne doit pas dépasser {{ limit }} caractères.')]
        public ?string $serialNumber = null,

        public ?bool $onLoan = null,

        public ?bool $inChest = null,

        public ?bool $hasScope = null,

        #[Assert\Length(max: 128, maxMessage: 'Les commentaires ne doivent pas dépasser {{ limit }} caractères.')]
        public ?string $comments = null,
    ) {
    }
}
