<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ComptaEntry;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ComptaEntry>
 */
class ComptaEntryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ComptaEntry::class);
    }

    /** @return list<ComptaEntry> */
    public function findAllOrderedByDateDesc(): array
    {
        return $this->createQueryBuilder('c')
            ->orderBy('c.date', 'DESC')
            ->addOrderBy('c.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** Current balance (sum of entries minus sum of exits); single aggregated query to avoid loading all rows. */
    public function getCurrentSolde(): float
    {
        $qb = $this->createQueryBuilder('c')
            ->select('COALESCE(SUM(CASE WHEN c.type = :entree THEN c.amount ELSE -c.amount END), 0) AS solde')
            ->setParameter('entree', ComptaEntry::TYPE_ENTREE);

        /** @var string|float|int|null $raw */
        $raw = $qb->getQuery()->getSingleScalarResult();

        return (float) $raw;
    }
}
