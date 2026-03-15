<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'uniq_user_discord_id', columns: ['discord_id'])]
class User implements UserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\Column(length: 64)]
    private string $discordId;

    #[ORM\Column(length: 128)]
    private string $username;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $avatarUrl = null;

    /** @var list<string> */
    #[ORM\Column(type: 'json')]
    private array $roles = ['ROLE_USER'];

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $grade = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $recruitedAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    #[ORM\OneToOne(mappedBy: 'user', targetEntity: ServiceRecord::class, cascade: ['persist', 'remove'])]
    private ?ServiceRecord $serviceRecord = null;

    public function __construct(string $discordId, string $username)
    {
        $this->id = Uuid::v7();
        $this->discordId = $discordId;
        $this->username = $username;
        $now = new \DateTimeImmutable('now');
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getDiscordId(): string
    {
        return $this->discordId;
    }

    public function getUsername(): string
    {
        return $this->username;
    }

    public function setUsername(string $username): void
    {
        if ($username === $this->username) {
            return;
        }

        $this->username = $username;
        $this->touch();
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): void
    {
        if ($avatarUrl === $this->avatarUrl) {
            return;
        }

        $this->avatarUrl = $avatarUrl;
        $this->touch();
    }

    private const GRADE_TO_ROLE = [
        'Sheriff de comté' => 'ROLE_SHERIFF_COMTE',
        'Sheriff Adjoint' => 'ROLE_SHERIFF_ADJOINT',
        'Sheriff en chef' => 'ROLE_SHERIFF_EN_CHEF',
        'Sheriff' => 'ROLE_SHERIFF',
        'Sheriff Deputy' => 'ROLE_SHERIFF_DEPUTY',
        'Deputy' => 'ROLE_SHERIFF_DEPUTY',
    ];

    /** @return list<string> */
    public static function getSheriffGradeValues(): array
    {
        return array_keys(self::GRADE_TO_ROLE);
    }

    private const SHERIFF_ROLES = [
        'ROLE_SHERIFF_COMTE',
        'ROLE_SHERIFF_ADJOINT',
        'ROLE_SHERIFF_EN_CHEF',
        'ROLE_SHERIFF',
        'ROLE_SHERIFF_DEPUTY',
    ];

    public function hasSheriffRole(): bool
    {
        return \count(array_intersect($this->getRoles(), self::SHERIFF_ROLES)) > 0;
    }

    /** @return list<string> */
    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER';
        if ($this->grade !== null && isset(self::GRADE_TO_ROLE[$this->grade])) {
            $roles[] = self::GRADE_TO_ROLE[$this->grade];
        }

        return array_values(array_unique($roles));
    }

    /** @param list<string> $roles */
    public function setRoles(array $roles): void
    {
        $this->roles = array_values(array_unique($roles));
        $this->touch();
    }

    public function getGrade(): ?string
    {
        return $this->grade;
    }

    public function setGrade(?string $grade): void
    {
        if ($grade === $this->grade) {
            return;
        }

        $this->grade = $grade !== null && $grade !== '' ? $grade : null;
        if ($this->grade !== null && $this->recruitedAt === null) {
            $this->recruitedAt = new \DateTimeImmutable('now');
        }
        $this->touch();
    }

    public function getRecruitedAt(): ?\DateTimeImmutable
    {
        return $this->recruitedAt;
    }

    public function setRecruitedAt(?\DateTimeImmutable $recruitedAt): void
    {
        $this->recruitedAt = $recruitedAt;
        $this->touch();
    }

    public function eraseCredentials(): void
    {
    }

    public function getUserIdentifier(): string
    {
        return $this->discordId;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getServiceRecord(): ?ServiceRecord
    {
        return $this->serviceRecord;
    }

    public function setServiceRecord(?ServiceRecord $serviceRecord): void
    {
        if ($serviceRecord !== null && $serviceRecord->getUser() !== $this) {
            $serviceRecord->setUser($this);
        }
        $this->serviceRecord = $serviceRecord;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable('now');
    }
}
