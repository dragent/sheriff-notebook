<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\DiscordGuildMemberResolver;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Diagnostic de la connexion Discord (guild / pseudo serveur).
 * À utiliser en dev uniquement — en prod, désactiver ou protéger cette route.
 */
final class DiscordDebugController
{
    public function __construct(
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
        /** Same ID as used for /api/recruits member listing (DiscordGuildMemberResolver). */
        private readonly string $guildId,
        private readonly string $appEnv = 'prod',
    ) {
    }

    #[Route('/api/debug/discord', name: 'api_debug_discord', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        if ($this->appEnv !== 'dev') {
            return new JsonResponse(['error' => 'Disponible uniquement en environnement dev.'], 404);
        }

        $result = $this->discordGuildMemberResolver->pingGuild();

        return new JsonResponse([
            'connected' => $result['ok'],
            'guildId' => $this->guildId !== '' ? $this->guildId : null,
            'guildName' => $result['guildName'],
            'requiredPrivilegedIntents' => $this->discordGuildMemberResolver->getRequiredPrivilegedIntents(),
            'message' => $result['ok']
                ? 'Le backend peut accéder au serveur Discord. Les pseudos du serveur (nicknames) seront utilisés. Le recrutement liste les membres de ce même serveur (sans grade Deputy…Sheriff de comté).'
                : $result['error'],
        ]);
    }
}
