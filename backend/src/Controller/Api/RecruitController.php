<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
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

    /** Guild members without a Deputy…Sheriff de comté Discord role (API only; no DB fallback). */
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
        $sheriffGradeRoleIds = $this->discordGuildMemberResolver->getSheriffRoleIds();
        $members = $this->discordGuildMemberResolver->listGuildMembersWithoutRoles($sheriffGradeRoleIds);

        $sheriffGrades = User::getSheriffGradeValues();
        $list = [];
        foreach ($members as $m) {
            $user = $this->userRepository->findOneBy(['discordId' => $m['discord_id']]);
            if ($user !== null) {
                $grade = $user->getGrade();
                if ($grade !== null && $grade !== '' && \in_array($grade, $sheriffGrades, true)) {
                    continue;
                }
                $list[] = [
                    'id' => $user->getId()->toRfc4122(),
                    'username' => $user->getUsername(),
                    'avatarUrl' => $user->getAvatarUrl(),
                    'grade' => $user->getGrade(),
                    'connectedToSite' => true,
                ];
            } else {
                $list[] = [
                    'id' => 'discord-' . $m['discord_id'],
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
