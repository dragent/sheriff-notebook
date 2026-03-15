<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\UserRepository;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\Console\Helper\Table;

#[AsCommand(
    name: 'app:users:list',
    description: 'Affiche tous les utilisateurs de la table user en base de données.',
)]
final class ListUsersCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $users = $this->userRepository->findBy([], ['username' => 'ASC']);

        if ($users === []) {
            $io->warning('Aucun utilisateur en base.');
            return Command::SUCCESS;
        }

        $rows = [];
        foreach ($users as $u) {
            $rows[] = [
                $u->getId()->toRfc4122(),
                $u->getDiscordId(),
                $u->getUsername(),
                $u->getAvatarUrl() ?? '—',
                $u->getGrade() ?? '—',
                implode(', ', $u->getRoles()),
                $u->getCreatedAt()->format('Y-m-d H:i'),
                $u->getUpdatedAt()->format('Y-m-d H:i'),
            ];
        }

        $table = new Table($output);
        $table->setHeaders([
            'ID', 'Discord ID', 'Username', 'Avatar URL', 'Grade', 'Roles', 'Créé le', 'MAJ le',
        ]);
        $table->setRows($rows);
        $table->render();

        $io->success(sprintf('%d utilisateur(s) affiché(s).', count($users)));
        return Command::SUCCESS;
    }
}
