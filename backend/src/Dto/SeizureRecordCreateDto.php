<?php

declare(strict_types=1);

namespace App\Dto;

use App\Entity\SeizureRecord;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class SeizureRecordCreateDto
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le type de saisie est requis.')]
        #[Assert\Choice(
            choices: [
                SeizureRecord::TYPE_ITEM,
                SeizureRecord::TYPE_WEAPON,
                SeizureRecord::TYPE_CASH,
            ],
            message: 'Le type doit être "item", "weapon" ou "cash".'
        )]
        public string $type,

        #[Assert\NotBlank(message: 'La date est requise.')]
        #[Assert\Regex(
            pattern: '/^\d{4}-\d{2}-\d{2}$/',
            message: 'La date doit être au format AAAA-MM-JJ.'
        )]
        public string $date,

        #[Assert\NotBlank(message: 'Le nom du sheriff est requis.')]
        #[Assert\Length(
            max: 128,
            maxMessage: 'Le nom du sheriff ne doit pas dépasser {{ limit }} caractères.'
        )]
        public string $sheriff,

        #[Assert\NotNull(message: 'La quantité est requise.')]
        #[Assert\Type(type: 'integer', message: 'La quantité doit être un entier.')]
        #[Assert\GreaterThanOrEqual(value: 1, message: 'La quantité doit être supérieure ou égale à 1.')]
        public int $quantity,

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

    /** type=item requires itemName; type=weapon requires weaponModel. */
    #[Assert\Callback]
    public function validateCombination(\Symfony\Component\Validator\Context\ExecutionContextInterface $context): void
    {
        if (SeizureRecord::TYPE_ITEM === $this->type && (null === $this->itemName || '' === $this->itemName)) {
            $context->buildViolation('itemName est requis pour une saisie d\'item.')
                ->atPath('itemName')
                ->addViolation();
        }

        if (SeizureRecord::TYPE_WEAPON === $this->type && (null === $this->weaponModel || '' === $this->weaponModel)) {
            $context->buildViolation('weaponModel est requis pour une saisie d\'arme.')
                ->atPath('weaponModel')
                ->addViolation();
        }
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        $type = isset($data['type']) && \is_string($data['type']) ? trim($data['type']) : '';
        $date = isset($data['date']) && \is_string($data['date']) ? trim($data['date']) : '';
        $sheriff = isset($data['sheriff']) && \is_string($data['sheriff']) ? trim($data['sheriff']) : '';

        $quantity = 0;
        if (isset($data['quantity']) && (\is_int($data['quantity']) || is_numeric($data['quantity']))) {
            $quantity = (int) $data['quantity'];
        }

        $itemName = isset($data['itemName']) && \is_string($data['itemName']) ? trim($data['itemName']) : null;
        $weaponModel = isset($data['weaponModel']) && \is_string($data['weaponModel']) ? trim($data['weaponModel']) : null;
        $serialNumber = isset($data['serialNumber']) && \is_string($data['serialNumber']) ? trim($data['serialNumber']) : null;
        $possessedBy = isset($data['possessedBy']) && \is_string($data['possessedBy']) ? trim($data['possessedBy']) : null;
        $notes = isset($data['notes']) && \is_string($data['notes']) ? trim($data['notes']) : null;

        return new self(
            $type,
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
