<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260324120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute arme 3 + fusil tranquillisant + lunettes par arme dans service_record';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record ADD secondary_has_scope BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD third_weapon VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD third_weapon_serial VARCHAR(32) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD third_has_scope BOOLEAN NOT NULL DEFAULT FALSE');
        $this->addSql('ALTER TABLE service_record ADD tranquilizer_weapon VARCHAR(64) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD tranquilizer_weapon_serial VARCHAR(32) DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD tranquilizer_has_scope BOOLEAN NOT NULL DEFAULT FALSE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record DROP secondary_has_scope');
        $this->addSql('ALTER TABLE service_record DROP third_weapon');
        $this->addSql('ALTER TABLE service_record DROP third_weapon_serial');
        $this->addSql('ALTER TABLE service_record DROP third_has_scope');
        $this->addSql('ALTER TABLE service_record DROP tranquilizer_weapon');
        $this->addSql('ALTER TABLE service_record DROP tranquilizer_weapon_serial');
        $this->addSql('ALTER TABLE service_record DROP tranquilizer_has_scope');
    }
}
