<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BureauInventoryRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/** Inventaire du bureau : munitions, fumigènes, couteaux, nourriture (coffres.csv) */
#[ORM\Entity(repositoryClass: BureauInventoryRepository::class)]
#[ORM\Table(name: 'bureau_inventory')]
#[ORM\UniqueConstraint(name: 'uniq_bureau_inventory_category_name', columns: ['category', 'name'])]
class BureauInventory
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** Catégorie (ex: Munition, Fumigène et Outil, Couteau, Nourriture, Autres) */
    #[ORM\Column(length: 64)]
    private string $category;

    /** Nom (ex: Munition de revolver, Gros Cracker, Drapeau) */
    #[ORM\Column(length: 128)]
    private string $name;

    #[ORM\Column(type: 'integer')]
    private int $quantity = 0;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $category, string $name)
    {
        $this->id = Uuid::v7();
        $this->category = $category;
        $this->name = $name;
        $now = new \DateTimeImmutable('now');
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getCategory(): string
    {
        return $this->category;
    }

    public function setCategory(string $category): void
    {
        if ($category === $this->category) {
            return;
        }
        $this->category = $category;
        $this->touch();
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

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function setQuantity(int $quantity): void
    {
        if ($quantity === $this->quantity) {
            return;
        }
        $this->quantity = $quantity;
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
