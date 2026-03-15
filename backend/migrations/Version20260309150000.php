<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260309150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table seizure_record (saisies — items et armes)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE seizure_record (
            id UUID NOT NULL,
            type VARCHAR(16) NOT NULL,
            date VARCHAR(16) NOT NULL,
            sheriff VARCHAR(128) NOT NULL,
            quantity INT NOT NULL,
            item_name VARCHAR(255) DEFAULT NULL,
            weapon_model VARCHAR(255) DEFAULT NULL,
            serial_number VARCHAR(64) DEFAULT NULL,
            possessed_by VARCHAR(255) DEFAULT NULL,
            notes VARCHAR(512) DEFAULT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            PRIMARY KEY(id)
        )');
        $this->addSql('COMMENT ON TABLE seizure_record IS \'Enregistrements de saisies (page Saisies)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE seizure_record');
    }
}
