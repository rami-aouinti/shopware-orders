<?php declare(strict_types=1);

namespace ExternalOrders\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration2026021700SupplierRequestTaskCorrelationId extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 2026021700;
    }

    public function update(Connection $connection): void
    {
        $columns = $connection->fetchFirstColumn('SHOW COLUMNS FROM `external_supplier_request_task` LIKE "correlation_id"');

        if (!empty($columns)) {
            return;
        }

        $connection->executeStatement('ALTER TABLE `external_supplier_request_task` ADD COLUMN `correlation_id` VARCHAR(64) NULL AFTER `recipient_user_id`');
        $connection->executeStatement('CREATE INDEX `idx.external_supplier_request_task.correlation` ON `external_supplier_request_task` (`correlation_id`)');
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
