<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260307120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Adapt entities to data CSVs: ServiceRecord extras, Amende, ComptaEntry, BureauWeapon, BureauInventory, StaffMember, SeizedItemType';
    }

    public function up(Schema $schema): void
    {
        // ServiceRecord: prêt bureau + formation
        $this->addSql('ALTER TABLE service_record ADD primary_weapon VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD primary_weapon_serial VARCHAR(32) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD has_scope BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD secondary_weapon VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD secondary_weapon_serial VARCHAR(32) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD cart_info VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD lead_patrol BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD shooting BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD interventions BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD robberies BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD sales BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD census BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD register_seizure BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD complaints BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD reports BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD sisika BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD wanted_request BOOLEAN NOT NULL DEFAULT FALSE');

        // Amende (amendes.csv)
        $this->addSql('CREATE TABLE amende (id UUID NOT NULL, date_il VARCHAR(16) DEFAULT NULL, nom VARCHAR(128) NOT NULL, telegram VARCHAR(32) DEFAULT NULL, arrest_number VARCHAR(32) DEFAULT NULL, amount VARCHAR(32) DEFAULT NULL, due_date VARCHAR(16) DEFAULT NULL, reminder_date VARCHAR(32) DEFAULT NULL, reminder_due VARCHAR(16) DEFAULT NULL, judge_contact BOOLEAN NOT NULL DEFAULT FALSE, wanted_in_progress BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');

        // ComptaEntry (compta.csv)
        $this->addSql('CREATE TABLE compta_entry (id UUID NOT NULL, type VARCHAR(16) NOT NULL, date VARCHAR(16) NOT NULL, sheriff VARCHAR(128) NOT NULL, reason VARCHAR(255) NOT NULL, amount VARCHAR(32) NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');

        // BureauWeapon (coffres.csv - recensement armes)
        $this->addSql('CREATE TABLE bureau_weapon (id UUID NOT NULL, model VARCHAR(64) NOT NULL, serial_number VARCHAR(32) NOT NULL, on_loan BOOLEAN NOT NULL DEFAULT FALSE, in_chest BOOLEAN NOT NULL DEFAULT FALSE, has_scope BOOLEAN NOT NULL DEFAULT FALSE, comments VARCHAR(128) DEFAULT NULL, is_seized BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');

        // BureauInventory (coffres.csv - inventaire)
        $this->addSql('CREATE TABLE bureau_inventory (id UUID NOT NULL, category VARCHAR(64) NOT NULL, name VARCHAR(128) NOT NULL, quantity INT NOT NULL DEFAULT 0, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_bureau_inventory_category_name ON bureau_inventory (category, name)');

        // StaffMember (bdd.csv - effectifs)
        $this->addSql('CREATE TABLE staff_member (id UUID NOT NULL, sort_order INT NOT NULL, name VARCHAR(128) NOT NULL, status VARCHAR(32) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');

        // SeizedItemType (bdd.csv - item saisie)
        $this->addSql('CREATE TABLE seized_item_type (id UUID NOT NULL, name VARCHAR(128) NOT NULL, unit_price VARCHAR(32) DEFAULT NULL, destruction_price VARCHAR(32) DEFAULT NULL, total_value VARCHAR(32) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE UNIQUE INDEX uniq_seized_item_type_name ON seized_item_type (name)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record DROP COLUMN primary_weapon');
        $this->addSql('ALTER TABLE service_record DROP COLUMN primary_weapon_serial');
        $this->addSql('ALTER TABLE service_record DROP COLUMN has_scope');
        $this->addSql('ALTER TABLE service_record DROP COLUMN secondary_weapon');
        $this->addSql('ALTER TABLE service_record DROP COLUMN secondary_weapon_serial');
        $this->addSql('ALTER TABLE service_record DROP COLUMN cart_info');
        $this->addSql('ALTER TABLE service_record DROP COLUMN lead_patrol');
        $this->addSql('ALTER TABLE service_record DROP COLUMN shooting');
        $this->addSql('ALTER TABLE service_record DROP COLUMN interventions');
        $this->addSql('ALTER TABLE service_record DROP COLUMN robberies');
        $this->addSql('ALTER TABLE service_record DROP COLUMN sales');
        $this->addSql('ALTER TABLE service_record DROP COLUMN census');
        $this->addSql('ALTER TABLE service_record DROP COLUMN register_seizure');
        $this->addSql('ALTER TABLE service_record DROP COLUMN complaints');
        $this->addSql('ALTER TABLE service_record DROP COLUMN reports');
        $this->addSql('ALTER TABLE service_record DROP COLUMN sisika');
        $this->addSql('ALTER TABLE service_record DROP COLUMN wanted_request');

        $this->addSql('DROP TABLE amende');
        $this->addSql('DROP TABLE compta_entry');
        $this->addSql('DROP TABLE bureau_weapon');
        $this->addSql('DROP TABLE bureau_inventory');
        $this->addSql('DROP TABLE staff_member');
        $this->addSql('DROP TABLE seized_item_type');
    }
}
