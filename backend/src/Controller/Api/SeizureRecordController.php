<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\SeizureRecordCreateDto;
use App\Entity\SeizureRecord;
use App\Entity\User;
use App\Repository\SeizureRecordRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/saisies')]
final class SeizureRecordController
{
    public function __construct(
        private readonly SeizureRecordRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('', name: 'api_saisies_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), User::getSheriffGradeValues(), true)) {
            return new JsonResponse(
                ['error' => 'Accès réservé aux shérifs.'],
                403
            );
        }

        $records = $this->repository->findAllOrderedByDateDesc();
        $items = [];
        foreach ($records as $r) {
            $items[] = $this->recordToArray($r);
        }

        return new JsonResponse(['data' => $items]);
    }

    #[Route('', name: 'api_saisies_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), User::getSheriffGradeValues(), true)) {
            return new JsonResponse(
                ['error' => 'Seuls les shérifs peuvent enregistrer des saisies.'],
                403
            );
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $dto = SeizureRecordCreateDto::fromArray($body);
        $violations = $this->validator->validate($dto);

        if ($violations->count() > 0) {
            $first = $violations->get(0);

            return new JsonResponse([
                'error' => $first->getMessage(),
                'field' => $first->getPropertyPath(),
            ], 400);
        }

        $record = new SeizureRecord(
            $dto->type,
            $dto->date,
            $dto->sheriff,
            $dto->quantity,
            $dto->type === SeizureRecord::TYPE_ITEM ? $dto->itemName : null,
            $dto->type === SeizureRecord::TYPE_WEAPON ? $dto->weaponModel : null,
            $dto->serialNumber,
            $dto->possessedBy,
            $dto->notes,
        );
        $this->entityManager->persist($record);
        $this->entityManager->flush();

        return new JsonResponse($this->recordToArray($record), 201);
    }

    /** @return array<string, mixed> */
    private function recordToArray(SeizureRecord $r): array
    {
        return [
            'id' => $r->getId()->toRfc4122(),
            'type' => $r->getType(),
            'date' => $r->getDate(),
            'sheriff' => $r->getSheriff(),
            'quantity' => $r->getQuantity(),
            'itemName' => $r->getItemName(),
            'weaponModel' => $r->getWeaponModel(),
            'serialNumber' => $r->getSerialNumber(),
            'possessedBy' => $r->getPossessedBy(),
            'notes' => $r->getNotes(),
        ];
    }
}
