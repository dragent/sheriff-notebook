<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\ServiceRecord;
use App\Entity\ServicePlanningSnapshot;
use App\Entity\User;
use App\Repository\CountyReferenceRepository;
use App\Repository\ServiceRecordRepository;
use App\Service\DiscordChannelNotifier;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Uid\Uuid;

#[Route('/api/services')]
final class ServiceRecordController
{
    private const GRADE_ORDER = [
        'Sheriff de comté' => 0,
        'Sheriff Adjoint' => 1,
        'Sheriff en chef' => 2,
        'Sheriff' => 3,
        'Sheriff Deputy' => 4,
        'Deputy' => 5,
    ];

    public function __construct(
        private readonly ServiceRecordRepository $repository,
        private readonly CountyReferenceRepository $referenceRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly DiscordChannelNotifier $discordNotifier,
        private readonly string $planningLogChannelId = '',
    ) {
    }

    #[Route('', name: 'api_services_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        // Eager-load user so toArray() always has userId / grade (avoids lazy-load gaps in list context).
        $records = $this->repository->createQueryBuilder('sr')
            ->leftJoin('sr.user', 'u')->addSelect('u')
            ->orderBy('sr.name', 'ASC')
            ->getQuery()
            ->getResult();

        return new JsonResponse(array_map(self::toArray(...), $records));
    }

    /** Current user's service record (one per user); created on first access if missing. */
    #[Route('/me', name: 'api_services_me', methods: ['GET'])]
    public function me(#[CurrentUser] User $user): JsonResponse
    {
        $record = $this->repository->findOneByUser($user);
        if (!$record instanceof ServiceRecord) {
            $record = new ServiceRecord($user->getUsername());
            $record->setUser($user);
            $user->setServiceRecord($record);
            $this->entityManager->persist($record);
            $this->entityManager->flush();
        }

        return new JsonResponse(self::toArray($record));
    }

    #[Route('/{id}', name: 'api_services_patch', methods: ['PATCH'])]
    public function patch(string $id, Request $request, #[CurrentUser] User $user): JsonResponse
    {
        try {
            $uuid = Uuid::fromString($id);
        } catch (\ValueError) {
            return new JsonResponse(['error' => 'Invalid id'], 400);
        }

        $record = $this->repository->find($uuid);
        if (!$record instanceof ServiceRecord) {
            return new JsonResponse(['error' => 'Service record not found'], 404);
        }

        $recordUser = $record->getUser();
        $isOwnRecord = $recordUser?->getId()?->equals($user->getId()) === true;

        $data = json_decode((string) $request->getContent(), true);
        if (!\is_array($data)) {
            return new JsonResponse(['error' => 'Invalid JSON'], 400);
        }

        $planningKeys = [
            'monDay', 'monNight', 'tueDay', 'tueNight',
            'wedDay', 'wedNight', 'thuDay', 'thuNight',
            'friDay', 'friNight', 'satDay', 'satNight',
            'sunDay', 'sunNight',
        ];
        $equipmentKeys = [
            'telegramPrimary', 'primaryWeapon', 'primaryWeaponSerial',
            'hasScope', 'primaryHasScope',
            'secondaryWeapon', 'secondaryWeaponSerial', 'secondaryHasScope',
            'thirdWeapon', 'thirdWeaponSerial', 'thirdHasScope',
            'tranquilizerWeapon', 'tranquilizerWeaponSerial', 'tranquilizerHasScope',
            'cartInfo', 'boatInfo',
        ];
        $hasFormationUpdate = array_key_exists('formationValidations', $data);

        $hasPlanningUpdate = false;
        foreach ($planningKeys as $key) {
            if (array_key_exists($key, $data)) {
                $hasPlanningUpdate = true;
                break;
            }
        }
        $hasEquipmentUpdate = false;
        foreach ($equipmentKeys as $key) {
            if (array_key_exists($key, $data)) {
                $hasEquipmentUpdate = true;
                break;
            }
        }

        if (!$isOwnRecord) {
            if ($hasEquipmentUpdate) {
                return new JsonResponse(['error' => 'Forbidden: not your service record'], 403);
            }
            if ($hasPlanningUpdate && !self::canEditOthersPlanning($user)) {
                return new JsonResponse(['error' => 'Forbidden: not your service record'], 403);
            }
        }

        if ($hasFormationUpdate && $isOwnRecord) {
            $actorOrder = self::GRADE_ORDER[$user->getGrade()] ?? null;
            if ($actorOrder !== 0) {
                return new JsonResponse(['error' => 'Forbidden: only County Sheriff can validate their own formations'], 403);
            }
        }
        if ($hasFormationUpdate && !$isOwnRecord) {
            if (!self::canValidateFormationFor($user, $recordUser)) {
                return new JsonResponse(['error' => 'Forbidden: cannot validate formation for this grade'], 403);
            }
        }

        self::applyPlanning($record, $data);
        self::applyEquipment($record, $data);
        $this->applyFormationValidations($record, $data);

        $this->entityManager->flush();

        return new JsonResponse(self::toArray($record));
    }

    #[Route('/planning/reset', name: 'api_services_planning_reset', methods: ['POST'])]
    public function resetPlanning(#[CurrentUser] User $user): JsonResponse
    {
        if (!self::canEditOthersPlanning($user)) {
            return new JsonResponse(['error' => 'Forbidden'], 403);
        }

        if ($this->planningLogChannelId === '') {
            return new JsonResponse([
                'error' => 'Canal Discord non configuré (DISCORD_PLANNING_CHANNEL_ID).',
            ], 503);
        }

        try {
            // Eager-load user for grade/name context in the snapshot.
            $records = $this->repository->createQueryBuilder('sr')
                ->leftJoin('sr.user', 'u')->addSelect('u')
                ->orderBy('sr.name', 'ASC')
                ->getQuery()
                ->getResult();

            $planningKeys = [
                'monDay', 'monNight', 'tueDay', 'tueNight',
                'wedDay', 'wedNight', 'thuDay', 'thuNight',
                'friDay', 'friNight', 'satDay', 'satNight',
                'sunDay', 'sunNight',
            ];

            $rows = [];
            $checkedCount = 0;
            /** @var list<array{name: string, grade: string, halfDays: int}> $primeCandidates */
            $primeCandidates = [];
            foreach ($records as $r) {
                if (!$r instanceof ServiceRecord) {
                    continue;
                }
                $grade = $r->getUser()?->getGrade();
                $row = [
                    'id' => $r->getId()->toRfc4122(),
                    'name' => $r->getName(),
                    'userId' => $r->getUser()?->getId()?->toRfc4122(),
                    'grade' => $grade,
                ];
                $halfDays = 0;
                foreach ($planningKeys as $k) {
                    $getter = match ($k) {
                        'monDay' => 'isMonDay',
                        'monNight' => 'isMonNight',
                        'tueDay' => 'isTueDay',
                        'tueNight' => 'isTueNight',
                        'wedDay' => 'isWedDay',
                        'wedNight' => 'isWedNight',
                        'thuDay' => 'isThuDay',
                        'thuNight' => 'isThuNight',
                        'friDay' => 'isFriDay',
                        'friNight' => 'isFriNight',
                        'satDay' => 'isSatDay',
                        'satNight' => 'isSatNight',
                        'sunDay' => 'isSunDay',
                        'sunNight' => 'isSunNight',
                    };
                    $value = $r->$getter();
                    $row[$k] = $value;
                    if ($value === true) {
                        ++$halfDays;
                        ++$checkedCount;
                    }
                }
                $row['halfDays'] = $halfDays;
                $rows[] = $row;
                if ($halfDays > 3) {
                    $displayGrade = ($grade !== null && $grade !== '') ? $grade : 'grade non renseigné';
                    $primeCandidates[] = [
                        'name' => $r->getName(),
                        'grade' => $displayGrade,
                        'halfDays' => $halfDays,
                    ];
                }
            }
            usort($primeCandidates, static function (array $a, array $b): int {
                if ($a['halfDays'] !== $b['halfDays']) {
                    return $b['halfDays'] <=> $a['halfDays'];
                }

                return strcasecmp($a['name'], $b['name']);
            });

            $snapshot = new ServicePlanningSnapshot(
                actor: $user->getUsername() ?: 'unknown',
                data: [
                    'kind' => 'planning_reset',
                    'createdAt' => (new \DateTimeImmutable('now'))->format(\DateTimeInterface::ATOM),
                    'actorUserId' => $user->getId()->toRfc4122(),
                    'actorGrade' => $user->getGrade(),
                    'checkedCount' => $checkedCount,
                    'rows' => $rows,
                ]
            );
            $this->entityManager->persist($snapshot);

            // Reset all planning booleans.
            foreach ($records as $r) {
                if (!$r instanceof ServiceRecord) {
                    continue;
                }
                $r->setMonDay(false);
                $r->setMonNight(false);
                $r->setTueDay(false);
                $r->setTueNight(false);
                $r->setWedDay(false);
                $r->setWedNight(false);
                $r->setThuDay(false);
                $r->setThuNight(false);
                $r->setFriDay(false);
                $r->setFriNight(false);
                $r->setSatDay(false);
                $r->setSatNight(false);
                $r->setSunDay(false);
                $r->setSunNight(false);
            }

            $this->entityManager->flush();

            $nowParis = new \DateTimeImmutable('now', new \DateTimeZone('Europe/Paris'));
            $content = self::buildPlanningPrimeDiscordNotice(
                $user->getUsername(),
                $user->getGrade(),
                $nowParis,
                $primeCandidates
            );
            $discordError = $this->discordNotifier->sendMessage($this->planningLogChannelId, $content);
            if ($discordError !== null) {
                return new JsonResponse(['error' => $discordError], 502);
            }

            return new JsonResponse([
                'ok' => true,
                'snapshotId' => $snapshot->getId()->toRfc4122(),
                'checkedCount' => $checkedCount,
                'discord' => [
                    'channelId' => $this->planningLogChannelId,
                    'ok' => true,
                    'error' => null,
                ],
            ]);
        } catch (\Throwable $e) {
            $message = $e->getMessage();
            $hint = null;
            if (stripos($message, 'service_planning_snapshot') !== false) {
                $hint = 'Migration manquante : exécutez les migrations Doctrine pour créer la table service_planning_snapshot.';
            }
            if ($hint === null && stripos($message, 'does not exist') !== false) {
                $hint = 'Vérifiez que les migrations Doctrine sont à jour.';
            }

            return new JsonResponse([
                'error' => 'Erreur interne lors du reset du planning.',
                'hint' => $hint,
            ], 500);
        }
    }

    /**
     * Discord notice after planning reset: agents with more than 3 validated half-shifts (prime eligibility).
     *
     * @param list<array{name: string, grade: string, halfDays: int}> $primeCandidates
     */
    private static function buildPlanningPrimeDiscordNotice(
        string $actorUsername,
        ?string $actorGrade,
        \DateTimeImmutable $issuedAt,
        array $primeCandidates,
    ): string {
        $actorLine = trim($actorUsername . ($actorGrade !== null && $actorGrade !== '' ? ', ' . $actorGrade : ''));
        $dateLine = $issuedAt->format('d/m/Y \à H\hi');

        $header = "**Bureau du Shérif — Annesburg** — *Registre des présences (clôture de grille)*\n\n";
        $intro = "Messieurs, Dames,\n\n"
            . "Conformément aux usages du comté, la grille vient d’être **réinitialisée**. "
            . "Ci-après les **agents dont le relevé compte plus de trois demi-journées de service** enregistrées **avant** cette clôture — dossiers **soumis à la validation des primes** par la paie.\n\n";

        if ($primeCandidates === []) {
            return $header
                . $intro
                . "**Avis.** Aucun membre du bureau n’atteint ce seuil sur la période concernée. Rien à porter à la validation des primes pour ce critère.\n\n"
                . "— *Acte porté par " . $actorLine . " — " . $dateLine . ".*";
        }

        $lines = [];
        foreach ($primeCandidates as $c) {
            $lines[] = sprintf(
                '• **%s** — *%s* — **%d** demi-journée(s) retenue(s)',
                $c['name'],
                $c['grade'],
                $c['halfDays']
            );
        }

        return $header
            . $intro
            . "**Liste à transmettre à la comptabilité :**\n"
            . implode("\n", $lines)
            . "\n\n— *Relevé certifié par " . $actorLine . " — " . $dateLine . ".*";
    }

    private static function applyPlanning(ServiceRecord $record, array $data): void
    {
        $setters = [
            'monDay' => 'setMonDay', 'monNight' => 'setMonNight',
            'tueDay' => 'setTueDay', 'tueNight' => 'setTueNight',
            'wedDay' => 'setWedDay', 'wedNight' => 'setWedNight',
            'thuDay' => 'setThuDay', 'thuNight' => 'setThuNight',
            'friDay' => 'setFriDay', 'friNight' => 'setFriNight',
            'satDay' => 'setSatDay', 'satNight' => 'setSatNight',
            'sunDay' => 'setSunDay', 'sunNight' => 'setSunNight',
        ];
        foreach ($setters as $key => $setter) {
            if (array_key_exists($key, $data)) {
                $record->$setter((bool) $data[$key]);
            }
        }
    }

    private static function applyEquipment(ServiceRecord $record, array $data): void
    {
        if (array_key_exists('telegramPrimary', $data)) {
            $record->setTelegramPrimary($data['telegramPrimary'] !== null ? trim((string) $data['telegramPrimary']) : null);
        }
        if (array_key_exists('primaryWeapon', $data)) {
            $record->setPrimaryWeapon($data['primaryWeapon'] !== null ? trim((string) $data['primaryWeapon']) : null);
        }
        if (array_key_exists('primaryWeaponSerial', $data)) {
            $record->setPrimaryWeaponSerial($data['primaryWeaponSerial'] !== null ? trim((string) $data['primaryWeaponSerial']) : null);
        }
        if (array_key_exists('hasScope', $data)) {
            $record->setHasScope((bool) $data['hasScope']);
        }
        if (array_key_exists('primaryHasScope', $data)) {
            $record->setHasScope((bool) $data['primaryHasScope']);
        }
        if (array_key_exists('secondaryWeapon', $data)) {
            $record->setSecondaryWeapon($data['secondaryWeapon'] !== null ? trim((string) $data['secondaryWeapon']) : null);
        }
        if (array_key_exists('secondaryWeaponSerial', $data)) {
            $record->setSecondaryWeaponSerial($data['secondaryWeaponSerial'] !== null ? trim((string) $data['secondaryWeaponSerial']) : null);
        }
        if (array_key_exists('secondaryHasScope', $data)) {
            $record->setSecondaryHasScope((bool) $data['secondaryHasScope']);
        }
        if (array_key_exists('thirdWeapon', $data)) {
            $record->setThirdWeapon($data['thirdWeapon'] !== null ? trim((string) $data['thirdWeapon']) : null);
        }
        if (array_key_exists('thirdWeaponSerial', $data)) {
            $record->setThirdWeaponSerial($data['thirdWeaponSerial'] !== null ? trim((string) $data['thirdWeaponSerial']) : null);
        }
        if (array_key_exists('thirdHasScope', $data)) {
            $record->setThirdHasScope((bool) $data['thirdHasScope']);
        }
        if (array_key_exists('tranquilizerWeapon', $data)) {
            $record->setTranquilizerWeapon($data['tranquilizerWeapon'] !== null ? trim((string) $data['tranquilizerWeapon']) : null);
        }
        if (array_key_exists('tranquilizerWeaponSerial', $data)) {
            $record->setTranquilizerWeaponSerial($data['tranquilizerWeaponSerial'] !== null ? trim((string) $data['tranquilizerWeaponSerial']) : null);
        }
        if (array_key_exists('tranquilizerHasScope', $data)) {
            $record->setTranquilizerHasScope((bool) $data['tranquilizerHasScope']);
        }
        if (array_key_exists('cartInfo', $data)) {
            $record->setCartInfo($data['cartInfo'] !== null ? trim((string) $data['cartInfo']) : null);
        }
        if (array_key_exists('boatInfo', $data)) {
            $record->setBoatInfo($data['boatInfo'] !== null ? trim((string) $data['boatInfo']) : null);
        }
    }

    private function applyFormationValidations(ServiceRecord $record, array $data): void
    {
        if (!array_key_exists('formationValidations', $data) || !\is_array($data['formationValidations'])) {
            return;
        }
        $ref = $this->referenceRepository->getSingleton();
        $refData = $ref->getData();
        $catalog = $refData['formations'] ?? [];
        $allowedIds = [];
        foreach ($catalog as $item) {
            if (\is_array($item) && isset($item['id']) && \is_string($item['id']) && $item['id'] !== '') {
                $allowedIds[$item['id']] = true;
            }
        }
        $filtered = [];
        foreach ($data['formationValidations'] as $id => $valid) {
            if (\is_string($id) && isset($allowedIds[$id]) && $valid === true) {
                $filtered[$id] = true;
            }
        }
        $record->setFormationValidations($filtered);
    }

    private static function toArray(ServiceRecord $record): array
    {
        return [
            'id' => $record->getId()->toRfc4122(),
            'userId' => $record->getUser()?->getId()?->toRfc4122(),
            'name' => $record->getName(),
            'grade' => $record->getUser()?->getGrade(),
            'telegramPrimary' => $record->getTelegramPrimary(),
            'total' => $record->getTotal(),
            'monDay' => $record->isMonDay(),
            'monNight' => $record->isMonNight(),
            'tueDay' => $record->isTueDay(),
            'tueNight' => $record->isTueNight(),
            'wedDay' => $record->isWedDay(),
            'wedNight' => $record->isWedNight(),
            'thuDay' => $record->isThuDay(),
            'thuNight' => $record->isThuNight(),
            'friDay' => $record->isFriDay(),
            'friNight' => $record->isFriNight(),
            'satDay' => $record->isSatDay(),
            'satNight' => $record->isSatNight(),
            'sunDay' => $record->isSunDay(),
            'sunNight' => $record->isSunNight(),
            'primaryWeapon' => $record->getPrimaryWeapon(),
            'primaryWeaponSerial' => $record->getPrimaryWeaponSerial(),
            'hasScope' => $record->isHasScope(),
            'primaryHasScope' => $record->isHasScope(),
            'secondaryWeapon' => $record->getSecondaryWeapon(),
            'secondaryWeaponSerial' => $record->getSecondaryWeaponSerial(),
            'secondaryHasScope' => $record->isSecondaryHasScope(),
            'thirdWeapon' => $record->getThirdWeapon(),
            'thirdWeaponSerial' => $record->getThirdWeaponSerial(),
            'thirdHasScope' => $record->isThirdHasScope(),
            'tranquilizerWeapon' => $record->getTranquilizerWeapon(),
            'tranquilizerWeaponSerial' => $record->getTranquilizerWeaponSerial(),
            'tranquilizerHasScope' => $record->isTranquilizerHasScope(),
            'cartInfo' => $record->getCartInfo(),
            'boatInfo' => $record->getBoatInfo(),
            'formationValidations' => $record->getFormationValidations(),
        ];
    }

    /** County Sheriff, Deputy, or Chief may PATCH planning fields on another user's service record. */
    private static function canEditOthersPlanning(User $user): bool
    {
        $order = self::gradeOrderForPlanning($user->getGrade());

        return $order !== null && $order <= 2;
    }

    /** Same canonicalization as frontend COMTE_ADJOINT_GRADES / GRADE_ORDER. */
    private static function gradeOrderForPlanning(?string $grade): ?int
    {
        if ($grade === null || $grade === '') {
            return null;
        }
        if ($grade === 'Sheriff adjoint') {
            $grade = 'Sheriff Adjoint';
        }

        return self::GRADE_ORDER[$grade] ?? null;
    }

    /** County Sheriff / Deputy / Chief can validate formations only for strictly lower grades. */
    private static function canValidateFormationFor(User $actor, ?User $target): bool
    {
        if ($target === null) {
            return false;
        }

        $actorGrade = $actor->getGrade();
        $targetGrade = $target->getGrade();
        if ($actorGrade === null || $targetGrade === null) {
            return false;
        }

        $actorOrder = self::GRADE_ORDER[$actorGrade] ?? null;
        $targetOrder = self::GRADE_ORDER[$targetGrade] ?? null;
        if ($actorOrder === null || $targetOrder === null) {
            return false;
        }

        if ($actorOrder > 2) {
            return false;
        }

        return $actorOrder < $targetOrder;
    }
}

