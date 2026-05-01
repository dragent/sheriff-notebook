<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsCommand(
    name: 'app:promote-sheriff-comte',
    description: 'Promouvoir un utilisateur en Sheriff de comté (par Discord ID). À utiliser pour le premier compte admin.',
)]
final class PromoteSheriffComteCommand extends Command
{
    private const GRADE = 'Sheriff de comté';

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        #[Autowire(param: 'env(SHERIFF_COMTE_DISCORD_ID)')]
        private readonly ?string $defaultDiscordId = null,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument(
            'discord-id',
            InputArgument::OPTIONAL,
            'Discord ID de l\'utilisateur à promouvoir (sinon utilise SHERIFF_COMTE_DISCORD_ID du .env)',
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $discordId = $input->getArgument('discord-id') ?? $this->defaultDiscordId;
        $discordId = null !== $discordId ? trim($discordId) : null;

        if (null === $discordId || '' === $discordId) {
            $io->error([
                'Discord ID manquant.',
                'Soit : php bin/console app:promote-sheriff-comte <ton-discord-id>',
                'Soit : définis SHERIFF_COMTE_DISCORD_ID dans ton .env.local puis relance la commande sans argument.',
            ]);

            return Command::FAILURE;
        }

        $user = $this->userRepository->findOneBy(['discordId' => $discordId]);

        if (!$user instanceof User) {
            $io->warning([
                \sprintf('Aucun compte trouvé pour le Discord ID "%s".', $discordId),
                'Connecte-toi une fois au site avec Discord pour créer ton compte, puis relance cette commande.',
            ]);

            return Command::FAILURE;
        }

        if (self::GRADE === $user->getGrade()) {
            $io->success(\sprintf('%s est déjà Sheriff de comté.', $user->getUsername()));

            return Command::SUCCESS;
        }

        $user->setGrade(self::GRADE);
        $this->entityManager->flush();

        $io->success(\sprintf('%s a été promu Sheriff de comté.', $user->getUsername()));

        return Command::SUCCESS;
    }
}
