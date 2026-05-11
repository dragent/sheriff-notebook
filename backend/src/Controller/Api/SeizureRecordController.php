<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\SeizureCorrectionNotifyDto;
use App\Dto\SeizureRecordCancelDto;
use App\Dto\SeizureRecordCreateDto;
use App\Dto\SeizureRecordUpdateDto;
use App\Dto\SeizureStockAdjustDto;
use App\Entity\SeizureRecord;
use App\Entity\SeizureRecordEvent;
use App\Entity\User;
use App\Repository\SeizureRecordRepository;
use App\Security\Voter\SeizureCorrectionVoter;
use App\Security\Voter\SeizureVoter;
use App\Service\DiscordChannelNotifier;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;
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
        private readonly AuthorizationCheckerInterface $authorizationChecker,
        private readonly DiscordChannelNotifier $discordChannelNotifier,
        private readonly string $saisieCorrectionChannelId = '',
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
            SeizureRecord::storedQuantityFromApiInput($dto->type, $dto->quantity),
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

    #[Route('/notify-corrections', name: 'api_saisies_notify_corrections', methods: ['POST'], priority: 10)]
    #[IsGranted(SeizureCorrectionVoter::CORRECT, message: 'Accès réservé au Sheriff de comté et au Sheriff Adjoint.')]
    public function notifyCorrections(
        #[MapRequestPayload(validationFailedStatusCode: Response::HTTP_BAD_REQUEST)] SeizureCorrectionNotifyDto $dto,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ('' === $this->saisieCorrectionChannelId) {
            return new JsonResponse([
                'error' => 'Canal Discord non configuré (DISCORD_SAISIE_CORRECTION_CHANNEL_ID).',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $actor = $user->getUsername() ?? '?';
        $stamp = (new \DateTimeImmutable('now'))->format('d/m/Y H:i');
        $body = trim($dto->message);
        $content = "**Erreur de saisie**\n\n".$body."\n\n— ".$actor.' · '.$stamp;
        if (\strlen($content) > 2000) {
            $content = mb_substr($content, 0, 1997).'…';
        }

        $err = $this->discordChannelNotifier->sendMessage($this->saisieCorrectionChannelId, $content);
        if (null !== $err) {
            return new JsonResponse(['error' => $err], Response::HTTP_BAD_GATEWAY);
        }

        return new JsonResponse(['ok' => true]);
    }

    #[Route('/stock-adjust', name: 'api_saisies_stock_adjust', methods: ['POST'], priority: 9)]
    #[IsGranted(SeizureCorrectionVoter::CORRECT, message: 'Accès réservé au Sheriff de comté et au Sheriff Adjoint.')]
    public function stockAdjust(
        #[MapRequestPayload(validationFailedStatusCode: Response::HTTP_BAD_REQUEST)] SeizureStockAdjustDto $dto,
    ): JsonResponse {
        $key = trim($dto->key);
        if ('' === $key) {
            return new JsonResponse(['error' => 'Clé de stock invalide.'], 400);
        }

        $isCashLine = SeizureRecord::DESTRUCTION_LINE_KEY_CASH === $key;
        $remove = (float) $dto->removeQuantity;
        $remove = $isCashLine ? $remove : (float) (int) $remove;
        if ($remove <= 0) {
            return new JsonResponse(['error' => 'La quantité à retirer doit être > 0.'], 400);
        }
        $typeForValidation = $isCashLine ? SeizureRecord::TYPE_CASH : SeizureRecord::TYPE_ITEM;
        $err = $this->validateQuantityForSeizureType($typeForValidation, $remove);
        if (null !== $err) {
            return new JsonResponse(['error' => $err], 400);
        }

        $beforeAgg = $this->repository->getSeizedQuantityByKey();
        $before = $beforeAgg[$key] ?? 0;
        if ($before <= 0) {
            return new JsonResponse(['error' => 'Stock introuvable ou déjà à zéro.'], 404);
        }
        if ($remove > (float) $before + ($isCashLine ? 1.0e-6 : 0)) {
            return new JsonResponse([
                'error' => 'La quantité à retirer dépasse le stock disponible.',
                'available' => $before,
            ], 400);
        }

        if ($isCashLine) {
            $seizures = $this->repository->findCashOrderedByDateAsc();
        } else {
            $pipe = strpos($key, '|');
            if (false !== $pipe) {
                $weaponModel = substr($key, 0, $pipe);
                $serialNumber = substr($key, $pipe + 1);
                $seizures = $this->repository->findByWeaponModelOrderedByDateAsc($weaponModel, $serialNumber);
            } else {
                $seizuresItem = $this->repository->findByItemNameOrderedByDateAsc($key);
                $seizuresWeapon = $this->repository->findByWeaponModelOrderedByDateAsc($key, null);
                $seizures = array_merge($seizuresItem, $seizuresWeapon);
                usort($seizures, static function (SeizureRecord $a, SeizureRecord $b): int {
                    $d = strcmp($a->getDate(), $b->getDate());
                    if (0 !== $d) {
                        return $d;
                    }

                    return $a->getCreatedAt() <=> $b->getCreatedAt();
                });
            }
        }

        $remaining = $remove;
        foreach ($seizures as $seizure) {
            if ($remaining <= ($isCashLine ? 1.0e-6 : 0)) {
                break;
            }
            $stored = $seizure->getQuantity();
            if ($isCashLine) {
                $availableDollars = round($stored / 100.0, 2);
                $takeDollars = min($availableDollars, $remaining);
                $takeCents = (int) round($takeDollars * 100.0);
                $newCents = $stored - $takeCents;
                $remaining = round($remaining - $takeDollars, 2);
                if ($newCents <= 0) {
                    $this->entityManager->remove($seizure);
                } else {
                    $seizure->setQuantity($newCents);
                }
            } else {
                $take = min($stored, (int) $remaining);
                $newQty = $stored - $take;
                $remaining -= $take;
                if ($newQty <= 0) {
                    $this->entityManager->remove($seizure);
                } else {
                    $seizure->setQuantity($newQty);
                }
            }
        }

        $this->entityManager->flush();

        $afterAgg = $this->repository->getSeizedQuantityByKey();
        $after = $afterAgg[$key] ?? 0;

        return new JsonResponse([
            'ok' => true,
            'key' => $key,
            'before' => $before,
            'after' => $after,
            'removed' => $remove,
        ]);
    }

    #[Route('/{id}', name: 'api_saisies_delete', methods: ['DELETE'])]
    #[IsGranted(SeizureCorrectionVoter::CORRECT, message: 'Accès réservé au Sheriff de comté et au Sheriff Adjoint.')]
    public function delete(string $id): JsonResponse|Response
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

        $this->entityManager->remove($record);
        $this->entityManager->flush();

        return new Response('', Response::HTTP_NO_CONTENT);
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

        if (null !== $dto->quantity) {
            $err = $this->validateQuantityForSeizureType($record->getType(), $dto->quantity);
            if (null !== $err) {
                return new JsonResponse(['error' => $err], 400);
            }
        }

        $newStoredQuantity = null !== $dto->quantity
            ? SeizureRecord::storedQuantityFromApiInput($record->getType(), $dto->quantity)
            : null;
        if (null !== $newStoredQuantity && $newStoredQuantity !== $record->getQuantity()) {
            if (!$this->authorizationChecker->isGranted(SeizureCorrectionVoter::CORRECT)) {
                return new JsonResponse([
                    'error' => 'Seuls le Sheriff de comté et le Sheriff Adjoint peuvent modifier la quantité d\'une saisie.',
                ], 403);
            }
        }

        $before = $this->recordToArray($record);

        // Apply updates (only non-null fields).
        if (null !== $dto->quantity) {
            $record->setQuantity(SeizureRecord::storedQuantityFromApiInput($record->getType(), $dto->quantity));
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
            'quantity' => SeizureRecord::apiQuantityFromStored($r->getType(), $r->getQuantity()),
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

    private function validateQuantityForSeizureType(string $type, float $quantity): ?string
    {
        if (SeizureRecord::TYPE_CASH === $type) {
            $cents = (int) round($quantity * 100);
            if ($cents < 1) {
                return 'Le montant en dollars doit être au moins 0,01 $.';
            }
            if (abs($quantity - ($cents / 100.0)) > 1.0e-6) {
                return 'Le montant en dollars ne peut avoir que 2 décimales au maximum.';
            }

            return null;
        }

        if ($quantity < 1.0) {
            return 'La quantité doit être au moins 1.';
        }
        $whole = (int) round($quantity);
        if (abs($quantity - $whole) > 1.0e-6) {
            return 'La quantité doit être un nombre entier pour une saisie d\'item ou d\'arme.';
        }

        return null;
    }
}
