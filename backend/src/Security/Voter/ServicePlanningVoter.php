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
 * Service planning bulk operations (currently: planning reset).
 * Editing OTHER sheriffs' planning rows uses the same rule as GradeHierarchy::canEditOthersPlanning.
 */
final class ServicePlanningVoter extends Voter
{
    public const RESET = 'SERVICE_PLANNING_RESET';
    public const EDIT_OTHERS = 'SERVICE_PLANNING_EDIT_OTHERS';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return self::RESET === $attribute || self::EDIT_OTHERS === $attribute;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return GradeHierarchy::canEditOthersPlanning(Grade::tryFromLabel($user->getGrade()));
    }
}
