<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\BureauWeapon;
use App\Entity\ComptaEntry;
use App\Entity\DestructionRecord;
use App\Entity\SeizureRecord;
use App\Entity\ServiceRecord;
use Doctrine\ORM\EntityManagerInterface;

/**
 * When the county reference JSON changes, infer unambiguous renames and update denormalized data:
 * weapons, items, contraventions (labels), formation ids (same label, new id), compta reasons, saisie notes,
 * cart/boat lines on service records.
 *
 * Uses iterative 1:1 diffs on multisets where possible. Conflicting mappings are dropped.
 */
final class ReferenceDataRenamePropagator
{
    private const WEAPON_KEYS = ['fusil', 'carabine', 'fusilAPompe', 'revolver', 'pistolet', 'armeBlanche'];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @return array{
     *   seizures: int,
     *   seizureNotes: int,
     *   destructions: int,
     *   bureauWeapons: int,
     *   serviceRecords: int,
     *   serviceRecordCartBoat: int,
     *   comptaEntries: int,
     *   formationValidationRecords: int
     * }
     */
    public function propagate(array $before, array $after): array
    {
        $catalogMap = $this->buildCatalogRenameMap($before, $after);
        $contraventionMap = $this->buildContraventionLabelMap($before, $after);
        $textMap = $this->mergeRenameMaps($catalogMap, $contraventionMap);

        $formationIdMap = $this->buildFormationIdRemapIterative($before, $after);

        $seizures = $this->propagateSeizureItemWeapon($catalogMap);
        $seizureNotes = $this->propagateSeizureNotes($textMap);
        $destructions = $this->propagateDestructions($catalogMap);
        $bureauWeapons = $this->propagateBureauWeapons($catalogMap);
        $serviceRecords = $this->propagateServiceRecordWeapons($catalogMap);
        $cartBoat = $this->propagateServiceRecordCartBoat($textMap);
        $compta = $this->propagateComptaReasons($textMap);
        $formationRecords = $this->propagateFormationValidations($formationIdMap);

        return [
            'seizures' => $seizures,
            'seizureNotes' => $seizureNotes,
            'destructions' => $destructions,
            'bureauWeapons' => $bureauWeapons,
            'serviceRecords' => $serviceRecords,
            'serviceRecordCartBoat' => $cartBoat,
            'comptaEntries' => $compta,
            'formationValidationRecords' => $formationRecords,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function buildCatalogRenameMap(array $before, array $after): array
    {
        $merged = [];
        foreach (self::WEAPON_KEYS as $key) {
            $m = $this->iterativeSingletonRenamesMultisets(
                $this->weaponNamesFromList($before[$key] ?? []),
                $this->weaponNamesFromList($after[$key] ?? [])
            );
            $merged = $this->mergeRenameMaps($merged, $m);
        }

        $beforeCats = $this->indexItemCategories($before['itemCategories'] ?? []);
        $afterCats = $this->indexItemCategories($after['itemCategories'] ?? []);
        $catIds = array_values(array_unique(array_merge(array_keys($beforeCats), array_keys($afterCats))));
        foreach ($catIds as $cid) {
            $m = $this->iterativeSingletonRenamesMultisets(
                $this->itemNamesFromCategoryRow($beforeCats[$cid] ?? []),
                $this->itemNamesFromCategoryRow($afterCats[$cid] ?? [])
            );
            $merged = $this->mergeRenameMaps($merged, $m);
        }

        return $merged;
    }

    /**
     * @return array<string, string>
     */
    private function buildContraventionLabelMap(array $before, array $after): array
    {
        $labelsBefore = $this->contraventionLabelsList($before['contraventions'] ?? []);
        $labelsAfter = $this->contraventionLabelsList($after['contraventions'] ?? []);

        return $this->iterativeSingletonRenamesMultisets($labelsBefore, $labelsAfter);
    }

    /** @param mixed $rows */
    private function contraventionLabelsList(mixed $rows): array
    {
        if (!\is_array($rows)) {
            return [];
        }
        $out = [];
        foreach ($rows as $row) {
            if (!\is_array($row) || !isset($row['label']) || !\is_string($row['label'])) {
                continue;
            }
            $out[] = $row['label'];
        }

        return $out;
    }

    /**
     * Remap formation UUID keys on service records when the catalogue entry keeps the same label but changes id.
     *
     * @return array<string, string> oldFormationId => newFormationId
     */
    private function buildFormationIdRemapIterative(array $before, array $after): array
    {
        $oldList = $this->formationsAsIdLabelRows($before['formations'] ?? []);
        $newList = $this->formationsAsIdLabelRows($after['formations'] ?? []);
        $acc = [];
        while ($oldList !== [] && $newList !== []) {
            $step = $this->formationStepMapByUniqueLabels($oldList, $newList);
            if ($step === []) {
                break;
            }
            foreach ($step as $oldId => $newId) {
                $acc = $this->mergeRenameMaps($acc, [$oldId => $newId]);
            }
            $mappedOldIds = array_keys($step);
            $mappedNewIds = array_values($step);
            $oldList = array_values(array_filter(
                $oldList,
                static fn (array $row): bool => !\in_array($row['id'], $mappedOldIds, true)
            ));
            $newList = array_values(array_filter(
                $newList,
                static fn (array $row): bool => !\in_array($row['id'], $mappedNewIds, true)
            ));
        }

        return $acc;
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    private function formationsAsIdLabelRows(mixed $formations): array
    {
        if (!\is_array($formations)) {
            return [];
        }
        $out = [];
        foreach ($formations as $f) {
            if (!\is_array($f) || !isset($f['id'], $f['label']) || !\is_string($f['id']) || !\is_string($f['label'])) {
                continue;
            }
            if ($f['id'] === '' || trim($f['label']) === '') {
                continue;
            }
            $out[] = ['id' => $f['id'], 'label' => $f['label']];
        }

        return $out;
    }

    /**
     * @param list<array{id: string, label: string}> $oldList
     * @param list<array{id: string, label: string}> $newList
     *
     * @return array<string, string>
     */
    private function formationStepMapByUniqueLabels(array $oldList, array $newList): array
    {
        $oldByLabel = [];
        foreach ($oldList as $row) {
            $l = mb_strtolower(trim($row['label']));
            if ($l === '') {
                continue;
            }
            $oldByLabel[$l][] = $row['id'];
        }
        $newByLabel = [];
        foreach ($newList as $row) {
            $l = mb_strtolower(trim($row['label']));
            if ($l === '') {
                continue;
            }
            $newByLabel[$l][] = $row['id'];
        }

        $step = [];
        foreach ($oldByLabel as $l => $oldIds) {
            if (\count($oldIds) !== 1) {
                continue;
            }
            $newIds = $newByLabel[$l] ?? [];
            if (\count($newIds) !== 1) {
                continue;
            }
            if ($oldIds[0] === $newIds[0]) {
                continue;
            }
            $step[$oldIds[0]] = $newIds[0];
        }

        if ($step === []) {
            return [];
        }

        $newTargetCounts = [];
        foreach ($step as $newId) {
            $newTargetCounts[$newId] = ($newTargetCounts[$newId] ?? 0) + 1;
        }
        foreach ($newTargetCounts as $newId => $c) {
            if ($c > 1) {
                foreach ($step as $oldId => $n) {
                    if ($n === $newId) {
                        unset($step[$oldId]);
                    }
                }
            }
        }

        return $step;
    }

    /**
     * @param list<string> $beforeList
     * @param list<string> $afterList
     *
     * @return array<string, string>
     */
    private function iterativeSingletonRenamesMultisets(array $beforeList, array $afterList): array
    {
        $old = array_values(array_map(static fn (string $s): string => trim($s), $beforeList));
        $new = array_values(array_map(static fn (string $s): string => trim($s), $afterList));
        $acc = [];
        while ($old !== [] && $new !== []) {
            $pair = $this->singletonRenameMap($old, $new);
            if ($pair === []) {
                break;
            }
            $from = array_key_first($pair);
            $to = $pair[$from];
            $acc = $this->mergeRenameMaps($acc, $pair);
            $old = $this->removeFirstOccurrence($old, $from);
            $new = $this->removeFirstOccurrence($new, $to);
        }

        return $acc;
    }

    /**
     * @param list<string> $list
     *
     * @return list<string>
     */
    private function removeFirstOccurrence(array $list, string $value): array
    {
        foreach ($list as $i => $v) {
            if ($v === $value) {
                unset($list[$i]);

                return array_values($list);
            }
        }

        return $list;
    }

    /**
     * @param array<string, string> $idMap oldFormationId => newFormationId
     */
    private function propagateFormationValidations(array $idMap): int
    {
        if ($idMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(ServiceRecord::class);
        $updated = 0;
        foreach ($repo->findAll() as $sr) {
            if (!$sr instanceof ServiceRecord) {
                continue;
            }
            $fv = $sr->getFormationValidations();
            if ($fv === []) {
                continue;
            }
            $next = [];
            foreach ($fv as $id => $valid) {
                if ($valid !== true) {
                    continue;
                }
                $canonical = $idMap[$id] ?? $id;
                $next[$canonical] = true;
            }
            if ($next !== $fv) {
                $sr->setFormationValidations($next);
                ++$updated;
            }
        }

        return $updated;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function propagateComptaReasons(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(ComptaEntry::class);
        $updated = 0;
        foreach ($repo->findAll() as $e) {
            if (!$e instanceof ComptaEntry) {
                continue;
            }
            $r = $e->getReason();
            if ($r !== '' && isset($renameMap[$r])) {
                $e->setReason($renameMap[$r]);
                ++$updated;
            }
        }

        return $updated;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function propagateSeizureNotes(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(SeizureRecord::class);
        $updated = 0;
        foreach ($repo->findAll() as $record) {
            if (!$record instanceof SeizureRecord) {
                continue;
            }
            $notes = $record->getNotes();
            if ($notes === null || $notes === '') {
                continue;
            }
            $trimmed = trim($notes);
            if (isset($renameMap[$trimmed])) {
                $record->setNotes($renameMap[$trimmed]);
                ++$updated;
            }
        }

        return $updated;
    }

    /**
     * Each non-empty line: if the trimmed line is a catalog/contravention label, replace with the new label.
     *
     * @param array<string, string> $renameMap
     */
    private function propagateServiceRecordCartBoat(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(ServiceRecord::class);
        $updated = 0;
        foreach ($repo->findAll() as $sr) {
            if (!$sr instanceof ServiceRecord) {
                continue;
            }
            $changed = false;
            $cart = $sr->getCartInfo();
            $boat = $sr->getBoatInfo();
            $newCart = $this->applyRenameToMultilinePreservingLayout($cart, $renameMap);
            $newBoat = $this->applyRenameToMultilinePreservingLayout($boat, $renameMap);
            if ($newCart !== $cart) {
                $sr->setCartInfo($newCart);
                $changed = true;
            }
            if ($newBoat !== $boat) {
                $sr->setBoatInfo($newBoat);
                $changed = true;
            }
            if ($changed) {
                ++$updated;
            }
        }

        return $updated;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function applyRenameToMultilinePreservingLayout(?string $text, array $renameMap): ?string
    {
        if ($text === null || trim($text) === '') {
            return $text;
        }
        $lines = preg_split('/\R/u', $text);
        if ($lines === false) {
            return $text;
        }
        $out = [];
        foreach ($lines as $line) {
            $t = trim($line);
            if ($t !== '' && isset($renameMap[$t])) {
                $out[] = $renameMap[$t];
            } else {
                $out[] = $line;
            }
        }

        return implode("\n", $out);
    }

    /**
     * @param list<string> $beforeNames
     * @param list<string> $afterNames
     *
     * @return array<string, string>
     */
    private function singletonRenameMap(array $beforeNames, array $afterNames): array
    {
        $bu = array_values(array_unique(array_values(array_filter(
            array_map(static fn (string $s): string => trim($s), $beforeNames),
            static fn (string $s): bool => $s !== ''
        ))));
        $au = array_values(array_unique(array_values(array_filter(
            array_map(static fn (string $s): string => trim($s), $afterNames),
            static fn (string $s): bool => $s !== ''
        ))));

        $oldOnly = array_values(array_diff($bu, $au));
        $newOnly = array_values(array_diff($au, $bu));
        if (\count($oldOnly) !== 1 || \count($newOnly) !== 1) {
            return [];
        }

        return [$oldOnly[0] => $newOnly[0]];
    }

    /**
     * @param array<string, string> $base
     * @param array<string, string> $add
     *
     * @return array<string, string>
     */
    private function mergeRenameMaps(array $base, array $add): array
    {
        foreach ($add as $old => $new) {
            if ($old === '' || $new === '' || $old === $new) {
                continue;
            }
            if (!isset($base[$old])) {
                $base[$old] = $new;
                continue;
            }
            if ($base[$old] !== $new) {
                unset($base[$old]);
            }
        }

        return $base;
    }

    /** @param array<int, mixed> $list */
    private function weaponNamesFromList(mixed $list): array
    {
        if (!\is_array($list)) {
            return [];
        }
        $out = [];
        foreach ($list as $el) {
            if (\is_string($el)) {
                $out[] = $el;
                continue;
            }
            if (\is_array($el) && isset($el['name']) && \is_string($el['name'])) {
                $out[] = $el['name'];
            }
        }

        return $out;
    }

    /** @param list<array<string, mixed>>|mixed $categories */
    private function indexItemCategories(mixed $categories): array
    {
        if (!\is_array($categories)) {
            return [];
        }
        $out = [];
        foreach ($categories as $c) {
            if (!\is_array($c) || !isset($c['id']) || !\is_string($c['id']) || $c['id'] === '') {
                continue;
            }
            $out[$c['id']] = $c;
        }

        return $out;
    }

    /** @param array<string, mixed> $categoryRow */
    private function itemNamesFromCategoryRow(array $categoryRow): array
    {
        $items = $categoryRow['items'] ?? [];
        if (!\is_array($items)) {
            return [];
        }
        $out = [];
        foreach ($items as $it) {
            if (!\is_array($it) || !isset($it['name']) || !\is_string($it['name'])) {
                continue;
            }
            $out[] = $it['name'];
        }

        return $out;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function propagateSeizureItemWeapon(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(SeizureRecord::class);
        $updated = 0;
        foreach ($repo->findAll() as $record) {
            if (!$record instanceof SeizureRecord) {
                continue;
            }
            if ($record->getType() === SeizureRecord::TYPE_ITEM) {
                $name = $record->getItemName();
                if ($name !== null && $name !== '' && isset($renameMap[$name])) {
                    $record->setItemName($renameMap[$name]);
                    ++$updated;
                }
            } elseif ($record->getType() === SeizureRecord::TYPE_WEAPON) {
                $model = $record->getWeaponModel();
                if ($model !== null && $model !== '' && isset($renameMap[$model])) {
                    $record->setWeaponModel($renameMap[$model]);
                    ++$updated;
                }
            }
        }

        return $updated;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function propagateDestructions(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(DestructionRecord::class);
        $updated = 0;
        foreach ($repo->findAll() as $dr) {
            if (!$dr instanceof DestructionRecord) {
                continue;
            }
            $lines = $dr->getLines();
            $changed = false;
            foreach ($lines as $i => $line) {
                if (!\is_array($line)) {
                    continue;
                }
                $d = $line['destruction'] ?? '';
                if (!\is_string($d) || $d === '' || $d === SeizureRecord::DESTRUCTION_LINE_KEY_CASH) {
                    continue;
                }
                $newD = $this->applyRenameToDestructionToken($d, $renameMap);
                if ($newD !== $d) {
                    $lines[$i]['destruction'] = $newD;
                    $changed = true;
                }
            }
            if ($changed) {
                $dr->setLines($lines);
                ++$updated;
            }
        }

        return $updated;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function applyRenameToDestructionToken(string $token, array $renameMap): string
    {
        if (str_contains($token, '|')) {
            $parts = explode('|', $token, 2);
            $model = trim($parts[0]);
            $serial = $parts[1] ?? '';
            if ($model !== '' && isset($renameMap[$model])) {
                return $renameMap[$model] . '|' . $serial;
            }

            return $token;
        }
        if (isset($renameMap[$token])) {
            return $renameMap[$token];
        }

        return $token;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function propagateBureauWeapons(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(BureauWeapon::class);
        $updated = 0;
        foreach ($repo->findAll() as $w) {
            if (!$w instanceof BureauWeapon) {
                continue;
            }
            $model = $w->getModel();
            if ($model !== '' && isset($renameMap[$model])) {
                $w->setModel($renameMap[$model]);
                ++$updated;
            }
        }

        return $updated;
    }

    /**
     * @param array<string, string> $renameMap
     */
    private function propagateServiceRecordWeapons(array $renameMap): int
    {
        if ($renameMap === []) {
            return 0;
        }
        $repo = $this->entityManager->getRepository(ServiceRecord::class);
        $updated = 0;
        foreach ($repo->findAll() as $sr) {
            if (!$sr instanceof ServiceRecord) {
                continue;
            }
            $changed = false;
            $pairs = [
                [$sr->getPrimaryWeapon(), fn (?string $v) => $sr->setPrimaryWeapon($v)],
                [$sr->getSecondaryWeapon(), fn (?string $v) => $sr->setSecondaryWeapon($v)],
                [$sr->getThirdWeapon(), fn (?string $v) => $sr->setThirdWeapon($v)],
                [$sr->getTranquilizerWeapon(), fn (?string $v) => $sr->setTranquilizerWeapon($v)],
            ];
            foreach ($pairs as [$current, $setter]) {
                if ($current === null || $current === '') {
                    continue;
                }
                if (isset($renameMap[$current])) {
                    $setter($renameMap[$current]);
                    $changed = true;
                }
            }
            if ($changed) {
                ++$updated;
            }
        }

        return $updated;
    }
}
