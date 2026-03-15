<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\User;
use App\Repository\CountyReferenceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/reference')]
final class CountyReferenceController
{
    private const ALLOWED_GRADES = ['Sheriff de comté', 'Sheriff Adjoint', 'Sheriff adjoint'];

    public function __construct(
        private readonly CountyReferenceRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
    ) {
    }

    #[Route('', name: 'api_reference_get', methods: ['GET'])]
    public function get(#[CurrentUser] User $user): JsonResponse
    {
        $ref = $this->repository->getSingleton();
        $grade = $user->getGrade();
        $canEdit = \in_array($grade, self::ALLOWED_GRADES, true);

        return new JsonResponse([
            'data' => $ref->getData(),
            'updatedAt' => $ref->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'canEdit' => $canEdit,
        ]);
    }

    #[Route('', name: 'api_reference_put', methods: ['PUT'])]
    public function put(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $grade = $user->getGrade();
        if (!\in_array($grade, self::ALLOWED_GRADES, true)) {
            return new JsonResponse(
                ['error' => 'Seuls le Sheriff de comté et l\'Adjoint peuvent modifier les informations sur l\'image.'],
                403
            );
        }

        $rawContent = (string) $request->getContent();
        $body = json_decode($rawContent, true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $this->logger->info('reference.put: body received', [
            'content_length' => \strlen($rawContent),
            'fusil_count' => \is_array($body['fusil'] ?? null) ? \count($body['fusil']) : null,
            'carabine_count' => \is_array($body['carabine'] ?? null) ? \count($body['carabine']) : null,
        ]);

        $ref = $this->repository->getSingleton();
        $ref->setData($body);

        // Doctrine does not detect changes on JSON columns; must schedule update explicitly.
        $this->entityManager->getUnitOfWork()->scheduleForUpdate($ref);
        $this->logger->info('reference.put: flush start', ['id' => $ref->getId()->toRfc4122()]);
        $this->entityManager->flush();
        $this->logger->info('reference.put: flush ok', [
            'id' => $ref->getId()->toRfc4122(),
            'updatedAt' => $ref->getUpdatedAt()->format(\DateTimeInterface::ATOM),
            'fusil_count_after' => \count($ref->getData()['fusil'] ?? []),
        ]);

        return new JsonResponse([
            'data' => $ref->getData(),
            'updatedAt' => $ref->getUpdatedAt()->format(\DateTimeInterface::ATOM),
        ]);
    }
}
