<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ServiceRecord;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Attaches an empty ServiceRecord when a new User is created (one fiche per user).
 */
final class UserServiceRecordProvisioner
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function provisionForNewUser(User $user): void
    {
        if ($user->getServiceRecord() !== null) {
            return;
        }

        $record = new ServiceRecord($user->getUsername());
        $record->setUser($user);
        $user->setServiceRecord($record);
        $this->entityManager->persist($record);
    }
}
