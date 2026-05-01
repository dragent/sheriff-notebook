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
use App\Security\Voter\SeizureVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/saisies')]
#[IsGranted(SeizureVoter::MANAGE, message: 'Accès réservé aux shérifs.')]
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
            SeizureRecord::TYPE_ITEM === $dto->type ? $dto->itemName : null,
            SeizureRecord::TYPE_WEAPON === $dto->type ? $dto->weaponModel : null,
            SeizureRecord::TYPE_CASH === $dto->type ? null : $dto->serialNumber,
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
        if (SeizureRecord::TYPE_ITEM === $record->getType() && null !== $dto->weaponModel) {
            return new JsonResponse(['error' => 'weaponModel n\'est pas autorisé pour une saisie d\'item.'], 400);
        }
        if (SeizureRecord::TYPE_WEAPON === $record->getType() && null !== $dto->itemName) {
            return new JsonResponse(['error' => 'itemName n\'est pas autorisé pour une saisie d\'arme.'], 400);
        }
        if (SeizureRecord::TYPE_CASH === $record->getType()) {
            if (null !== $dto->itemName || null !== $dto->weaponModel || null !== $dto->serialNumber) {
                return new JsonResponse(['error' => 'Les champs item/arme/série ne sont pas autorisés pour une saisie de cash.'], 400);
            }
        }

        $before = $this->recordToArray($record);

        // Apply updates (only non-null fields).
        if (null !== $dto->quantity) {
            $record->setQuantity($dto->quantity);
        }
        if (null !== $dto->date) {
            $record->setDate($dto->date);
        }
        if (null !== $dto->sheriff) {
            $record->setSheriff($dto->sheriff);
        }
        if (null !== $dto->itemName) {
            $record->setItemName($dto->itemName);
        }
        if (null !== $dto->weaponModel) {
            $record->setWeaponModel($dto->weaponModel);
        }
        if (null !== $dto->serialNumber) {
            $record->setSerialNumber($dto->serialNumber);
        }
        if (null !== $dto->possessedBy) {
            $record->setPossessedBy($dto->possessedBy);
        }
        if (null !== $dto->notes) {
            $record->setNotes($dto->notes);
        }

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
