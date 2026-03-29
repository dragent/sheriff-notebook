<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ComptaEntry;
use App\Util\ComptaAmountParser;
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

    /**
     * Current balance (entries minus exits). Parsed in PHP so legacy display formats ($, spaces, commas) match list totals.
     */
    public function getCurrentSolde(): float
    {
        $total = 0.0;
        foreach ($this->findAll() as $e) {
            $amount = ComptaAmountParser::parseToFloat($e->getAmount());
            $total += $e->getType() === ComptaEntry::TYPE_ENTREE ? $amount : -$amount;
        }

        return $total;
    }
}
