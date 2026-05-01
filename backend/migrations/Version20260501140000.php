<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260501140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add optimistic-lock version on service_record for concurrent PATCH';
    }

    public function up(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform();
        $platformName = $platform ? $platform::class : '';

        if (str_contains($platformName, 'SQLite')) {
            $this->addSql('ALTER TABLE service_record ADD COLUMN version INTEGER NOT NULL DEFAULT 1');

            return;
        }

        $this->addSql('ALTER TABLE service_record ADD version INTEGER DEFAULT 1 NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform();
        $platformName = $platform ? $platform::class : '';

        if (str_contains($platformName, 'SQLite')) {
            return;
        }

        $this->addSql('ALTER TABLE service_record DROP version');
    }
}
