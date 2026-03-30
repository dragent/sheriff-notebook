<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
#[ORM\Table(name: 'seizure_record_event')]
#[ORM\Index(columns: ['record_id', 'created_at'], name: 'idx_seizure_record_event_record_created')]
final class SeizureRecordEvent
{
    public const ACTION_CREATE = 'create';
    public const ACTION_UPDATE = 'update';
    public const ACTION_CANCEL = 'cancel';

    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: SeizureRecord::class)]
    #[ORM\JoinColumn(name: 'record_id', referencedColumnName: 'id', nullable: false, onDelete: 'CASCADE')]
    private SeizureRecord $record;

    #[ORM\Column(length: 16)]
    #[Assert\Choice(
        choices: [self::ACTION_CREATE, self::ACTION_UPDATE, self::ACTION_CANCEL],
        message: 'Action invalide.'
    )]
    private string $action;

    #[ORM\Column(length: 128)]
    #[Assert\NotBlank(message: 'Acteur requis.')]
    #[Assert\Length(max: 128)]
    private string $actor;

    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $diff = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\Length(max: 255)]
    private ?string $reason = null;

    #[ORM\Column(name: 'created_at')]
    private \DateTimeImmutable $createdAt;

    /** @param array<string, mixed>|null $diff */
    public function __construct(
        SeizureRecord $record,
        string $action,
        string $actor,
        ?array $diff = null,
        ?string $reason = null,
    ) {
        $this->id = Uuid::v7();
        $this->record = $record;
        $this->action = $action;
        $this->actor = $actor;
        $this->diff = $diff;
        $this->reason = $reason !== null && trim($reason) !== '' ? trim($reason) : null;
        $this->createdAt = new \DateTimeImmutable('now');
    }
}

