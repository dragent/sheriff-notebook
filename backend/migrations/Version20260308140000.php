<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260308140000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'One ServiceRecord per User: add user_id to service_record';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record ADD user_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE service_record ADD CONSTRAINT FK_service_record_user_id FOREIGN KEY (user_id) REFERENCES "user" (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_service_record_user_id ON service_record (user_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE service_record DROP CONSTRAINT FK_service_record_user_id');
        $this->addSql('DROP INDEX UNIQ_service_record_user_id');
        $this->addSql('ALTER TABLE service_record DROP user_id');
    }
}
