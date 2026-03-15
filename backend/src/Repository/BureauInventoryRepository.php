<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BureauInventory;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BureauInventory>
 */
class BureauInventoryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BureauInventory::class);
    }

    public function findOneByCategoryAndName(string $category, string $name): ?BureauInventory
    {
        return $this->findOneBy(
            ['category' => $category, 'name' => $name],
            ['name' => 'ASC']
        );
    }

    /**
     * @return BureauInventory[]
     */
    public function findAllOrderedByCategoryAndName(): array
    {
        return $this->findBy(
            [],
            ['category' => 'ASC', 'name' => 'ASC']
        );
    }
}
