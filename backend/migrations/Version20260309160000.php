<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260309160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Étendre cart_info (service_record) pour plusieurs véhicules (séparés par \\n)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record ALTER COLUMN cart_info TYPE VARCHAR(512)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record ALTER COLUMN cart_info TYPE VARCHAR(64)');
    }
}
