<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\DestructionRecordRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * Enregistrement d'une saisie de destruction (historique).
 * Statut : pending → une seule validation possible (réussie ou perdue).
 */
#[ORM\Entity(repositoryClass: DestructionRecordRepository::class)]
#[ORM\Table(name: 'destruction_record')]
class DestructionRecord
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_REUSSIE = 'reussie';
    public const STATUS_PERDUE = 'perdue';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /**
     * Lignes de destruction : tableau de {date, qte, sommes, destruction}.
     *
     * @var array<int, array{date: string, qte: int, sommes: string, destruction: string}>
     */
    #[ORM\Column(type: Types::JSON)]
    private array $lines = [];

    /** pending | reussie | perdue */
    #[ORM\Column(length: 16)]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /** Rempli une seule fois à la validation (réussie ou perdue). */
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $validatedAt = null;

    /** Nom du sheriff ayant créé l'enregistrement (optionnel). */
    #[ORM\Column(length: 128, nullable: true)]
    private ?string $createdBy = null;

    /**
     * @param array<int, array{date: string, qte: int, sommes: string, destruction: string}> $lines
     */
    public function __construct(array $lines, ?string $createdBy = null)
    {
        $this->id = Uuid::v7();
        $this->lines = $lines;
        $this->createdBy = $createdBy !== null && $createdBy !== '' ? $createdBy : null;
        $this->createdAt = new \DateTimeImmutable('now');
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    /** @return array<int, array{date: string, qte: int, sommes: string, destruction: string}> */
    public function getLines(): array
    {
        return $this->lines;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getValidatedAt(): ?\DateTimeImmutable
    {
        return $this->validatedAt;
    }

    public function getCreatedBy(): ?string
    {
        return $this->createdBy;
    }

    /**
     * Valide une seule fois : passage de pending à reussie ou perdue.
     */
    public function validate(string $newStatus): void
    {
        if ($this->status !== self::STATUS_PENDING) {
            throw new \DomainException('Cette destruction a déjà été validée.');
        }
        if ($newStatus !== self::STATUS_REUSSIE && $newStatus !== self::STATUS_PERDUE) {
            throw new \InvalidArgumentException('Statut invalide : reussie ou perdue attendu.');
        }
        $this->status = $newStatus;
        $this->validatedAt = new \DateTimeImmutable('now');
    }
}
