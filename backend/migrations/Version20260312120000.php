<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260312120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Supprime les tables dossier et amende (non utilisées par le frontend)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('DROP TABLE IF EXISTS amende');
        $this->addSql('DROP TABLE IF EXISTS dossier');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('CREATE TABLE amende (id UUID NOT NULL, date_il VARCHAR(16) DEFAULT NULL, nom VARCHAR(128) NOT NULL, telegram VARCHAR(32) DEFAULT NULL, arrest_number VARCHAR(32) DEFAULT NULL, amount VARCHAR(32) DEFAULT NULL, due_date VARCHAR(16) DEFAULT NULL, reminder_date VARCHAR(32) DEFAULT NULL, reminder_due VARCHAR(16) DEFAULT NULL, judge_contact BOOLEAN NOT NULL DEFAULT FALSE, wanted_in_progress BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE TABLE dossier (id UUID NOT NULL, reference VARCHAR(32) NOT NULL, category VARCHAR(128) DEFAULT NULL, creation VARCHAR(16) DEFAULT NULL, maj VARCHAR(16) DEFAULT NULL, title VARCHAR(255) DEFAULT NULL, sheriff_in_charge VARCHAR(128) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_dossier_reference ON dossier (reference)');
    }
}
