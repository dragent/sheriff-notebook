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
 * Bureau (weapons + inventory) management — same rule as GradeHierarchy::canManageBureau.
 */
final class BureauVoter extends Voter
{
    public const MANAGE = 'BUREAU_MANAGE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::MANAGE === $attribute;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return GradeHierarchy::canManageBureau(Grade::tryFromLabel($user->getGrade()));
    }
}
