<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:planning-snapshots:prune',
    description: 'Deletes service planning snapshots older than the given retention window.',
)]
final class PlanningSnapshotsPruneCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption(
            'older-than-days',
            null,
            InputOption::VALUE_REQUIRED,
            'Delete rows with createdAt older than this many days.',
            '90',
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $days = (int) $input->getOption('older-than-days');
        if ($days < 1) {
            $io->error('Option older-than-days must be >= 1.');

            return Command::FAILURE;
        }

        $cutoff = new \DateTimeImmutable("-{$days} days");
        $deleted = (int) $this->entityManager->createQuery(
            'DELETE FROM App\Entity\ServicePlanningSnapshot s WHERE s.createdAt < :cutoff',
        )->setParameter('cutoff', $cutoff)->execute();

        $io->success(\sprintf('Deleted %d planning snapshot(s) older than %d days (cutoff %s).', $deleted, $days, $cutoff->format('Y-m-d H:i:s')));

        return Command::SUCCESS;
    }
}
