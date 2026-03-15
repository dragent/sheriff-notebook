<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260306190000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Initial schema: user + dossier';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE "user" (id UUID NOT NULL, discord_id VARCHAR(64) NOT NULL, username VARCHAR(128) NOT NULL, avatar_url VARCHAR(255) DEFAULT NULL, roles JSON NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_user_discord_id ON "user" (discord_id)');

        $this->addSql('CREATE TABLE dossier (id UUID NOT NULL, reference VARCHAR(32) NOT NULL, category VARCHAR(128) DEFAULT NULL, creation VARCHAR(16) DEFAULT NULL, maj VARCHAR(16) DEFAULT NULL, title VARCHAR(255) DEFAULT NULL, sheriff_in_charge VARCHAR(128) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_dossier_reference ON dossier (reference)');

        $this->addSql('CREATE TABLE service_record (id UUID NOT NULL, name VARCHAR(128) NOT NULL, telegram_primary VARCHAR(32) DEFAULT NULL, telegram_secondary VARCHAR(32) DEFAULT NULL, total INT DEFAULT NULL, mon_day BOOLEAN NOT NULL, mon_night BOOLEAN NOT NULL, tue_day BOOLEAN NOT NULL, tue_night BOOLEAN NOT NULL, wed_day BOOLEAN NOT NULL, wed_night BOOLEAN NOT NULL, thu_day BOOLEAN NOT NULL, thu_night BOOLEAN NOT NULL, fri_day BOOLEAN NOT NULL, fri_night BOOLEAN NOT NULL, sat_day BOOLEAN NOT NULL, sat_night BOOLEAN NOT NULL, sun_day BOOLEAN NOT NULL, sun_night BOOLEAN NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE dossier');
        $this->addSql('DROP TABLE "user"');
    }
}

