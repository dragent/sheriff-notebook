<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260330120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add seizure cancel fields, seizure_record_event audit trail, and service planning snapshots';
    }

    public function up(Schema $schema): void
    {
        $platform = $this->connection->getDatabasePlatform();
        $platformName = $platform ? $platform::class : '';

        // Seizure cancel fields
        $this->addSql('ALTER TABLE seizure_record ADD cancelled_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL');
        $this->addSql('ALTER TABLE seizure_record ADD cancelled_reason VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE seizure_record ADD cancelled_by VARCHAR(128) DEFAULT NULL');

        // Audit trail table
        if (str_contains($platformName, 'PostgreSQL')) {
            $this->addSql('CREATE TABLE seizure_record_event (id UUID NOT NULL, record_id UUID NOT NULL, action VARCHAR(16) NOT NULL, actor VARCHAR(128) NOT NULL, diff JSONB DEFAULT NULL, reason VARCHAR(255) DEFAULT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        } else {
            $this->addSql('CREATE TABLE seizure_record_event (id UUID NOT NULL, record_id UUID NOT NULL, action VARCHAR(16) NOT NULL, actor VARCHAR(128) NOT NULL, diff JSON DEFAULT NULL, reason VARCHAR(255) DEFAULT NULL, created_at DATETIME NOT NULL, PRIMARY KEY(id))');
        }
        $this->addSql('CREATE INDEX idx_seizure_record_event_record_created ON seizure_record_event (record_id, created_at)');
        $this->addSql('ALTER TABLE seizure_record_event ADD CONSTRAINT FK_SEIZURE_RECORD_EVENT_RECORD FOREIGN KEY (record_id) REFERENCES seizure_record (id) ON DELETE CASCADE');

        // Planning reset snapshots (store a copy of the presences table before reset)
        if (str_contains($platformName, 'PostgreSQL')) {
            $this->addSql('CREATE TABLE service_planning_snapshot (id UUID NOT NULL, actor VARCHAR(128) NOT NULL, data JSONB NOT NULL, created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
        } else {
            $this->addSql('CREATE TABLE service_planning_snapshot (id UUID NOT NULL, actor VARCHAR(128) NOT NULL, data JSON NOT NULL, created_at DATETIME NOT NULL, PRIMARY KEY(id))');
        }
        $this->addSql('CREATE INDEX idx_service_planning_snapshot_created ON service_planning_snapshot (created_at)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE seizure_record DROP cancelled_at');
        $this->addSql('ALTER TABLE seizure_record DROP cancelled_reason');
        $this->addSql('ALTER TABLE seizure_record DROP cancelled_by');
        $this->addSql('DROP TABLE seizure_record_event');
        $this->addSql('DROP TABLE service_planning_snapshot');
    }
}

