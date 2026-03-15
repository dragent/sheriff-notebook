<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\DestructionRecord;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DestructionRecord>
 */
class DestructionRecordRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DestructionRecord::class);
    }

    /** @return list<DestructionRecord> */
    public function findAllOrderedByCreatedDesc(): array
    {
        return $this->createQueryBuilder('d')
            ->orderBy('d.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
