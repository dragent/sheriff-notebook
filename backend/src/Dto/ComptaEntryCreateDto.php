<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\ComptaEntry;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class ComptaEntryCreateDto
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le type est requis.')]
        #[Assert\Choice(
            choices: [ComptaEntry::TYPE_ENTREE, ComptaEntry::TYPE_SORTIE],
            message: 'Le type doit être "entree" ou "sortie".'
        )]
        public string $type,

        #[Assert\NotBlank(message: 'La date (dateIso) est requise.')]
        public string $dateIso,

        #[Assert\NotBlank(message: 'Le sheriff est requis.')]
        #[Assert\Length(max: 128, maxMessage: 'Le sheriff ne doit pas dépasser {{ limit }} caractères.')]
        public string $sheriff,

        #[Assert\NotBlank(message: 'La raison est requise.')]
        #[Assert\Length(max: 255, maxMessage: 'La raison ne doit pas dépasser {{ limit }} caractères.')]
        public string $raison,

        #[Assert\NotNull(message: 'La somme est requise.')]
        #[Assert\Type(type: 'numeric', message: 'La somme doit être un nombre.')]
        #[Assert\GreaterThanOrEqual(value: 0, message: 'La somme doit être positive ou nulle.')]
        public float|int $somme,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $type = isset($data['type']) && \is_string($data['type']) ? trim($data['type']) : '';
        $dateIso = isset($data['dateIso']) && \is_string($data['dateIso']) ? trim($data['dateIso']) : '';
        $sheriff = isset($data['sheriff']) && \is_string($data['sheriff']) ? trim($data['sheriff']) : '';
        $raison = isset($data['raison']) && \is_string($data['raison']) ? trim($data['raison']) : '';
        $somme = isset($data['somme']) && is_numeric($data['somme']) ? (float) $data['somme'] : -1.0;

        return new self($type, $dateIso, $sheriff, $raison, $somme);
    }

    public function getAmountFormatted(): string
    {
        return number_format($this->somme, 2, '.', '');
    }
}
