<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ServiceRecordRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: ServiceRecordRepository::class)]
#[ORM\Table(name: 'service_record')]
class ServiceRecord
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    /** Un enregistrement par utilisateur (1 user = 1 service record). */
    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, unique: true, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 128)]
    private string $name;

    #[ORM\Column(length: 32, nullable: true)]
    private ?string $telegramPrimary = null;

    #[ORM\Column(nullable: true)]
    private ?int $total = null;

    #[ORM\Column(type: 'boolean')]
    private bool $monDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $monNight = false;

    #[ORM\Column(type: 'boolean')]
    private bool $tueDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $tueNight = false;

    #[ORM\Column(type: 'boolean')]
    private bool $wedDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $wedNight = false;

    #[ORM\Column(type: 'boolean')]
    private bool $thuDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $thuNight = false;

    #[ORM\Column(type: 'boolean')]
    private bool $friDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $friNight = false;

    #[ORM\Column(type: 'boolean')]
    private bool $satDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $satNight = false;

    #[ORM\Column(type: 'boolean')]
    private bool $sunDay = false;

    #[ORM\Column(type: 'boolean')]
    private bool $sunNight = false;

    /** Prêt bureau : arme principale (ex: Evans, Henry) */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $primaryWeapon = null;

    /** Numéro de série arme principale */
    #[ORM\Column(length: 32, nullable: true)]
    private ?string $primaryWeaponSerial = null;

    /** Lunette (scope) */
    #[ORM\Column(type: 'boolean')]
    private bool $hasScope = false;

    /** Arme secondaire (ex: Cattleman) */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $secondaryWeapon = null;

    /** Numéro de série arme secondaire */
    #[ORM\Column(length: 32, nullable: true)]
    private ?string $secondaryWeaponSerial = null;

    /** Calèches / véhicules (un par ligne, ex: Blindé 4ch, Carriole) */
    #[ORM\Column(length: 512, nullable: true)]
    private ?string $cartInfo = null;

    /** Bateaux (un par ligne, ex: Canot, Barque) */
    #[ORM\Column(length: 512, nullable: true)]
    private ?string $boatInfo = null;

    /** Formation : Lead patrouille */
    #[ORM\Column(type: 'boolean')]
    private bool $leadPatrol = false;

    /** Formation : Fusillade */
    #[ORM\Column(type: 'boolean')]
    private bool $shooting = false;

    /** Formation : Prise interventions */
    #[ORM\Column(type: 'boolean')]
    private bool $interventions = false;

    /** Formation : Braquages */
    #[ORM\Column(type: 'boolean')]
    private bool $robberies = false;

    /** Formation : Ventes */
    #[ORM\Column(type: 'boolean')]
    private bool $sales = false;

    /** Formation : Recensement */
    #[ORM\Column(type: 'boolean')]
    private bool $census = false;

    /** Formation : Registre Saisie */
    #[ORM\Column(type: 'boolean')]
    private bool $registerSeizure = false;

    /** Formation : Plaintes */
    #[ORM\Column(type: 'boolean')]
    private bool $complaints = false;

    /** Formation : Rapports */
    #[ORM\Column(type: 'boolean')]
    private bool $reports = false;

    /** Formation : Sisika */
    #[ORM\Column(type: 'boolean')]
    private bool $sisika = false;

    /** Formation : Demande Wanted */
    #[ORM\Column(type: 'boolean')]
    private bool $wantedRequest = false;

    /**
     * Validations de formations issues du catalogue référentiel.
     * Clé = id formation, valeur = true si validée.
     * Peut être null si la colonne n'a pas encore été migrée ou en base ancienne.
     *
     * @var array<string, bool>|null
     */
    #[ORM\Column(type: 'json', nullable: true)]
    private ?array $formationValidations = [];

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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): void
    {
        $this->user = $user;
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

    public function getTelegramPrimary(): ?string
    {
        return $this->telegramPrimary;
    }

    public function setTelegramPrimary(?string $telegramPrimary): void
    {
        $telegramPrimary = self::normalizeNullableString($telegramPrimary);
        if ($telegramPrimary === $this->telegramPrimary) {
            return;
        }

        $this->telegramPrimary = $telegramPrimary;
        $this->touch();
    }

    public function getTotal(): ?int
    {
        return $this->total;
    }

    public function setTotal(?int $total): void
    {
        if ($total === $this->total) {
            return;
        }

        $this->total = $total;
        $this->touch();
    }

    public function isMonDay(): bool
    {
        return $this->monDay;
    }

    public function setMonDay(bool $value): void
    {
        if ($value === $this->monDay) {
            return;
        }
        $this->monDay = $value;
        $this->touch();
    }

    public function isMonNight(): bool
    {
        return $this->monNight;
    }

    public function setMonNight(bool $value): void
    {
        if ($value === $this->monNight) {
            return;
        }
        $this->monNight = $value;
        $this->touch();
    }

    public function isTueDay(): bool
    {
        return $this->tueDay;
    }

    public function setTueDay(bool $value): void
    {
        if ($value === $this->tueDay) {
            return;
        }
        $this->tueDay = $value;
        $this->touch();
    }

    public function isTueNight(): bool
    {
        return $this->tueNight;
    }

    public function setTueNight(bool $value): void
    {
        if ($value === $this->tueNight) {
            return;
        }
        $this->tueNight = $value;
        $this->touch();
    }

    public function isWedDay(): bool
    {
        return $this->wedDay;
    }

    public function setWedDay(bool $value): void
    {
        if ($value === $this->wedDay) {
            return;
        }
        $this->wedDay = $value;
        $this->touch();
    }

    public function isWedNight(): bool
    {
        return $this->wedNight;
    }

    public function setWedNight(bool $value): void
    {
        if ($value === $this->wedNight) {
            return;
        }
        $this->wedNight = $value;
        $this->touch();
    }

    public function isThuDay(): bool
    {
        return $this->thuDay;
    }

    public function setThuDay(bool $value): void
    {
        if ($value === $this->thuDay) {
            return;
        }
        $this->thuDay = $value;
        $this->touch();
    }

    public function isThuNight(): bool
    {
        return $this->thuNight;
    }

    public function setThuNight(bool $value): void
    {
        if ($value === $this->thuNight) {
            return;
        }
        $this->thuNight = $value;
        $this->touch();
    }

    public function isFriDay(): bool
    {
        return $this->friDay;
    }

    public function setFriDay(bool $value): void
    {
        if ($value === $this->friDay) {
            return;
        }
        $this->friDay = $value;
        $this->touch();
    }

    public function isFriNight(): bool
    {
        return $this->friNight;
    }

    public function setFriNight(bool $value): void
    {
        if ($value === $this->friNight) {
            return;
        }
        $this->friNight = $value;
        $this->touch();
    }

    public function isSatDay(): bool
    {
        return $this->satDay;
    }

    public function setSatDay(bool $value): void
    {
        if ($value === $this->satDay) {
            return;
        }
        $this->satDay = $value;
        $this->touch();
    }

    public function isSatNight(): bool
    {
        return $this->satNight;
    }

    public function setSatNight(bool $value): void
    {
        if ($value === $this->satNight) {
            return;
        }
        $this->satNight = $value;
        $this->touch();
    }

    public function isSunDay(): bool
    {
        return $this->sunDay;
    }

    public function setSunDay(bool $value): void
    {
        if ($value === $this->sunDay) {
            return;
        }
        $this->sunDay = $value;
        $this->touch();
    }

    public function isSunNight(): bool
    {
        return $this->sunNight;
    }

    public function setSunNight(bool $value): void
    {
        if ($value === $this->sunNight) {
            return;
        }
        $this->sunNight = $value;
        $this->touch();
    }

    public function getPrimaryWeapon(): ?string
    {
        return $this->primaryWeapon;
    }

    public function setPrimaryWeapon(?string $primaryWeapon): void
    {
        $primaryWeapon = self::normalizeNullableString($primaryWeapon);
        if ($primaryWeapon === $this->primaryWeapon) {
            return;
        }
        $this->primaryWeapon = $primaryWeapon;
        $this->touch();
    }

    public function getPrimaryWeaponSerial(): ?string
    {
        return $this->primaryWeaponSerial;
    }

    public function setPrimaryWeaponSerial(?string $primaryWeaponSerial): void
    {
        $primaryWeaponSerial = self::normalizeNullableString($primaryWeaponSerial);
        if ($primaryWeaponSerial === $this->primaryWeaponSerial) {
            return;
        }
        $this->primaryWeaponSerial = $primaryWeaponSerial;
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

    public function getSecondaryWeapon(): ?string
    {
        return $this->secondaryWeapon;
    }

    public function setSecondaryWeapon(?string $secondaryWeapon): void
    {
        $secondaryWeapon = self::normalizeNullableString($secondaryWeapon);
        if ($secondaryWeapon === $this->secondaryWeapon) {
            return;
        }
        $this->secondaryWeapon = $secondaryWeapon;
        $this->touch();
    }

    public function getSecondaryWeaponSerial(): ?string
    {
        return $this->secondaryWeaponSerial;
    }

    public function setSecondaryWeaponSerial(?string $secondaryWeaponSerial): void
    {
        $secondaryWeaponSerial = self::normalizeNullableString($secondaryWeaponSerial);
        if ($secondaryWeaponSerial === $this->secondaryWeaponSerial) {
            return;
        }
        $this->secondaryWeaponSerial = $secondaryWeaponSerial;
        $this->touch();
    }

    public function getCartInfo(): ?string
    {
        return $this->cartInfo;
    }

    public function setCartInfo(?string $cartInfo): void
    {
        $cartInfo = self::normalizeNullableString($cartInfo);
        if ($cartInfo === $this->cartInfo) {
            return;
        }
        $this->cartInfo = $cartInfo;
        $this->touch();
    }

    public function getBoatInfo(): ?string
    {
        return $this->boatInfo;
    }

    public function setBoatInfo(?string $boatInfo): void
    {
        $boatInfo = self::normalizeNullableString($boatInfo);
        if ($boatInfo === $this->boatInfo) {
            return;
        }
        $this->boatInfo = $boatInfo;
        $this->touch();
    }

    public function isLeadPatrol(): bool
    {
        return $this->leadPatrol;
    }

    public function setLeadPatrol(bool $leadPatrol): void
    {
        if ($leadPatrol === $this->leadPatrol) {
            return;
        }
        $this->leadPatrol = $leadPatrol;
        $this->touch();
    }

    public function isShooting(): bool
    {
        return $this->shooting;
    }

    public function setShooting(bool $shooting): void
    {
        if ($shooting === $this->shooting) {
            return;
        }
        $this->shooting = $shooting;
        $this->touch();
    }

    public function isInterventions(): bool
    {
        return $this->interventions;
    }

    public function setInterventions(bool $interventions): void
    {
        if ($interventions === $this->interventions) {
            return;
        }
        $this->interventions = $interventions;
        $this->touch();
    }

    public function isRobberies(): bool
    {
        return $this->robberies;
    }

    public function setRobberies(bool $robberies): void
    {
        if ($robberies === $this->robberies) {
            return;
        }
        $this->robberies = $robberies;
        $this->touch();
    }

    public function isSales(): bool
    {
        return $this->sales;
    }

    public function setSales(bool $sales): void
    {
        if ($sales === $this->sales) {
            return;
        }
        $this->sales = $sales;
        $this->touch();
    }

    public function isCensus(): bool
    {
        return $this->census;
    }

    public function setCensus(bool $census): void
    {
        if ($census === $this->census) {
            return;
        }
        $this->census = $census;
        $this->touch();
    }

    public function isRegisterSeizure(): bool
    {
        return $this->registerSeizure;
    }

    public function setRegisterSeizure(bool $registerSeizure): void
    {
        if ($registerSeizure === $this->registerSeizure) {
            return;
        }
        $this->registerSeizure = $registerSeizure;
        $this->touch();
    }

    public function isComplaints(): bool
    {
        return $this->complaints;
    }

    public function setComplaints(bool $complaints): void
    {
        if ($complaints === $this->complaints) {
            return;
        }
        $this->complaints = $complaints;
        $this->touch();
    }

    public function isReports(): bool
    {
        return $this->reports;
    }

    public function setReports(bool $reports): void
    {
        if ($reports === $this->reports) {
            return;
        }
        $this->reports = $reports;
        $this->touch();
    }

    public function isSisika(): bool
    {
        return $this->sisika;
    }

    public function setSisika(bool $sisika): void
    {
        if ($sisika === $this->sisika) {
            return;
        }
        $this->sisika = $sisika;
        $this->touch();
    }

    public function isWantedRequest(): bool
    {
        return $this->wantedRequest;
    }

    public function setWantedRequest(bool $wantedRequest): void
    {
        if ($wantedRequest === $this->wantedRequest) {
            return;
        }
        $this->wantedRequest = $wantedRequest;
        $this->touch();
    }

    /**
     * @return array<string, bool>
     */
    public function getFormationValidations(): array
    {
        return $this->formationValidations ?? [];
    }

    /**
     * @param array<string, bool> $formationValidations
     */
    public function setFormationValidations(array $formationValidations): void
    {
        $filtered = [];
        foreach ($formationValidations as $id => $valid) {
            if (\is_string($id) && $id !== '' && $valid === true) {
                $filtered[$id] = true;
            }
        }
        if ($filtered === ($this->formationValidations ?? [])) {
            return;
        }
        $this->formationValidations = $filtered;
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

    private static function normalizeNullableString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }
}

