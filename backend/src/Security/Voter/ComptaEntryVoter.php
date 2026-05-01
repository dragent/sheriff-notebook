<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Domain\Grade;
use App\Domain\GradeHierarchy;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Compta list/create restricted to County Sheriff and Adjoint grades — same rule as
 * GradeHierarchy::canManageReference() (single source of truth across controllers and voters).
 */
final class ComptaEntryVoter extends Voter
{
    public const MANAGE = 'COMPTA_ENTRY_MANAGE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::MANAGE === $attribute;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User || self::MANAGE !== $attribute) {
            return false;
        }

        return GradeHierarchy::canManageReference(Grade::tryFromLabel($user->getGrade()));
    }
}
