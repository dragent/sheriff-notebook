<?php

declare(strict_types=1);

namespace App\Domain;

/**
 * Single source of truth for sheriff grades stored as strings in the User entity.
 *
 * Grades are persisted as their human-readable French label (kept for compatibility with the
 * existing rows and the Discord role mapping). Use Grade::tryFromLabel() to safely parse
 * incoming user-provided strings (it tolerates the historical "Sheriff adjoint" lower-case variant).
 */
enum Grade: string
{
    case CountySheriff = 'Sheriff de comté';
    case Adjoint = 'Sheriff Adjoint';
    case Chief = 'Sheriff en chef';
    case Sheriff = 'Sheriff';
    case SheriffDeputy = 'Sheriff Deputy';
    case Deputy = 'Deputy';

    /**
     * Parse a label coming from the database, an API payload or Discord, accepting historical
     * casing variants ("Sheriff adjoint"). Returns null when the label does not map to any grade.
     */
    public static function tryFromLabel(?string $label): ?self
    {
        if (null === $label) {
            return null;
        }
        $trimmed = trim($label);
        if ('' === $trimmed) {
            return null;
        }

        return match ($trimmed) {
            'Sheriff de comté' => self::CountySheriff,
            'Sheriff Adjoint', 'Sheriff adjoint' => self::Adjoint,
            'Sheriff en chef' => self::Chief,
            'Sheriff' => self::Sheriff,
            'Sheriff Deputy' => self::SheriffDeputy,
            'Deputy' => self::Deputy,
            default => null,
        };
    }

    /** Hierarchy order: 0 = highest authority (County Sheriff), 5 = lowest (Deputy). */
    public function order(): int
    {
        return match ($this) {
            self::CountySheriff => 0,
            self::Adjoint => 1,
            self::Chief => 2,
            self::Sheriff => 3,
            self::SheriffDeputy => 4,
            self::Deputy => 5,
        };
    }

    public function label(): string
    {
        return $this->value;
    }

    /** All canonical grade labels (the list the UserController used to expose as VALID_GRADES). */
    public static function labels(): array
    {
        return array_map(static fn (self $g): string => $g->value, self::cases());
    }
}
