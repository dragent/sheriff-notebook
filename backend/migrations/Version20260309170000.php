<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260309170000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajouter boat_info (bateaux) sur service_record — calèche ou bateau';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record ADD boat_info VARCHAR(512) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record DROP COLUMN boat_info');
    }
}
