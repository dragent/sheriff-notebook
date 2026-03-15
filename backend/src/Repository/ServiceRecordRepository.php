<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ServiceRecord;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ServiceRecord>
 */
class ServiceRecordRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ServiceRecord::class);
    }

    public function findOneByUser(User $user): ?ServiceRecord
    {
        return $this->findOneBy(['user' => $user], []);
    }
}

