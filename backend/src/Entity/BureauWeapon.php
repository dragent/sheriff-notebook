<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BureauWeaponRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/** Recensement armes du bureau (coffres.csv) */
#[ORM\Entity(repositoryClass: BureauWeaponRepository::class)]
#[ORM\Table(name: 'bureau_weapon')]
class BureauWeapon
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** Modèle (ex: Evans, Henry, Winchester) */
    #[ORM\Column(length: 64)]
    private string $model;

    /** Numéro de série */
    #[ORM\Column(length: 32)]
    private string $serialNumber;

    /** Prêt (TRUE = prêté) */
    #[ORM\Column(type: 'boolean')]
    private bool $onLoan = false;

    /** Coffre (TRUE = dans le coffre) */
    #[ORM\Column(type: 'boolean')]
    private bool $inChest = false;

    /** Lunette (TRUE = avec lunette) */
    #[ORM\Column(type: 'boolean')]
    private bool $hasScope = false;

    /** Commentaires / Shérif en possession (ex: 🌠Nestor Ingalls) */
    #[ORM\Column(length: 128, nullable: true)]
    private ?string $comments = null;

    /** Arme saisie (liée à une saisie) */
    #[ORM\Column(type: 'boolean')]
    private bool $isSeized = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $model, string $serialNumber)
    {
        $this->id = Uuid::v7();
        $this->model = $model;
        $this->serialNumber = $serialNumber;
        $now = new \DateTimeImmutable('now');
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getModel(): string
    {
        return $this->model;
    }

    public function setModel(string $model): void
    {
        if ($model === $this->model) {
            return;
        }
        $this->model = $model;
        $this->touch();
    }

    public function getSerialNumber(): string
    {
        return $this->serialNumber;
    }

    public function setSerialNumber(string $serialNumber): void
    {
        if ($serialNumber === $this->serialNumber) {
            return;
        }
        $this->serialNumber = $serialNumber;
        $this->touch();
    }

    public function isOnLoan(): bool
    {
        return $this->onLoan;
    }

    public function setOnLoan(bool $onLoan): void
    {
        if ($onLoan === $this->onLoan) {
            return;
        }
        $this->onLoan = $onLoan;
        $this->touch();
    }

    public function isInChest(): bool
    {
        return $this->inChest;
    }

    public function setInChest(bool $inChest): void
    {
        if ($inChest === $this->inChest) {
            return;
        }
        $this->inChest = $inChest;
        $this->touch();
    }

    public function isHasScope(): bool
    {
        return $this->hasScope;
    }

    public function setHasScope(bool $hasScope): void
    {
        if ($hasScope === $this->hasScope) {
            return;
        }
        $this->hasScope = $hasScope;
        $this->touch();
    }

    public function getComments(): ?string
    {
        return $this->comments;
    }

    public function setComments(?string $comments): void
    {
        $comments = $comments !== null ? (trim($comments) ?: null) : null;
        if ($comments === $this->comments) {
            return;
        }
        $this->comments = $comments;
        $this->touch();
    }

    public function isSeized(): bool
    {
        return $this->isSeized;
    }

    public function setIsSeized(bool $isSeized): void
    {
        if ($isSeized === $this->isSeized) {
            return;
        }
        $this->isSeized = $isSeized;
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
