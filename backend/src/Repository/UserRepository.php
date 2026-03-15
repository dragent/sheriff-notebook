<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Utilisateurs sans grade sheriff affiché — pour le recrutement.
     * Critère : grade NULL, vide, ou tout grade hors liste sheriff (ex. Civil).
     * On se base uniquement sur le champ grade (pas la colonne roles) pour que
     * les personnes avec un grade civil/null apparaissent même si roles contient un ancien rôle.
     *
     * @return list<User>
     */
    public function findWithoutGrade(): array
    {
        $sheriffGrades = User::getSheriffGradeValues();
        $qb = $this->createQueryBuilder('u')
            ->where('u.grade IS NULL OR u.grade = :empty OR u.grade NOT IN (:sheriffGrades)')
            ->setParameter('empty', '')
            ->setParameter('sheriffGrades', $sheriffGrades)
            ->orderBy('u.username', 'ASC');

        return $qb->getQuery()->getResult();
    }
}

