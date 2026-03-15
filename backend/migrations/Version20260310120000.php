<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260310120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table destruction_record — historique des saisies destruction (statut : pending, reussie, perdue)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE destruction_record (
            id UUID NOT NULL,
            lines JSON NOT NULL,
            status VARCHAR(16) NOT NULL,
            created_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
            validated_at TIMESTAMP(0) WITHOUT TIME ZONE DEFAULT NULL,
            created_by VARCHAR(128) DEFAULT NULL,
            PRIMARY KEY(id)
        )');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE destruction_record');
    }
}
