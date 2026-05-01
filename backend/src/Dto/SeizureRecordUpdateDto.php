<?php

declare(strict_types=1);

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class SeizureRecordUpdateDto
{
    public function __construct(
        #[Assert\Regex(
            pattern: '/^\d{4}-\d{2}-\d{2}$/',
            message: 'La date doit être au format AAAA-MM-JJ.'
        )]
        public ?string $date = null,

        #[Assert\Length(
            max: 128,
            maxMessage: 'Le nom du sheriff ne doit pas dépasser {{ limit }} caractères.'
        )]
        public ?string $sheriff = null,

        #[Assert\Type(type: 'integer', message: 'La quantité doit être un entier.')]
        #[Assert\GreaterThanOrEqual(value: 1, message: 'La quantité doit être supérieure ou égale à 1.')]
        public ?int $quantity = null,

        #[Assert\Length(
            max: 255,
            maxMessage: 'Le nom de l\'item ne doit pas dépasser {{ limit }} caractères.'
        )]
        public ?string $itemName = null,

        #[Assert\Length(
            max: 255,
            maxMessage: 'Le modèle d\'arme ne doit pas dépasser {{ limit }} caractères.'
        )]
        public ?string $weaponModel = null,

        #[Assert\Length(
            max: 64,
            maxMessage: 'Le numéro de série ne doit pas dépasser {{ limit }} caractères.'
        )]
        public ?string $serialNumber = null,

        #[Assert\Length(
            max: 255,
            maxMessage: 'Le champ "Possédé par" ne doit pas dépasser {{ limit }} caractères.'
        )]
        public ?string $possessedBy = null,

        #[Assert\Length(
            max: 512,
            maxMessage: 'Les notes ne doivent pas dépasser {{ limit }} caractères.'
        )]
        public ?string $notes = null,
    ) {
    }

    #[Assert\Callback]
    public function validateAtLeastOne(\Symfony\Component\Validator\Context\ExecutionContextInterface $context): void
    {
        if (
            null === $this->date
            && null === $this->sheriff
            && null === $this->quantity
            && null === $this->itemName
            && null === $this->weaponModel
            && null === $this->serialNumber
            && null === $this->possessedBy
            && null === $this->notes
        ) {
            $context->buildViolation('Aucun champ à mettre à jour.')
                ->addViolation();
        }
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $date = isset($data['date']) && \is_string($data['date']) ? trim($data['date']) : null;
        $sheriff = isset($data['sheriff']) && \is_string($data['sheriff']) ? trim($data['sheriff']) : null;

        $quantity = null;
        if (\array_key_exists('quantity', $data)) {
            if (\is_int($data['quantity']) || is_numeric($data['quantity'])) {
                $quantity = (int) $data['quantity'];
            }
        }

        $itemName = isset($data['itemName']) && \is_string($data['itemName']) ? trim($data['itemName']) : null;
        $weaponModel = isset($data['weaponModel']) && \is_string($data['weaponModel']) ? trim($data['weaponModel']) : null;
        $serialNumber = isset($data['serialNumber']) && \is_string($data['serialNumber']) ? trim($data['serialNumber']) : null;
        $possessedBy = isset($data['possessedBy']) && \is_string($data['possessedBy']) ? trim($data['possessedBy']) : null;
        $notes = isset($data['notes']) && \is_string($data['notes']) ? trim($data['notes']) : null;

        return new self(
            $date,
            $sheriff,
            $quantity,
            $itemName,
            $weaponModel,
            $serialNumber,
            $possessedBy,
            $notes,
        );
    }
}
