<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Rattrapage : s'assurer que service_record.has_scope existe (lunette arme primaire).
 * Sans impact si la colonne a déjà été créée par Version20260307120000.
 */
final class Version20250312120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'S\'assurer que service_record.has_scope existe (lunette arme primaire)';
    }

    public function up(Schema $schema): void
    {
        $table = $schema->getTable('service_record');
        if ($table->hasColumn('has_scope')) {
            return;
        }
        $this->addSql('ALTER TABLE service_record ADD has_scope BOOLEAN NOT NULL DEFAULT FALSE');
    }

    public function down(Schema $schema): void
    {
        $table = $schema->getTable('service_record');
        if (!$table->hasColumn('has_scope')) {
            return;
        }
        $this->addSql('ALTER TABLE service_record DROP COLUMN has_scope');
    }
}
