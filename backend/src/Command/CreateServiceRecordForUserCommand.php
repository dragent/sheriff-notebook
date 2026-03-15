<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\ServiceRecord;
use App\Entity\User;
use App\Repository\ServiceRecordRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Uid\Uuid;

/** Crée une fiche de service vide reliée à un user (par son UUID). */
#[AsCommand(
    name: 'app:create-service-record-for-user',
    description: 'Crée une fiche de service vide reliée à un utilisateur (UUID).',
)]
final class CreateServiceRecordForUserCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly ServiceRecordRepository $serviceRecordRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument(
            'user-id',
            InputArgument::REQUIRED,
            'UUID de l\'utilisateur (ex: 019ccab5-d06d-7d7e-9471-9a79e54b53dd)',
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $userId = trim((string) $input->getArgument('user-id'));

        try {
            $uuid = Uuid::fromString($userId);
        } catch (\ValueError) {
            $io->error('UUID invalide: ' . $userId);
            return Command::FAILURE;
        }

        $user = $this->userRepository->find($uuid);
        if (!$user instanceof User) {
            $io->error('Utilisateur non trouvé: ' . $userId);
            return Command::FAILURE;
        }

        $existing = $this->serviceRecordRepository->findOneByUser($user);
        if ($existing instanceof ServiceRecord) {
            $io->warning(sprintf(
                'L\'utilisateur "%s" a déjà une fiche de service (id: %s).',
                $user->getUsername(),
                $existing->getId()->toRfc4122(),
            ));
            return Command::SUCCESS;
        }

        $record = new ServiceRecord($user->getUsername());
        $record->setUser($user);
        $user->setServiceRecord($record);
        $this->entityManager->persist($record);
        $this->entityManager->flush();

        $io->success(sprintf(
            'Fiche de service créée pour "%s" (user %s). Id fiche: %s',
            $user->getUsername(),
            $user->getId()->toRfc4122(),
            $record->getId()->toRfc4122(),
        ));
        return Command::SUCCESS;
    }
}
