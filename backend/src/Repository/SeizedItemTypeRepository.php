<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\SeizedItemType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SeizedItemType>
 */
class SeizedItemTypeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SeizedItemType::class);
    }
}
