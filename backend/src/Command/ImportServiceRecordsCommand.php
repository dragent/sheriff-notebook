<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\ServiceRecord;
use App\Repository\ServiceRecordRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\HttpKernel\KernelInterface;

#[AsCommand(
    name: 'app:import-services',
    description: 'Import service records from CSV (data/infos_prises_service.csv)',
)]
final class ImportServiceRecordsCommand extends Command
{
    public function __construct(
        private readonly KernelInterface $kernel,
        private readonly ServiceRecordRepository $repository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $csvPath = $this->kernel->getProjectDir().\DIRECTORY_SEPARATOR.'..'.\DIRECTORY_SEPARATOR.'data'.\DIRECTORY_SEPARATOR.'infos_prises_service.csv';
        if (!is_file($csvPath)) {
            $io->error(\sprintf('CSV not found: %s', $csvPath));

            return Command::FAILURE;
        }

        $handle = fopen($csvPath, 'r');
        if (false === $handle) {
            $io->error('Unable to open CSV.');

            return Command::FAILURE;
        }

        $headerSeen = false;
        $created = 0;
        $updated = 0;
        $skipped = 0;

        try {
            while (($row = fgetcsv($handle, 0, ',')) !== false) {
                if (!\is_array($row)) {
                    ++$skipped;
                    continue;
                }

                $cells = self::normalizeRow($row);
                if ([] === $cells) {
                    ++$skipped;
                    continue;
                }

                if (!$headerSeen) {
                    if (\in_array('NOM', $cells, true) && \in_array('Jour', $cells, true) && \in_array('Soir', $cells, true)) {
                        $headerSeen = true;
                    }
                    continue;
                }

                $name = $cells[2] ?? '';
                $name = trim($name);
                if ('' === $name) {
                    ++$skipped;
                    continue;
                }

                $telegramPrimary = $cells[3] ?? null;
                $total = $cells[1] ?? null;

                $record = $this->repository->findOneBy(['name' => $name]);
                if (!$record instanceof ServiceRecord) {
                    $record = new ServiceRecord($name);
                    $this->entityManager->persist($record);
                    ++$created;
                } else {
                    ++$updated;
                }

                $record->setTotal(self::toNullableInt($total));
                $record->setTelegramPrimary($telegramPrimary);

                $record->setMonDay(self::toBool($cells[5] ?? null));
                $record->setMonNight(self::toBool($cells[6] ?? null));
                $record->setTueDay(self::toBool($cells[7] ?? null));
                $record->setTueNight(self::toBool($cells[8] ?? null));
                $record->setWedDay(self::toBool($cells[9] ?? null));
                $record->setWedNight(self::toBool($cells[10] ?? null));
                $record->setThuDay(self::toBool($cells[11] ?? null));
                $record->setThuNight(self::toBool($cells[12] ?? null));
                $record->setFriDay(self::toBool($cells[13] ?? null));
                $record->setFriNight(self::toBool($cells[14] ?? null));
                $record->setSatDay(self::toBool($cells[15] ?? null));
                $record->setSatNight(self::toBool($cells[16] ?? null));
                $record->setSunDay(self::toBool($cells[17] ?? null));
                $record->setSunNight(self::toBool($cells[18] ?? null));
            }
        } finally {
            fclose($handle);
        }

        $this->entityManager->flush();

        $io->success(\sprintf('Import complete. created=%d updated=%d skipped=%d', $created, $updated, $skipped));

        return Command::SUCCESS;
    }

    /**
     * The exported CSV has leading empty columns; normalize to real columns.
     *
     * @param list<string|null> $row
     *
     * @return list<string>
     */
    private static function normalizeRow(array $row): array
    {
        $cells = array_map(
            static fn ($v) => \is_string($v) ? trim($v) : '',
            $row,
        );

        while ([] !== $cells && '' === $cells[0]) {
            array_shift($cells);
        }

        $out = [];
        foreach ($cells as $cell) {
            $out[] = $cell;
        }

        while ([] !== $out && '' === $out[\count($out) - 1]) {
            array_pop($out);
        }

        return $out;
    }

    private static function toBool(?string $value): bool
    {
        if (null === $value) {
            return false;
        }

        $v = strtolower(trim($value));

        return 'true' === $v || '1' === $v || 'yes' === $v;
    }

    private static function toNullableInt(?string $value): ?int
    {
        if (null === $value) {
            return null;
        }

        $v = trim($value);
        if ('' === $v) {
            return null;
        }

        if (!ctype_digit($v)) {
            return null;
        }

        return (int) $v;
    }
}
