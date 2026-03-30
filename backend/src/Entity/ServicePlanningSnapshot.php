<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ServicePlanningSnapshotRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ServicePlanningSnapshotRepository::class)]
#[ORM\Table(name: 'service_planning_snapshot')]
final class ServicePlanningSnapshot
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 128)]
    private string $actor;

    /** @var array<string, mixed> */
    #[ORM\Column(type: 'json')]
    private array $data;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(string $actor, array $data)
    {
        $this->id = Uuid::v7();
        $this->actor = $actor !== '' ? $actor : 'unknown';
        $this->data = $data;
        $this->createdAt = new \DateTimeImmutable('now');
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getActor(): string
    {
        return $this->actor;
    }

    /** @return array<string, mixed> */
    public function getData(): array
    {
        return $this->data;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}

