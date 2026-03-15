<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260308160000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Table county_reference (informations sur l\'image : armes, items, contraventions)';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE county_reference (id UUID NOT NULL, data JSON NOT NULL, updated_at TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL, PRIMARY KEY(id))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE county_reference');
    }
}
