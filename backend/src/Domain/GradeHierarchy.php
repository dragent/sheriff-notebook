<?php

declare(strict_types=1);

namespace App\Domain;

/**
 * Pure domain helper that centralises every grade-comparison rule the controllers used to
 * duplicate (UserController, ServiceRecordController, DestructionRecordController, ...).
 *
 * Each rule is a static, side-effect-free predicate so it can be exercised by Voters and
 * controllers identically.
 */
final class GradeHierarchy
{
    public const TOP_TIERS_FOR_PLANNING_EDIT = 2; // County Sheriff, Adjoint, Chief
    public const TOP_TIER_FOR_FORMATION_VALIDATION = 2;
    public const SHERIFF_HIERARCHY_MAX_ORDER = 4; // every actual sheriff role (excludes Deputy=5)

    private function __construct()
    {
    }

    /**
     * True when the actor may modify another sheriff's planning fields (cf. ServiceRecordController).
     */
    public static function canEditOthersPlanning(?Grade $actor): bool
    {
        return null !== $actor && $actor->order() <= self::TOP_TIERS_FOR_PLANNING_EDIT;
    }

    /**
     * True when the actor may validate formations FOR the given target user.
     * Mirrors ServiceRecordController::canValidateFormationFor().
     */
    public static function canValidateFormationFor(?Grade $actor, ?Grade $target): bool
    {
        if (null === $actor || null === $target) {
            return false;
        }
        if ($actor->order() > self::TOP_TIER_FOR_FORMATION_VALIDATION) {
            return false;
        }

        return $actor->order() < $target->order();
    }

    /**
     * True when the actor is allowed to promote/demote a target to/from the given new grade.
     * Mirrors UserController::patch (rule: actor must outrank the target).
     */
    public static function canChangeGradeOf(?Grade $actor, ?Grade $targetCurrent): bool
    {
        if (null === $actor) {
            return false;
        }
        $targetOrder = $targetCurrent?->order() ?? 99;

        return $actor->order() <= 1 && $actor->order() < $targetOrder;
    }

    /**
     * True when the actor is allowed to clear (set to null) the target's grade.
     * Mirrors the "Suppression de grade" branch of UserController::patch.
     */
    public static function canClearGradeOf(?Grade $actor, ?Grade $target): bool
    {
        if (null === $actor || null === $target) {
            return false;
        }
        if (0 === $actor->order()) {
            return true; // County Sheriff can clear anyone (including itself)
        }
        if (1 === $actor->order()) {
            return $actor->order() < $target->order();
        }

        return false;
    }

    /**
     * True when the user may access endpoints reserved to actual sheriffs (Deputy → County).
     * Used by SeizureRecordController, DestructionRecordController.
     */
    public static function isSheriff(?Grade $grade): bool
    {
        return null !== $grade;
    }

    /**
     * True when the user is allowed to perform sheriff-only writes that exclude the lowest "Deputy" tier
     * (DestructionRecordController uses order <= 4).
     */
    public static function isOperationalSheriff(?Grade $grade): bool
    {
        return null !== $grade && $grade->order() <= self::SHERIFF_HIERARCHY_MAX_ORDER;
    }

    /**
     * Reference & Compta endpoints: allowed only for County Sheriff and Adjoint.
     */
    public static function canManageReference(?Grade $grade): bool
    {
        return null !== $grade && $grade->order() <= 1;
    }

    /**
     * Bureau (weapons + inventory) endpoints: County Sheriff, Adjoint, Chief.
     */
    public static function canManageBureau(?Grade $grade): bool
    {
        return null !== $grade && $grade->order() <= 2;
    }
}
