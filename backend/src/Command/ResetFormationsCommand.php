<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\ServiceRecord;
use App\Repository\ServiceRecordRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Met à false toutes les formations (leadPatrol, shooting, etc.) pour toutes les fiches de service.
 */
#[AsCommand(
    name: 'app:reset-formations',
    description: 'Réinitialise toutes les formations (booleans) à false pour toutes les fiches de service.',
)]
final class ResetFormationsCommand extends Command
{
    public function __construct(
        private readonly ServiceRecordRepository $serviceRecordRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $records = $this->serviceRecordRepository->findAll();
        if ($records === []) {
            $io->warning('Aucune fiche de service trouvée. Rien à réinitialiser.');
            return Command::SUCCESS;
        }

        $count = 0;
        foreach ($records as $record) {
            if (!$record instanceof ServiceRecord) {
                continue;
            }

            $record->setLeadPatrol(false);
            $record->setShooting(false);
            $record->setInterventions(false);
            $record->setRobberies(false);
            $record->setSales(false);
            $record->setCensus(false);
            $record->setRegisterSeizure(false);
            $record->setComplaints(false);
            $record->setReports(false);
            $record->setSisika(false);
            $record->setWantedRequest(false);

            ++$count;
        }

        $this->entityManager->flush();

        $io->success(sprintf('Formations réinitialisées à false pour %d fiche(s) de service.', $count));

        return Command::SUCCESS;
    }
}

