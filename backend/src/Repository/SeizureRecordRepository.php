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
        if ($serialNumber !== null && $serialNumber !== '') {
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
}
