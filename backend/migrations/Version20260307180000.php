<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260307180000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add User.grade for Shérif / Sheriff adjoint / Comté';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" ADD grade VARCHAR(64) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE "user" DROP grade');
    }
}
