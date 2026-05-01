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

    /**
     * Aggregated destruction quantities by stock key (same folding rules as DestructionRecordController).
     * Single round-trip: loads JSON lines only, not full entities.
     *
     * @return array<string, int>
     */
    public function getDestroyedQuantityByKey(): array
    {
        $rows = $this->getEntityManager()->getConnection()->fetchAllAssociative(
            'SELECT lines FROM destruction_record'
        );
        $destroyed = [];
        foreach ($rows as $row) {
            $raw = $row['lines'] ?? '[]';
            $lines = \is_string($raw) ? json_decode($raw, true) : null;
            if (!\is_array($lines)) {
                continue;
            }
            foreach ($lines as $line) {
                if (!\is_array($line)) {
                    continue;
                }
                $name = isset($line['destruction']) && \is_string($line['destruction']) ? trim($line['destruction']) : '';
                if ('' === $name) {
                    continue;
                }
                $qte = isset($line['qte']) && is_numeric($line['qte']) ? (int) $line['qte'] : 0;
                $destroyed[$name] = ($destroyed[$name] ?? 0) + $qte;
                $pipe = strpos($name, '|');
                if (false !== $pipe) {
                    $prefix = substr($name, 0, $pipe);
                    if ('' !== $prefix) {
                        $destroyed[$prefix] = ($destroyed[$prefix] ?? 0) + $qte;
                    }
                }
            }
        }

        return $destroyed;
    }
}
