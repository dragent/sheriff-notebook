<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SeizureRecordRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: SeizureRecordRepository::class)]
#[ORM\Table(name: 'seizure_record')]
class SeizureRecord
{
    public const TYPE_ITEM = 'item';
    public const TYPE_WEAPON = 'weapon';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 16)]
    #[Assert\NotBlank(message: 'Le type de saisie est requis.')]
    #[Assert\Choice(
        choices: [self::TYPE_ITEM, self::TYPE_WEAPON],
        message: 'Le type doit être "item" ou "weapon".'
    )]
    private string $type;

    /** Date au format YYYY-MM-DD */
    #[ORM\Column(length: 16)]
    #[Assert\NotBlank(message: 'La date est requise.')]
    #[Assert\Regex(
        pattern: '/^\d{4}-\d{2}-\d{2}$/',
        message: 'La date doit être au format AAAA-MM-JJ.'
    )]
    private string $date;

    #[ORM\Column(length: 128)]
    #[Assert\NotBlank(message: 'Le nom du sheriff est requis.')]
    #[Assert\Length(
        max: 128,
        maxMessage: 'Le nom du sheriff ne doit pas dépasser {{ limit }} caractères.'
    )]
    private string $sheriff;

    #[ORM\Column(type: 'integer')]
    #[Assert\NotNull(message: 'La quantité est requise.')]
    #[Assert\GreaterThanOrEqual(value: 1, message: 'La quantité doit être supérieure ou égale à 1.')]
    private int $quantity;

    /** Nom de l'item (si type=item) */
    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(
        max: 255,
        maxMessage: 'Le nom de l\'item ne doit pas dépasser {{ limit }} caractères.'
    )]
    private ?string $itemName = null;

    /** Modèle d'arme (si type=weapon) */
    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(
        max: 255,
        maxMessage: 'Le modèle d\'arme ne doit pas dépasser {{ limit }} caractères.'
    )]
    private ?string $weaponModel = null;

    /** Numéro de série (optionnel) */
    #[ORM\Column(length: 64, nullable: true)]
    #[Assert\Length(
        max: 64,
        maxMessage: 'Le numéro de série ne doit pas dépasser {{ limit }} caractères.'
    )]
    private ?string $serialNumber = null;

    /** Possédé par (nom de la personne) */
    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(
        max: 255,
        maxMessage: 'Le champ \"Possédé par\" ne doit pas dépasser {{ limit }} caractères.'
    )]
    private ?string $possessedBy = null;

    /** Notes / dossier */
    #[ORM\Column(length: 512, nullable: true)]
    #[Assert\Length(
        max: 512,
        maxMessage: 'Les notes ne doivent pas dépasser {{ limit }} caractères.'
    )]
    private ?string $notes = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(
        string $type,
        string $date,
        string $sheriff,
        int $quantity,
        ?string $itemName = null,
        ?string $weaponModel = null,
        ?string $serialNumber = null,
        ?string $possessedBy = null,
        ?string $notes = null
    ) {
        $this->id = Uuid::v7();
        $this->type = $type;
        $this->date = $date;
        $this->sheriff = $sheriff;
        $this->quantity = $quantity;
        $this->itemName = $itemName !== null && $itemName !== '' ? $itemName : null;
        $this->weaponModel = $weaponModel !== null && $weaponModel !== '' ? $weaponModel : null;
        $this->serialNumber = $serialNumber !== null && $serialNumber !== '' ? $serialNumber : null;
        $this->possessedBy = $possessedBy !== null && $possessedBy !== '' ? $possessedBy : null;
        $this->notes = $notes !== null && $notes !== '' ? $notes : null;
        $now = new \DateTimeImmutable('now');
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function getSheriff(): string
    {
        return $this->sheriff;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): void
    {
        $this->quantity = $quantity;
        $this->updatedAt = new \DateTimeImmutable('now');
    }

    public function getItemName(): ?string
    {
        return $this->itemName;
    }

    public function getWeaponModel(): ?string
    {
        return $this->weaponModel;
    }

    public function getSerialNumber(): ?string
    {
        return $this->serialNumber;
    }

    public function getPossessedBy(): ?string
    {
        return $this->possessedBy;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }
}
