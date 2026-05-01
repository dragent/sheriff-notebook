<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\DiscordGuildMemberResolver;
use Symfony\Component\DependencyInjection\Attribute\When;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Diagnostic de la connexion Discord (guild / pseudo serveur).
 *
 * Defense-in-depth: the #[When('dev')] attribute removes this controller from the service
 * container outside dev, so the route is not registered at all in prod/staging. The runtime
 * appEnv check is kept as a safety net for misconfigured pipelines.
 */
#[When('dev')]
final class DiscordDebugController
{
    public function __construct(
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
        /** Same ID as used for /api/recruits member listing (DiscordGuildMemberResolver). */
        private readonly string $guildId,
        private readonly string $appEnv = 'prod',
    ) {
    }

    #[Route(
        '/api/debug/discord',
        name: 'api_debug_discord',
        methods: ['GET'],
        condition: "env('APP_ENV') === 'dev'",
    )]
    public function __invoke(): JsonResponse
    {
        if ('dev' !== $this->appEnv) {
            return new JsonResponse(['error' => 'Disponible uniquement en environnement dev.'], 404);
        }

        $result = $this->discordGuildMemberResolver->pingGuild();

        return new JsonResponse([
            'connected' => $result['ok'],
            'guildId' => '' !== $this->guildId ? $this->guildId : null,
            'guildName' => $result['guildName'],
            'requiredPrivilegedIntents' => $this->discordGuildMemberResolver->getRequiredPrivilegedIntents(),
            'message' => $result['ok']
                ? 'Le backend peut accéder au serveur Discord. Les pseudos du serveur (nicknames) seront utilisés. Le recrutement liste les membres de ce même serveur (sans grade Deputy…Sheriff de comté).'
                : $result['error'],
        ]);
    }
}
