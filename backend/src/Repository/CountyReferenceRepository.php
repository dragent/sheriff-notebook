<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\CountyReference;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CountyReference>
 */
class CountyReferenceRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CountyReference::class);
    }

    /**
     * Retourne l'unique enregistrement de référence (singleton). Le crée s'il n'existe pas.
     */
    public function getSingleton(): CountyReference
    {
        $ref = $this->findOneBy([], ['updatedAt' => 'DESC']);
        if ($ref instanceof CountyReference) {
            return $ref;
        }
        $ref = new CountyReference();
        $this->getEntityManager()->persist($ref);
        $this->getEntityManager()->flush();

        return $ref;
    }
}
