<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Compta list/create restricted to County Sheriff and Deputy (Adjoint) grades.
 */
final class ComptaEntryVoter extends Voter
{
    public const MANAGE = 'COMPTA_ENTRY_MANAGE';

    private const ALLOWED_GRADES = [
        'Sheriff de comté',
        'Sheriff Adjoint',
        'Sheriff adjoint',
    ];

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::MANAGE;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        if ($attribute !== self::MANAGE) {
            return false;
        }

        $grade = $user->getGrade();
        if ($grade === null) {
            return false;
        }

        return \in_array($grade, self::ALLOWED_GRADES, true);
    }
}
