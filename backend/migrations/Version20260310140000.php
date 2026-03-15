<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260310140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute service_record.formation_validations (JSON) pour formations dynamiques par catalogue référentiel';
    }

    public function up(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform();
        $platformName = $platform ? $platform::class : '';

        if (str_contains($platformName, 'PostgreSQL')) {
            $this->addSql("ALTER TABLE service_record ADD formation_validations JSONB DEFAULT '{}'::jsonb NOT NULL");
        } elseif (str_contains($platformName, 'MySQL')) {
            $this->addSql('ALTER TABLE service_record ADD formation_validations JSON NULL');
            $this->addSql("UPDATE service_record SET formation_validations = '{}' WHERE formation_validations IS NULL");
            $this->addSql('ALTER TABLE service_record MODIFY formation_validations JSON NOT NULL');
        } else {
            $this->addSql('ALTER TABLE service_record ADD formation_validations JSON DEFAULT (\'{}\') NOT NULL');
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record DROP formation_validations');
    }
}
