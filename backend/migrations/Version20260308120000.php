<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260308120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Remove telegram_secondary from service_record (one telegram only)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record DROP COLUMN telegram_secondary');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record ADD telegram_secondary VARCHAR(32) DEFAULT NULL');
    }
}
