<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Cash seizure quantities were stored as whole dollars (integer).
 * They are now stored in cents so fractional dollar amounts (2 decimals) can be represented in the API.
 */
final class Version20260511120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Convert seizure_record cash quantities from dollars to cents';
    }

    public function up(Schema $schema): void
    {
        $this->addSql("UPDATE seizure_record SET quantity = quantity * 100 WHERE type = 'cash'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql("UPDATE seizure_record SET quantity = quantity / 100 WHERE type = 'cash'");
    }
}
