<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\SeizureRecord;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SeizureRecord>
 */
class SeizureRecordRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SeizureRecord::class);
    }

    /** @return list<SeizureRecord> */
    public function findAllOrderedByDateDesc(): array
    {
        return $this->createQueryBuilder('s')
            ->orderBy('s.date', 'DESC')
            ->addOrderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /** Saisies item par nom, plus anciennes d'abord (pour consommer en FIFO). */
    /** @return list<SeizureRecord> */
    public function findByItemNameOrderedByDateAsc(string $itemName): array
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.type = :type')
            ->andWhere('s.itemName = :name')
            ->setParameter('type', SeizureRecord::TYPE_ITEM)
            ->setParameter('name', $itemName)
            ->orderBy('s.date', 'ASC')
            ->addOrderBy('s.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /** Saisies arme par modèle (et optionnellement n° de série), plus anciennes d'abord. */
    /** @return list<SeizureRecord> */
    public function findByWeaponModelOrderedByDateAsc(string $weaponModel, ?string $serialNumber = null): array
    {
        $qb = $this->createQueryBuilder('s')
            ->andWhere('s.type = :type')
            ->andWhere('s.weaponModel = :model')
            ->setParameter('type', SeizureRecord::TYPE_WEAPON)
            ->setParameter('model', $weaponModel)
            ->orderBy('s.date', 'ASC')
            ->addOrderBy('s.createdAt', 'ASC');
        if (null !== $serialNumber && '' !== $serialNumber) {
            $qb->andWhere('s.serialNumber = :serial')
                ->setParameter('serial', $serialNumber);
        }

        return $qb->getQuery()->getResult();
    }

    /** Saisies cash, plus anciennes d'abord (FIFO sur les montants). */
    /** @return list<SeizureRecord> */
    public function findCashOrderedByDateAsc(): array
    {
        return $this->createQueryBuilder('s')
            ->andWhere('s.type = :type')
            ->setParameter('type', SeizureRecord::TYPE_CASH)
            ->orderBy('s.date', 'ASC')
            ->addOrderBy('s.createdAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Aggregated seized quantities indexed by stock-key:
     *   - cash type → SeizureRecord::DESTRUCTION_LINE_KEY_CASH
     *   - item type → item name
     *   - weapon type → "model" AND "model|serial" (when serial known)
     *
     * Replaces an in-memory loop over every seizure row with a single SQL aggregation.
     *
     * @return array<string, float|int>
     */
    public function getSeizedQuantityByKey(): array
    {
        $rows = $this->createQueryBuilder('s')
            ->select('s.type AS type, s.itemName AS itemName, s.weaponModel AS weaponModel, s.serialNumber AS serialNumber, SUM(s.quantity) AS qty')
            ->where('s.cancelledAt IS NULL')
            ->groupBy('s.type, s.itemName, s.weaponModel, s.serialNumber')
            ->getQuery()
            ->getArrayResult();

        $out = [];
        foreach ($rows as $row) {
            $qtyRaw = $row['qty'];
            $qty = \is_numeric($qtyRaw) ? (float) $qtyRaw : 0.0;
            if ($qty <= 0) {
                continue;
            }
            switch ($row['type']) {
                case SeizureRecord::TYPE_CASH:
                    $key = SeizureRecord::DESTRUCTION_LINE_KEY_CASH;
                    $dollars = round($qty / 100.0, 2);
                    $out[$key] = ($out[$key] ?? 0.0) + $dollars;
                    break;
                case SeizureRecord::TYPE_ITEM:
                    $name = (string) ($row['itemName'] ?? '');
                    if ('' !== $name) {
                        $out[$name] = (int) (($out[$name] ?? 0) + $qty);
                    }
                    break;
                case SeizureRecord::TYPE_WEAPON:
                    $model = (string) ($row['weaponModel'] ?? '');
                    if ('' === $model) {
                        break;
                    }
                    $out[$model] = (int) (($out[$model] ?? 0) + $qty);
                    $serial = (string) ($row['serialNumber'] ?? '');
                    if ('' !== $serial) {
                        $compositeKey = $model.'|'.$serial;
                        $out[$compositeKey] = (int) (($out[$compositeKey] ?? 0) + $qty);
                    }
                    break;
            }
        }

        return $out;
    }
}
