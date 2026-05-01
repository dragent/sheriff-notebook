<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260501130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optimistic-lock version column on county_reference to prevent silent overwrites on concurrent PUT';
    }

    public function up(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform();
        $platformName = $platform ? $platform::class : '';

        if (str_contains($platformName, 'SQLite')) {
            $this->addSql('ALTER TABLE county_reference ADD COLUMN version INTEGER NOT NULL DEFAULT 1');

            return;
        }

        $this->addSql('ALTER TABLE county_reference ADD version INTEGER DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform();
        $platformName = $platform ? $platform::class : '';

        if (str_contains($platformName, 'SQLite')) {
            // SQLite cannot DROP COLUMN before 3.35; left as no-op for old engines.
            return;
        }

        $this->addSql('ALTER TABLE county_reference DROP version');
    }
}
