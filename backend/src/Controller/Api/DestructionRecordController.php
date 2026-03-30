<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\DestructionRecord;
use App\Entity\ComptaEntry;
use App\Entity\SeizureRecord;
use App\Entity\User;
use App\Repository\DestructionRecordRepository;
use App\Repository\CountyReferenceRepository;
use App\Repository\SeizureRecordRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

#[Route('/api/destructions')]
final class DestructionRecordController
{
    /** Du plus gradé (0) au moins gradé (5). */
    private const GRADE_ORDER = [
        'Sheriff de comté' => 0,
        'Sheriff Adjoint' => 1,
        'Sheriff en chef' => 2,
        'Sheriff' => 3,
        'Sheriff Deputy' => 4,
        'Deputy' => 5,
    ];

    public function __construct(
        private readonly DestructionRecordRepository $repository,
        private readonly SeizureRecordRepository $seizureRepository,
        private readonly CountyReferenceRepository $countyReferenceRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    #[Route('', name: 'api_destructions_list', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        $grade = $user->getGrade();
        $order = $grade !== null ? (self::GRADE_ORDER[$grade] ?? null) : null;
        if (!\in_array($grade, User::getSheriffGradeValues(), true) || $order === null || $order > 4) {
            return new JsonResponse(
                ['error' => 'Accès réservé aux shérifs.'],
                403
            );
        }

        $records = $this->repository->findAllOrderedByCreatedDesc();
        $items = [];
        foreach ($records as $r) {
            $items[] = $this->recordToArray($r);
        }

        return new JsonResponse(['data' => $items]);
    }

    #[Route('', name: 'api_destructions_create', methods: ['POST'])]
    public function create(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $grade = $user->getGrade();
        $order = $grade !== null ? (self::GRADE_ORDER[$grade] ?? null) : null;
        if (!\in_array($grade, User::getSheriffGradeValues(), true) || $order === null || $order > 4) {
            return new JsonResponse(
                ['error' => 'Seuls les shérifs peuvent enregistrer des destructions.'],
                403
            );
        }

        $body = json_decode((string) $request->getContent(), true);
        if (!\is_array($body)) {
            return new JsonResponse(['error' => 'JSON invalide'], 400);
        }

        $lines = isset($body['lines']) && \is_array($body['lines']) ? $body['lines'] : [];
        $normalized = [];
        foreach ($lines as $line) {
            if (!\is_array($line)) {
                continue;
            }
            $date = isset($line['date']) && \is_string($line['date']) ? trim($line['date']) : '';
            $qte = isset($line['qte']) ? (is_numeric($line['qte']) ? (int) $line['qte'] : 0) : 0;
            $sommes = isset($line['sommes']) && \is_string($line['sommes']) ? trim($line['sommes']) : '';
            $destruction = isset($line['destruction']) && \is_string($line['destruction']) ? trim($line['destruction']) : '';
            $normalized[] = [
                'date' => $date,
                'qte' => $qte,
                'sommes' => $sommes,
                'destruction' => $destruction,
            ];
        }

        $referenceDate = null;
        $today = new \DateTimeImmutable('today');
        foreach ($normalized as $index => $line) {
            if (($line['destruction'] ?? '') === '') {
                return new JsonResponse(
                    ['error' => 'Chaque ligne doit avoir un type de destruction choisi.'],
                    400
                );
            }
            if (!isset($line['qte']) || !\is_int($line['qte']) || $line['qte'] < 1) {
                return new JsonResponse(
                    ['error' => 'Chaque ligne doit avoir une quantité strictement positive.'],
                    400
                );
            }
            if (($line['destruction'] ?? '') === SeizureRecord::DESTRUCTION_LINE_KEY_CASH) {
                if (($line['qte'] % 100) !== 0) {
                    return new JsonResponse(
                        ['error' => 'Les dollares doivent être détruits par tranches de 100 $.'],
                        400
                    );
                }
            }

            $dateValue = $line['date'] ?? '';
            if ($referenceDate === null) {
                if ($dateValue === '') {
                    return new JsonResponse(
                        ['error' => 'La date de destruction est requise.'],
                        400
                    );
                }
                $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $dateValue);
                if (!$dt || $dt->format('Y-m-d') !== $dateValue) {
                    return new JsonResponse(
                        ['error' => 'Format de date invalide. Utiliser AAAA-MM-JJ.'],
                        400
                    );
                }
                if ($dt < $today) {
                    return new JsonResponse(
                        ['error' => 'La date de destruction ne peut pas être dans le passé.'],
                        400
                    );
                }
                $referenceDate = $dateValue;
            }

            $normalized[$index]['date'] = $referenceDate;
        }

        $validationError = $this->validateQuantitiesAgainstSeizures($normalized);
        if ($validationError !== null) {
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
        if (!\in_array($user->getGrade(), User::getSheriffGradeValues(), true)) {
            return new JsonResponse(
                ['error' => 'Seuls les shérifs peuvent valider une destruction.'],
                403
            );
        }

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
        if ($status !== DestructionRecord::STATUS_REUSSIE && $status !== DestructionRecord::STATUS_PERDUE) {
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

        if ($status === DestructionRecord::STATUS_REUSSIE) {
            $this->createComptaEntryForSuccessfulDestruction($record);
        }

        $this->entityManager->flush();

        return new JsonResponse($this->recordToArray($record));
    }

    /** Ensures destruction quantities (new + already recorded) do not exceed seized quantities. Weapons with serial use key "weaponModel|serialNumber". */
    private function validateQuantitiesAgainstSeizures(array $normalized): ?string
    {
        $seized = [];
        foreach ($this->seizureRepository->findAllOrderedByDateDesc() as $s) {
            if ($s->getType() === SeizureRecord::TYPE_CASH) {
                $cashKey = SeizureRecord::DESTRUCTION_LINE_KEY_CASH;
                $seized[$cashKey] = ($seized[$cashKey] ?? 0) + $s->getQuantity();
                continue;
            }
            if ($s->getType() === SeizureRecord::TYPE_ITEM) {
                $name = $s->getItemName() ?? '';
                if ($name !== '') {
                    $seized[$name] = ($seized[$name] ?? 0) + $s->getQuantity();
                }
                continue;
            }
            $model = $s->getWeaponModel() ?? '';
            if ($model === '') {
                continue;
            }
            $qty = $s->getQuantity();
            $seized[$model] = ($seized[$model] ?? 0) + $qty;
            $serial = $s->getSerialNumber();
            if ($serial !== null && $serial !== '') {
                $key = $model . '|' . $serial;
                $seized[$key] = ($seized[$key] ?? 0) + $qty;
            }
        }

        $destroyed = [];
        foreach ($this->repository->findAllOrderedByCreatedDesc() as $rec) {
            foreach ($rec->getLines() as $line) {
                $name = isset($line['destruction']) && \is_string($line['destruction']) ? trim($line['destruction']) : '';
                if ($name === '') {
                    continue;
                }
                $qte = isset($line['qte']) && is_numeric($line['qte']) ? (int) $line['qte'] : 0;
                $destroyed[$name] = ($destroyed[$name] ?? 0) + $qte;
                $pipe = strpos($name, '|');
                if ($pipe !== false) {
                    $prefix = substr($name, 0, $pipe);
                    if ($prefix !== '') {
                        $destroyed[$prefix] = ($destroyed[$prefix] ?? 0) + $qte;
                    }
                }
            }
        }

        $newRequest = [];
        foreach ($normalized as $line) {
            $name = $line['destruction'] ?? '';
            if ($name === '') {
                continue;
            }
            $newRequest[$name] = ($newRequest[$name] ?? 0) + $line['qte'];
            $pipe = strpos($name, '|');
            if ($pipe !== false) {
                $prefix = substr($name, 0, $pipe);
                if ($prefix !== '') {
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
                $displayName = $name === SeizureRecord::DESTRUCTION_LINE_KEY_CASH
                    ? 'Dollars saisis'
                    : ($pipePos !== false
                        ? substr($name, 0, $pipePos) . ' (n° ' . substr($name, $pipePos + 1) . ')'
                        : $name);
                return sprintf(
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
            if ($key === '' || $toConsume <= 0) {
                continue;
            }

            if ($key === SeizureRecord::DESTRUCTION_LINE_KEY_CASH) {
                $seizures = $this->seizureRepository->findCashOrderedByDateAsc();
            } else {
                $pipe = strpos($key, '|');
                if ($pipe !== false) {
                    $weaponModel = substr($key, 0, $pipe);
                    $serialNumber = substr($key, $pipe + 1);
                    $seizures = $this->seizureRepository->findByWeaponModelOrderedByDateAsc($weaponModel, $serialNumber);
                } else {
                    $seizuresItem = $this->seizureRepository->findByItemNameOrderedByDateAsc($key);
                    $seizuresWeapon = $this->seizureRepository->findByWeaponModelOrderedByDateAsc($key, null);
                    $seizures = array_merge($seizuresItem, $seizuresWeapon);
                    usort($seizures, static function (SeizureRecord $a, SeizureRecord $b): int {
                        $d = strcmp($a->getDate(), $b->getDate());
                        if ($d !== 0) {
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
        if ($lines === []) {
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
                if ($name === '') {
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
                if ($name === '') {
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
            if ($name === '') {
                continue;
            }
            $qte = isset($line['qte']) && is_numeric($line['qte']) ? (int) $line['qte'] : 0;
            if ($qte <= 0) {
                continue;
            }
            if ($name === SeizureRecord::DESTRUCTION_LINE_KEY_CASH) {
                $total += (float) (int) floor($qte / 100) * 20.0;
                continue;
            }
            $pipe = strpos($name, '|');
            $key = ($pipe !== false && $pipe > 0) ? substr($name, 0, $pipe) : $name;
            if (!isset($valueByName[$key])) {
                continue;
            }
            $total += $qte * $valueByName[$key];
        }

        if ($total <= 0.0) {
            return;
        }

        $firstLine = $lines[0];
        $date = isset($firstLine['date']) && \is_string($firstLine['date']) && $firstLine['date'] !== ''
            ? $firstLine['date']
            : $record->getCreatedAt()->format('Y-m-d');

        $sheriff = $record->getCreatedBy() ?? '';
        if ($sheriff === '') {
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
