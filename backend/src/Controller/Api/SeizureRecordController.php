<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\SeizureRecordCancelDto;
use App\Dto\SeizureRecordCreateDto;
use App\Dto\SeizureRecordUpdateDto;
use App\Entity\SeizureRecord;
use App\Entity\SeizureRecordEvent;
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
            $dto->type === SeizureRecord::TYPE_CASH ? null : $dto->serialNumber,
            $dto->possessedBy,
            $dto->notes,
        );
        $this->entityManager->persist($record);
        $this->entityManager->persist(new SeizureRecordEvent(
            $record,
            SeizureRecordEvent::ACTION_CREATE,
            $user->getUsername(),
        ));
        $this->entityManager->flush();

        return new JsonResponse($this->recordToArray($record), 201);
    }

    #[Route('/{id}', name: 'api_saisies_update', methods: ['PATCH'])]
    public function update(string $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), User::getSheriffGradeValues(), true)) {
            return new JsonResponse(['error' => 'Seuls les shérifs peuvent modifier des saisies.'], 403);
        }

        try {
            $uuid = \Symfony\Component\Uid\Uuid::fromString($id);
        } catch (\Throwable) {
            return new JsonResponse(['error' => 'Identifiant invalide.'], 400);
        }

        $record = $this->repository->find($uuid);
        if (!$record instanceof SeizureRecord) {
            return new JsonResponse(['error' => 'Saisie introuvable.'], 404);
        }
        if ($record->isCancelled()) {
            return new JsonResponse(['error' => 'Cette saisie est annulée et ne peut plus être modifiée.'], 409);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $dto = SeizureRecordUpdateDto::fromArray($body);
        $violations = $this->validator->validate($dto);
        if ($violations->count() > 0) {
            $first = $violations->get(0);
            return new JsonResponse([
                'error' => $first->getMessage(),
                'field' => $first->getPropertyPath(),
            ], 400);
        }

        // Refuse invalid fields depending on record type (avoid accidental type changes).
        if ($record->getType() === SeizureRecord::TYPE_ITEM && $dto->weaponModel !== null) {
            return new JsonResponse(['error' => 'weaponModel n\'est pas autorisé pour une saisie d\'item.'], 400);
        }
        if ($record->getType() === SeizureRecord::TYPE_WEAPON && $dto->itemName !== null) {
            return new JsonResponse(['error' => 'itemName n\'est pas autorisé pour une saisie d\'arme.'], 400);
        }
        if ($record->getType() === SeizureRecord::TYPE_CASH) {
            if ($dto->itemName !== null || $dto->weaponModel !== null || $dto->serialNumber !== null) {
                return new JsonResponse(['error' => 'Les champs item/arme/série ne sont pas autorisés pour une saisie de cash.'], 400);
            }
        }

        $before = $this->recordToArray($record);

        // Apply updates (only non-null fields).
        if ($dto->quantity !== null) $record->setQuantity($dto->quantity);
        if ($dto->date !== null) $record->setDate($dto->date);
        if ($dto->sheriff !== null) $record->setSheriff($dto->sheriff);
        if ($dto->itemName !== null) $record->setItemName($dto->itemName);
        if ($dto->weaponModel !== null) $record->setWeaponModel($dto->weaponModel);
        if ($dto->serialNumber !== null) $record->setSerialNumber($dto->serialNumber);
        if ($dto->possessedBy !== null) $record->setPossessedBy($dto->possessedBy);
        if ($dto->notes !== null) $record->setNotes($dto->notes);

        $after = $this->recordToArray($record);
        $diff = ['before' => $before, 'after' => $after];

        $this->entityManager->persist(new SeizureRecordEvent(
            $record,
            SeizureRecordEvent::ACTION_UPDATE,
            $user->getUsername(),
            $diff,
        ));

        $this->entityManager->flush();

        return new JsonResponse($after);
    }

    #[Route('/{id}/cancel', name: 'api_saisies_cancel', methods: ['POST'])]
    public function cancel(string $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!\in_array($user->getGrade(), User::getSheriffGradeValues(), true)) {
            return new JsonResponse(['error' => 'Seuls les shérifs peuvent annuler des saisies.'], 403);
        }

        try {
            $uuid = \Symfony\Component\Uid\Uuid::fromString($id);
        } catch (\Throwable) {
            return new JsonResponse(['error' => 'Identifiant invalide.'], 400);
        }

        $record = $this->repository->find($uuid);
        if (!$record instanceof SeizureRecord) {
            return new JsonResponse(['error' => 'Saisie introuvable.'], 404);
        }
        if ($record->isCancelled()) {
            return new JsonResponse(['error' => 'Cette saisie est déjà annulée.'], 409);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $dto = SeizureRecordCancelDto::fromArray($body);
        $violations = $this->validator->validate($dto);
        if ($violations->count() > 0) {
            $first = $violations->get(0);
            return new JsonResponse([
                'error' => $first->getMessage(),
                'field' => $first->getPropertyPath(),
            ], 400);
        }

        $before = $this->recordToArray($record);
        $record->cancel($dto->reason, $user->getUsername());
        $after = $this->recordToArray($record);

        $this->entityManager->persist(new SeizureRecordEvent(
            $record,
            SeizureRecordEvent::ACTION_CANCEL,
            $user->getUsername(),
            ['before' => $before, 'after' => $after],
            $dto->reason,
        ));
        $this->entityManager->flush();

        return new JsonResponse($after);
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
            'cancelledAt' => $r->getCancelledAt()?->format(\DateTimeInterface::ATOM),
            'cancelledReason' => $r->getCancelledReason(),
            'cancelledBy' => $r->getCancelledBy(),
        ];
    }
}
