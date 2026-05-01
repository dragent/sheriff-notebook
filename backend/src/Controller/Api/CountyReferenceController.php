<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Domain\Grade;
use App\Domain\GradeHierarchy;
use App\Dto\CountyReferencePutDto;
use App\Entity\User;
use App\Repository\CountyReferenceRepository;
use App\Security\Voter\ReferenceVoter;
use App\Service\ReferenceDataRenamePropagator;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\OptimisticLockException;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;

#[Route('/api/reference')]
final class CountyReferenceController
{
    public function __construct(
        private readonly CountyReferenceRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
        private readonly ReferenceDataRenamePropagator $referenceRenamePropagator,
        #[Autowire(service: 'limiter.api_reference_write')]
        private readonly RateLimiterFactory $referenceWriteLimiter,
    ) {
    }

    #[Route('', name: 'api_reference_get', methods: ['GET'])]
    public function get(#[CurrentUser] User $user): JsonResponse
    {
        $ref = $this->repository->getSingleton();
        $canEdit = GradeHierarchy::canManageReference(Grade::tryFromLabel($user->getGrade()));

        return new JsonResponse([
            'data' => $ref->getData(),
            'updatedAt' => $ref->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'version' => $ref->getVersion(),
            'canEdit' => $canEdit,
        ]);
    }

    #[Route('', name: 'api_reference_put', methods: ['PUT'])]
    #[IsGranted(ReferenceVoter::MANAGE, message: 'Seuls le Sheriff de comté et l\'Adjoint peuvent modifier les informations sur l\'image.')]
    public function put(
        Request $request,
        #[MapRequestPayload(
            acceptFormat: 'json',
            validationFailedStatusCode: Response::HTTP_BAD_REQUEST,
            serializationContext: [
                AbstractNormalizer::ALLOW_EXTRA_ATTRIBUTES => true,
            ],
        )]
        CountyReferencePutDto $dto,
    ): JsonResponse {
        if (!$this->referenceWriteLimiter->create((string) ($request->getClientIp() ?? 'anon'))->consume()->isAccepted()) {
            return new JsonResponse(['error' => 'Trop de mises à jour du référentiel. Réessayez dans une minute.'], 429);
        }

        $expectedVersion = self::extractExpectedVersion($request, $dto);
        $body = $dto->toSetDataArray();

        $rawContent = (string) $request->getContent();
        $this->logger->info('reference.put: body received', [
            'content_length' => \strlen($rawContent),
            'fusil_count' => \is_array($body['fusil'] ?? null) ? \count($body['fusil']) : null,
            'carabine_count' => \is_array($body['carabine'] ?? null) ? \count($body['carabine']) : null,
            'expected_version' => $expectedVersion,
        ]);

        try {
            $result = $this->entityManager->wrapInTransaction(function () use ($body, $expectedVersion): array {
                $ref = $this->repository->getSingleton();

                if (null !== $expectedVersion && $ref->getVersion() !== $expectedVersion) {
                    throw new OptimisticLockException(\sprintf('Version mismatch: expected %d, got %d.', $expectedVersion, $ref->getVersion()), $ref);
                }

                $before = $ref->getData();
                $ref->setData($body);
                $after = $ref->getData();
                $propagation = $this->referenceRenamePropagator->propagate($before, $after);

                $this->entityManager->getUnitOfWork()->scheduleForUpdate($ref);
                $this->logger->info('reference.put: flush start', [
                    'id' => $ref->getId()->toRfc4122(),
                    'propagation' => $propagation,
                ]);
                $this->entityManager->flush();
                $this->logger->info('reference.put: flush ok', [
                    'id' => $ref->getId()->toRfc4122(),
                    'updatedAt' => $ref->getUpdatedAt()->format(\DateTimeInterface::ATOM),
                    'version' => $ref->getVersion(),
                    'fusil_count_after' => \count($ref->getData()['fusil'] ?? []),
                    'propagation' => $propagation,
                ]);

                return [
                    'data' => $ref->getData(),
                    'updatedAt' => $ref->getUpdatedAt()->format(\DateTimeInterface::ATOM),
                    'version' => $ref->getVersion(),
                    'propagation' => $propagation,
                ];
            });
        } catch (OptimisticLockException $e) {
            $this->logger->warning('reference.put: concurrent edit detected', ['error' => $e->getMessage()]);
            $current = $this->repository->getSingleton();

            return new JsonResponse([
                'error' => 'Le référentiel a été modifié entre-temps. Rechargez la page et fusionnez vos modifications.',
                'current' => [
                    'data' => $current->getData(),
                    'updatedAt' => $current->getUpdatedAt()->format(\DateTimeInterface::ATOM),
                    'version' => $current->getVersion(),
                ],
            ], 409);
        }

        return new JsonResponse($result);
    }

    /**
     * Reads the optional optimistic-lock token from either the `If-Match` header (preferred)
     * or a `__version` field embedded in the JSON body.
     */
    private static function extractExpectedVersion(Request $request, CountyReferencePutDto $dto): ?int
    {
        $headerValue = $request->headers->get('If-Match');
        if (null !== $headerValue) {
            $stripped = trim($headerValue, "\" \t");
            if ('' !== $stripped && ctype_digit($stripped)) {
                return (int) $stripped;
            }
        }

        if (null !== $dto->expectedVersion) {
            return $dto->expectedVersion;
        }

        return null;
    }
}
