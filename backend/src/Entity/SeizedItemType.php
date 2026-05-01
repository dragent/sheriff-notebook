<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SeizedItemTypeRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/** Type d'item saisie avec tarifs (bdd.csv - Item Saisie, Destruction, Qte) */
#[ORM\Entity(repositoryClass: SeizedItemTypeRepository::class)]
#[ORM\Table(name: 'seized_item_type')]
#[ORM\UniqueConstraint(name: 'uniq_seized_item_type_name', columns: ['name'])]
class SeizedItemType
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** Nom de l'item (ex: Pochons, Opium, Graines cannabis) */
    #[ORM\Column(length: 128)]
    private string $name;

    /** Prix unitaire (ex: $5,00) */
    #[ORM\Column(length: 32, nullable: true)]
    private ?string $unitPrice = null;

    /** Prix destruction (ex: $117,00) */
    #[ORM\Column(length: 32, nullable: true)]
    private ?string $destructionPrice = null;

    /** Valeur totale exemple (ex: $585,00) */
    #[ORM\Column(length: 32, nullable: true)]
    private ?string $totalValue = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $name)
    {
        $this->id = Uuid::v7();
        $this->name = $name;
        $now = new \DateTimeImmutable('now');
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): void
    {
        if ($name === $this->name) {
            return;
        }
        $this->name = $name;
        $this->touch();
    }

    public function getUnitPrice(): ?string
    {
        return $this->unitPrice;
    }

    public function setUnitPrice(?string $unitPrice): void
    {
        $unitPrice = null !== $unitPrice ? (trim($unitPrice) ?: null) : null;
        if ($unitPrice === $this->unitPrice) {
            return;
        }
        $this->unitPrice = $unitPrice;
        $this->touch();
    }

    public function getDestructionPrice(): ?string
    {
        return $this->destructionPrice;
    }

    public function setDestructionPrice(?string $destructionPrice): void
    {
        $destructionPrice = null !== $destructionPrice ? (trim($destructionPrice) ?: null) : null;
        if ($destructionPrice === $this->destructionPrice) {
            return;
        }
        $this->destructionPrice = $destructionPrice;
        $this->touch();
    }

    public function getTotalValue(): ?string
    {
        return $this->totalValue;
    }

    public function setTotalValue(?string $totalValue): void
    {
        $totalValue = null !== $totalValue ? (trim($totalValue) ?: null) : null;
        if ($totalValue === $this->totalValue) {
            return;
        }
        $this->totalValue = $totalValue;
        $this->touch();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable('now');
    }
}
