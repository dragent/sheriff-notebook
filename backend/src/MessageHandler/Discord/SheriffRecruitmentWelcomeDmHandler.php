<?php

declare(strict_types=1);

namespace App\MessageHandler\Discord;

use App\Message\Discord\SheriffRecruitmentWelcomeDmMessage;
use App\Service\DiscordDirectMessageNotifier;
use Psr\Log\LoggerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
final class SheriffRecruitmentWelcomeDmHandler
{
    private const SITE_URL = 'https://sheriffnotebook.dragent.fr';

    public function __construct(
        private readonly DiscordDirectMessageNotifier $notifier,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function __invoke(SheriffRecruitmentWelcomeDmMessage $message): void
    {
        $body = <<<EOT
Bureau du Shérif — Annesburg.

Par la présente, nous avons l'honneur de vous faire savoir que vous êtes désormais reçu(e) dans les rangs de ce poste.

Vous y tiendrez le grand-livre des affaires, les feuilles de service et la correspondance du bureau, à la manière d'un registre tenu au cordeau. L'adresse du secrétariat — unique guichet pour y consigner le tout — est :

EOT
            .self::SITE_URL;

        $err = $this->notifier->sendMessageToUser($message->getDiscordUserId(), $body);
        if (null !== $err) {
            $this->logger->warning('Discord recruitment welcome DM failed (async handler)', [
                'discordUserId' => $message->getDiscordUserId(),
                'error' => $err,
            ]);
        }
    }
}
