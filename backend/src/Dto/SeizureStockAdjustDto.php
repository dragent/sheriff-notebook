<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Ajuste un stock saisi agrégé (FIFO sur les lignes de saisie).
 * - key: nom item / modèle arme / "model|serial" / "__cash_seizure__"
 * - removeQuantity: quantité à retirer (dollars avec 2 décimales max pour cash, entier sinon)
 */
final readonly class SeizureStockAdjustDto
{
    public function __construct(
        #[Assert\NotBlank(message: 'La clé de stock est requise.')]
        #[Assert\Length(max: 255)]
        public string $key,

        #[Assert\NotNull(message: 'La quantité à retirer est requise.')]
        #[Assert\Type(type: 'numeric', message: 'La quantité à retirer doit être un nombre.')]
        public float $removeQuantity,
    ) {
    }
}

