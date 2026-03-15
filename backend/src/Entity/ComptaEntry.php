<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ComptaEntryRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ComptaEntryRepository::class)]
#[ORM\Table(name: 'compta_entry')]
class ComptaEntry
{
    public const TYPE_ENTREE = 'entree';
    public const TYPE_SORTIE = 'sortie';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** entree | sortie */
    #[ORM\Column(length: 16)]
    private string $type;

    /** Date (ex: 27.08, 28/08) */
    #[ORM\Column(length: 16)]
    private string $date;

    /** Sheriff (ex: ⭐️ Ernest Doyle) */
    #[ORM\Column(length: 128)]
    private string $sheriff;

    /** Raison (ex: Primes Gouvernemental, Achat Bateau Pour Sisika) */
    #[ORM\Column(length: 255)]
    private string $reason;

    /** Somme (ex: $1 090,00) - string pour garder le format */
    #[ORM\Column(length: 32)]
    private string $amount;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $type, string $date, string $sheriff, string $reason, string $amount)
    {
        $this->id = Uuid::v7();
        $this->type = $type;
        $this->date = $date;
        $this->sheriff = $sheriff;
        $this->reason = $reason;
        $this->amount = $amount;
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

    public function setType(string $type): void
    {
        if ($type === $this->type) {
            return;
        }
        $this->type = $type;
        $this->touch();
    }

    public function getDate(): string
    {
        return $this->date;
    }

    public function setDate(string $date): void
    {
        if ($date === $this->date) {
            return;
        }
        $this->date = $date;
        $this->touch();
    }

    public function getSheriff(): string
    {
        return $this->sheriff;
    }

    public function setSheriff(string $sheriff): void
    {
        if ($sheriff === $this->sheriff) {
            return;
        }
        $this->sheriff = $sheriff;
        $this->touch();
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function setReason(string $reason): void
    {
        if ($reason === $this->reason) {
            return;
        }
        $this->reason = $reason;
        $this->touch();
    }

    public function getAmount(): string
    {
        return $this->amount;
    }

    public function setAmount(string $amount): void
    {
        if ($amount === $this->amount) {
            return;
        }
        $this->amount = $amount;
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
