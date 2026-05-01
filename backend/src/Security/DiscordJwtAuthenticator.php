<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\UserServiceRecordProvisioner;
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

    private string $jwtIssuer;

    private string $jwtAudience;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        string $jwtSecret,
        private readonly UserServiceRecordProvisioner $userServiceRecordProvisioner,
        string $jwtIssuer = '',
        string $jwtAudience = '',
    ) {
        $this->jwtSecret = trim($jwtSecret);
        $this->jwtIssuer = trim($jwtIssuer);
        $this->jwtAudience = trim($jwtAudience);
    }

    private static function getTokenFromRequest(Request $request): string
    {
        $auth = $request->headers->get('Authorization');
        if (null !== $auth && str_starts_with($auth, 'Bearer ')) {
            return trim(substr($auth, 7));
        }
        $xToken = $request->headers->get('X-Bearer-Token');

        return null !== $xToken ? trim($xToken) : '';
    }

    public function supports(Request $request): ?bool
    {
        return '' !== self::getTokenFromRequest($request);
    }

    public function authenticate(Request $request): SelfValidatingPassport
    {
        if ('' === $this->jwtSecret) {
            throw new CustomUserMessageAuthenticationException('Server misconfigured: missing BACKEND_JWT_SECRET.');
        }

        $token = self::getTokenFromRequest($request);
        if ('' === $token) {
            throw new CustomUserMessageAuthenticationException('Missing bearer token.');
        }

        try {
            /** @var object{sub?:string,username?:string,avatarUrl?:string,iss?:string,aud?:string|list<string>} $payload */
            $payload = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
        } catch (\Throwable $e) {
            throw new CustomUserMessageAuthenticationException('Invalid token.');
        }

        if ('' !== $this->jwtIssuer) {
            $iss = isset($payload->iss) ? trim((string) $payload->iss) : '';
            if ($iss !== $this->jwtIssuer) {
                throw new CustomUserMessageAuthenticationException('Invalid token issuer.');
            }
        }

        if ('' !== $this->jwtAudience) {
            if (!$this->tokenHasAudience($payload->aud ?? null, $this->jwtAudience)) {
                throw new CustomUserMessageAuthenticationException('Invalid token audience.');
            }
        }

        $discordId = isset($payload->sub) ? trim((string) $payload->sub) : '';
        $username = isset($payload->username) ? trim((string) $payload->username) : '';
        $avatarUrl = isset($payload->avatarUrl) ? trim((string) $payload->avatarUrl) : null;
        if ('' === $avatarUrl) {
            $avatarUrl = null;
        }

        if ('' === $discordId || '' === $username) {
            throw new CustomUserMessageAuthenticationException('Invalid token payload.');
        }

        // Guild nickname refresh is deferred to GET /api/me (see MeController) to avoid one Discord HTTP call per API request.

        return new SelfValidatingPassport(
            new UserBadge($discordId, function (string $userIdentifier) use ($discordId, $username, $avatarUrl): UserInterface {
                $user = $this->userRepository->findOneBy(['discordId' => $userIdentifier]);
                if (!$user instanceof User) {
                    $user = new User($discordId, $username);
                    $user->setAvatarUrl($avatarUrl);
                    $this->entityManager->persist($user);
                    $this->userServiceRecordProvisioner->provisionForNewUser($user);
                    $this->entityManager->flush();

                    return $user;
                }

                $changed = false;
                if ($user->getUsername() !== $username) {
                    $user->setUsername($username);
                    $changed = true;
                }
                if ($user->getAvatarUrl() !== $avatarUrl) {
                    $user->setAvatarUrl($avatarUrl);
                    $changed = true;
                }
                if ($changed) {
                    $this->entityManager->flush();
                }

                return $user;
            }),
        );
    }

    private function tokenHasAudience(mixed $aud, string $expected): bool
    {
        if (\is_string($aud)) {
            return trim($aud) === $expected;
        }
        if (\is_array($aud)) {
            foreach ($aud as $item) {
                if (\is_string($item) && trim($item) === $expected) {
                    return true;
                }
            }
        }

        return false;
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
