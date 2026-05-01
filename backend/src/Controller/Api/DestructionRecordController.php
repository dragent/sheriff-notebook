<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Dto\DestructionRecordCreateDto;
use App\Entity\ComptaEntry;
use App\Entity\DestructionRecord;
use App\Entity\SeizureRecord;
use App\Entity\User;
use App\Repository\CountyReferenceRepository;
use App\Repository\DestructionRecordRepository;
use App\Repository\SeizureRecordRepository;
use App\Security\Voter\DestructionVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Uid\Uuid;

#[Route('/api/destructions')]
#[IsGranted(DestructionVoter::MANAGE, message: 'Accès réservé aux shérifs.')]
final class DestructionRecordController
{
    public function __construct(
        private readonly DestructionRecordRepository $repository,
        private readonly SeizureRecordRepository $seizureRepository,
        private readonly CountyReferenceRepository $countyReferenceRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', name: 'api_destructions_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $records = $this->repository->findAllOrderedByCreatedDesc();
        $items = [];
        foreach ($records as $r) {
            $items[] = $this->recordToArray($r);
        }

        return new JsonResponse(['data' => $items]);
    }

    #[Route('', name: 'api_destructions_create', methods: ['POST'])]
    public function create(#[MapRequestPayload(validationFailedStatusCode: Response::HTTP_BAD_REQUEST)] DestructionRecordCreateDto $payload, #[CurrentUser] User $user): JsonResponse
    {
        $normalized = $payload->toNormalizedLines();

        $validationError = $this->validateQuantitiesAgainstSeizures($normalized);
        if (null !== $validationError) {
            return new JsonResponse(['error' => $validationError], 400);
        }

        $createdBy = $user->getUsername() ?? null;
        $record = new DestructionRecord($normalized, $createdBy);
        $this->entityManager->persist($record);
        $this->consumeSeizuresForDestructionLines($normalized);
        $this->entityManager->flush();

        return new JsonResponse($this->recordToArray($record), 201);
    }

    #[Route('/{id}', name: 'api_destructions_validate', methods: ['PATCH'])]
    public function validate(string $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        if (!Uuid::isValid($id)) {
            return new JsonResponse(['error' => 'Identifiant invalide.'], 400);
        }

        $record = $this->repository->find(Uuid::fromString($id));
        if (!$record instanceof DestructionRecord) {
            return new JsonResponse(['error' => 'Destruction introuvable.'], 404);
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $status = isset($body['status']) && \is_string($body['status']) ? trim($body['status']) : '';
        if (DestructionRecord::STATUS_REUSSIE !== $status && DestructionRecord::STATUS_PERDUE !== $status) {
            return new JsonResponse(
                ['error' => 'Champ status requis : reussie ou perdue.'],
                400
            );
        }

        try {
            $record->validate($status);
        } catch (\DomainException $e) {
            return new JsonResponse(['error' => $e->getMessage()], 409);
        }

        if (DestructionRecord::STATUS_REUSSIE === $status) {
            $this->createComptaEntryForSuccessfulDestruction($record);
        }

        $this->entityManager->flush();

        return new JsonResponse($this->recordToArray($record));
    }

    /** Ensures destruction quantities (new + already recorded) do not exceed seized quantities. Weapons with serial use key "weaponModel|serialNumber". */
    private function validateQuantitiesAgainstSeizures(array $normalized): ?string
    {
        // Single SQL aggregation instead of loading every seizure row into PHP and folding it manually.
        $seized = $this->seizureRepository->getSeizedQuantityByKey();
        $destroyed = $this->repository->getDestroyedQuantityByKey();

        $newRequest = [];
        foreach ($normalized as $line) {
            $name = $line['destruction'] ?? '';
            if ('' === $name) {
                continue;
            }
            $newRequest[$name] = ($newRequest[$name] ?? 0) + $line['qte'];
            $pipe = strpos($name, '|');
            if (false !== $pipe) {
                $prefix = substr($name, 0, $pipe);
                if ('' !== $prefix) {
                    $newRequest[$prefix] = ($newRequest[$prefix] ?? 0) + $line['qte'];
                }
            }
        }

        foreach ($newRequest as $name => $qteNew) {
            $totalSeized = $seized[$name] ?? 0;
            $alreadyDestroyed = $destroyed[$name] ?? 0;
            $after = $alreadyDestroyed + $qteNew;
            if ($after > $totalSeized) {
                $pipePos = strpos($name, '|');
                $displayName = SeizureRecord::DESTRUCTION_LINE_KEY_CASH === $name
                    ? 'Dollars saisis'
                    : (false !== $pipePos
                        ? substr($name, 0, $pipePos).' (n° '.substr($name, $pipePos + 1).')'
                        : $name);

                return \sprintf(
                    'La quantité à détruire pour « %s » dépasse la quantité saisie (saisi : %d, déjà détruit : %d, disponible : %d).',
                    $displayName,
                    $totalSeized,
                    $alreadyDestroyed,
                    $totalSeized - $alreadyDestroyed
                );
            }
        }

        return null;
    }

    /** Decrements or removes SeizureRecords when a destruction is created; removes records whose quantity reaches 0. */
    private function consumeSeizuresForDestructionLines(array $normalized): void
    {
        foreach ($normalized as $line) {
            $key = isset($line['destruction']) && \is_string($line['destruction']) ? trim($line['destruction']) : '';
            $toConsume = isset($line['qte']) && is_numeric($line['qte']) ? (int) $line['qte'] : 0;
            if ('' === $key || $toConsume <= 0) {
                continue;
            }

            if (SeizureRecord::DESTRUCTION_LINE_KEY_CASH === $key) {
                $seizures = $this->seizureRepository->findCashOrderedByDateAsc();
            } else {
                $pipe = strpos($key, '|');
                if (false !== $pipe) {
                    $weaponModel = substr($key, 0, $pipe);
                    $serialNumber = substr($key, $pipe + 1);
                    $seizures = $this->seizureRepository->findByWeaponModelOrderedByDateAsc($weaponModel, $serialNumber);
                } else {
                    $seizuresItem = $this->seizureRepository->findByItemNameOrderedByDateAsc($key);
                    $seizuresWeapon = $this->seizureRepository->findByWeaponModelOrderedByDateAsc($key, null);
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

            $remaining = $toConsume;
            foreach ($seizures as $seizure) {
                if ($remaining <= 0) {
                    break;
                }
                $take = min($seizure->getQuantity(), $remaining);
                $newQty = $seizure->getQuantity() - $take;
                $remaining -= $take;
                if ($newQty <= 0) {
                    $this->entityManager->remove($seizure);
                } else {
                    $seizure->setQuantity($newQty);
                }
            }
        }
    }

    /** Creates an accounting entry for a successful destruction; amount = sum of (qty × destructionValue) from reference, plus cash reward (20$ per 100$ destroyed). */
    private function createComptaEntryForSuccessfulDestruction(DestructionRecord $record): void
    {
        $lines = $record->getLines();
        if ([] === $lines) {
            return;
        }

        $ref = $this->countyReferenceRepository->getSingleton();
        $data = $ref->getData();
        $itemCategories = $data['itemCategories'] ?? [];

        $valueByName = [];
        foreach ($itemCategories as $category) {
            if (!isset($category['items']) || !\is_array($category['items'])) {
                continue;
            }
            foreach ($category['items'] as $item) {
                $name = isset($item['name']) && \is_string($item['name']) ? trim($item['name']) : '';
                if ('' === $name) {
                    continue;
                }
                if (!isset($item['destructionValue'])) {
                    continue;
                }
                $raw = (string) $item['destructionValue'];
                $normalized = str_replace([' ', ','], ['', '.'], $raw);
                if (!is_numeric($normalized)) {
                    continue;
                }
                $valueByName[$name] = (float) $normalized;
            }
        }

        $weaponKeys = ['fusil', 'carabine', 'fusilAPompe', 'revolver', 'pistolet', 'armeBlanche'];
        foreach ($weaponKeys as $wk) {
            $weapons = $data[$wk] ?? [];
            if (!\is_array($weapons)) {
                continue;
            }
            foreach ($weapons as $entry) {
                if (!\is_array($entry) || !isset($entry['name']) || !\is_string($entry['name'])) {
                    continue;
                }
                $name = trim($entry['name']);
                if ('' === $name) {
                    continue;
                }
                $raw = isset($entry['destructionValue']) && \is_string($entry['destructionValue'])
                    ? $entry['destructionValue'] : '';
                $normalized = str_replace([' ', ','], ['', '.'], $raw);
                if (!is_numeric($normalized)) {
                    continue;
                }
                $valueByName[$name] = (float) $normalized;
            }
        }

        $total = 0.0;
        foreach ($lines as $line) {
            $name = isset($line['destruction']) && \is_string($line['destruction']) ? trim($line['destruction']) : '';
            if ('' === $name) {
                continue;
            }
            $qte = isset($line['qte']) && is_numeric($line['qte']) ? (int) $line['qte'] : 0;
            if ($qte <= 0) {
                continue;
            }
            if (SeizureRecord::DESTRUCTION_LINE_KEY_CASH === $name) {
                $total += (float) (int) floor($qte / 100) * 20.0;
                continue;
            }
            $pipe = strpos($name, '|');
            $key = (false !== $pipe && $pipe > 0) ? substr($name, 0, $pipe) : $name;
            if (!isset($valueByName[$key])) {
                continue;
            }
            $total += $qte * $valueByName[$key];
        }

        if ($total <= 0.0) {
            return;
        }

        $firstLine = $lines[0];
        $date = isset($firstLine['date']) && \is_string($firstLine['date']) && '' !== $firstLine['date']
            ? $firstLine['date']
            : $record->getCreatedAt()->format('Y-m-d');

        $sheriff = $record->getCreatedBy() ?? '';
        if ('' === $sheriff) {
            return;
        }

        $amountStr = number_format($total, 2, '.', '');
        $entry = new ComptaEntry(
            ComptaEntry::TYPE_ENTREE,
            $date,
            $sheriff,
            'Destruction de saisie',
            $amountStr
        );
        $this->entityManager->persist($entry);
    }

    /** @return array<string, mixed> */
    private function recordToArray(DestructionRecord $r): array
    {
        return [
            'id' => $r->getId()->toRfc4122(),
            'lines' => $r->getLines(),
            'status' => $r->getStatus(),
            'createdAt' => $r->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'validatedAt' => $r->getValidatedAt()?->format(\DateTimeInterface::ATOM),
            'createdBy' => $r->getCreatedBy(),
        ];
    }
}
