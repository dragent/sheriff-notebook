<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Repository\UserRepository;
use App\Service\DiscordGuildMemberResolver;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/recruits')]
final class RecruitController
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
    ) {
    }

    /** Guild members without excluded recruitment roles (Deputy…Sheriff de comté + Sheriff Papier). */
    #[Route('', name: 'api_recruits_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $list = $this->buildListFromDiscord();

        usort($list, static fn (array $a, array $b): int => strcasecmp($a['username'], $b['username']));

        return new JsonResponse($list);
    }

    /**
     * @return list<array{id: string, username: string, avatarUrl: ?string, grade: ?string, connectedToSite: bool}>
     */
    private function buildListFromDiscord(): array
    {
        $excludedRoleIds = $this->discordGuildMemberResolver->getRecruitmentExcludedRoleIds();
        $members = $this->discordGuildMemberResolver->listGuildMembersWithoutRoles($excludedRoleIds);
        if ([] === $members) {
            return [];
        }

        // Replace the per-member findOneBy() (N+1 against the users table) by a single IN (...) query
        // indexed by discordId so the controller scales linearly with the guild size.
        $discordIds = array_values(array_filter(
            array_map(static fn (array $m): string => (string) ($m['discord_id'] ?? ''), $members),
            static fn (string $id): bool => '' !== $id,
        ));
        $usersByDiscordId = [];
        if ([] !== $discordIds) {
            $loaded = $this->userRepository->createQueryBuilder('u')
                ->andWhere('u.discordId IN (:ids)')
                ->setParameter('ids', $discordIds)
                ->getQuery()
                ->getResult();
            foreach ($loaded as $u) {
                $usersByDiscordId[$u->getDiscordId()] = $u;
            }
        }

        $list = [];
        foreach ($members as $m) {
            $discordId = (string) ($m['discord_id'] ?? '');
            $user = $usersByDiscordId[$discordId] ?? null;
            if (null !== $user) {
                $list[] = [
                    'id' => $user->getId()->toRfc4122(),
                    'username' => $user->getUsername(),
                    'avatarUrl' => $user->getAvatarUrl(),
                    'grade' => $user->getGrade(),
                    'connectedToSite' => true,
                ];
            } else {
                $list[] = [
                    'id' => 'discord-'.$discordId,
                    'username' => $m['username'],
                    'avatarUrl' => $m['avatar_url'],
                    'grade' => null,
                    'connectedToSite' => false,
                ];
            }
        }

        return $list;
    }
}
