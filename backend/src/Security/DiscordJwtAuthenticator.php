<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\DiscordGuildMemberResolver;
use Doctrine\ORM\EntityManagerInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAuthenticationException;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

final class DiscordJwtAuthenticator extends AbstractAuthenticator implements AuthenticationEntryPointInterface
{
    private string $jwtSecret;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        string $jwtSecret,
        private readonly DiscordGuildMemberResolver $discordGuildMemberResolver,
    ) {
        $this->jwtSecret = trim($jwtSecret);
    }

    private static function getTokenFromRequest(Request $request): string
    {
        $auth = $request->headers->get('Authorization');
        if ($auth !== null && str_starts_with($auth, 'Bearer ')) {
            return trim(substr($auth, 7));
        }
        $xToken = $request->headers->get('X-Bearer-Token');
        return $xToken !== null ? trim($xToken) : '';
    }

    public function supports(Request $request): ?bool
    {
        return self::getTokenFromRequest($request) !== '';
    }

    public function authenticate(Request $request): SelfValidatingPassport
    {
        if ($this->jwtSecret === '') {
            throw new CustomUserMessageAuthenticationException('Server misconfigured: missing BACKEND_JWT_SECRET.');
        }

        $token = self::getTokenFromRequest($request);
        if ($token === '') {
            throw new CustomUserMessageAuthenticationException('Missing bearer token.');
        }

        try {
            /** @var object{sub?:string,username?:string,avatarUrl?:string} $payload */
            $payload = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
        } catch (\Throwable $e) {
            throw new CustomUserMessageAuthenticationException('Invalid token.');
        }

        $discordId = isset($payload->sub) ? trim((string) $payload->sub) : '';
        $username = isset($payload->username) ? trim((string) $payload->username) : '';
        $avatarUrl = isset($payload->avatarUrl) ? trim((string) $payload->avatarUrl) : null;
        if ($avatarUrl === '') {
            $avatarUrl = null;
        }

        if ($discordId === '' || $username === '') {
            throw new CustomUserMessageAuthenticationException('Invalid token payload.');
        }

        $serverDisplayName = $this->discordGuildMemberResolver->getServerDisplayName($discordId);
        // Prefer guild nickname; fall back to global username. Do not overwrite existing username when Discord API fails.
        $displayUsername = ($serverDisplayName !== null && $serverDisplayName !== '') ? $serverDisplayName : $username;

        return new SelfValidatingPassport(
            new UserBadge($discordId, function (string $userIdentifier) use ($discordId, $displayUsername, $serverDisplayName, $avatarUrl): UserInterface {
                $user = $this->userRepository->findOneBy(['discordId' => $userIdentifier]);
                if (!$user instanceof User) {
                    $user = new User($discordId, $displayUsername);
                    $user->setAvatarUrl($avatarUrl);
                    $this->entityManager->persist($user);
                    $this->entityManager->flush();
                    return $user;
                }

                if ($serverDisplayName !== null && $serverDisplayName !== '') {
                    $user->setUsername($serverDisplayName);
                }
                $user->setAvatarUrl($avatarUrl);
                $this->entityManager->flush();

                return $user;
            }),
        );
    }

    public function onAuthenticationSuccess(Request $request, \Symfony\Component\Security\Core\Authentication\Token\TokenInterface $token, string $firewallName): ?Response
    {
        return null;
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse(
            ['error' => $exception->getMessage()],
            Response::HTTP_UNAUTHORIZED,
        );
    }

    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse(['error' => 'Authentication required.'], Response::HTTP_UNAUTHORIZED);
    }
}
