<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\ServiceRecordRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Lie les fiches de service existantes (sans user_id) aux users dont le username correspond au name.
 * À lancer une fois après la migration "one service record per user".
 */
#[AsCommand(
    name: 'app:link-service-records-to-users',
    description: 'Lie les service records sans user aux users (par nom). À exécuter après la migration user_id.',
)]
final class LinkServiceRecordsToUsersCommand extends Command
{
    public function __construct(
        private readonly ServiceRecordRepository $serviceRecordRepository,
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $records = $this->serviceRecordRepository->findBy(['user' => null], ['name' => 'ASC']);
        $linked = 0;

        foreach ($records as $record) {
            $name = trim($record->getName());
            if ('' === $name) {
                continue;
            }

            $user = $this->userRepository->findOneBy(['username' => $name]);
            if (null === $user) {
                $users = $this->userRepository->findBy([], ['username' => 'ASC']);
                foreach ($users as $u) {
                    if (0 === strcasecmp(trim($u->getUsername()), $name)) {
                        $user = $u;
                        break;
                    }
                }
            }

            if (null !== $user && null === $user->getServiceRecord()) {
                $record->setUser($user);
                $user->setServiceRecord($record);
                ++$linked;
                $io->text(\sprintf('  Lié "%s" → user %s', $name, $user->getUsername()));
            }
        }

        $this->entityManager->flush();
        $io->success(\sprintf('%d fiche(s) liée(s) à un user.', $linked));

        return Command::SUCCESS;
    }
}
