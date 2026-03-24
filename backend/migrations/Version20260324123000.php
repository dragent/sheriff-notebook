<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324123000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Supprime la clé value des items de référence stockés en JSON';
    }

    public function up(Schema $schema): void
    {
        $rows = $this->connection->fetchAllAssociative('SELECT id, data FROM county_reference');

        foreach ($rows as $row) {
            $rawData = $row['data'] ?? null;
            if (!\is_string($rawData) || $rawData === '') {
                continue;
            }

            $decoded = json_decode($rawData, true);
            if (!\is_array($decoded)) {
                continue;
            }

            if (!isset($decoded['itemCategories']) || !\is_array($decoded['itemCategories'])) {
                continue;
            }

            $changed = false;
            foreach ($decoded['itemCategories'] as $catIndex => $category) {
                if (!\is_array($category) || !isset($category['items']) || !\is_array($category['items'])) {
                    continue;
                }

                foreach ($category['items'] as $itemIndex => $item) {
                    if (\is_array($item) && array_key_exists('value', $item)) {
                        unset($item['value']);
                        $decoded['itemCategories'][$catIndex]['items'][$itemIndex] = $item;
                        $changed = true;
                    }
                }
            }

            if (!$changed) {
                continue;
            }

            $encoded = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if (!\is_string($encoded)) {
                continue;
            }

            $this->connection->executeStatement(
                'UPDATE county_reference SET data = :data WHERE id = :id',
                [
                    'data' => $encoded,
                    'id' => $row['id'],
                ]
            );
        }
    }

    public function down(Schema $schema): void
    {
        // Impossible de restaurer automatiquement les anciennes valeurs supprimées.
    }
}

