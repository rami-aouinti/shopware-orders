<?php declare(strict_types=1);

namespace ExternalOrders\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration2026021600SupplierRequestTask extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 2026021600;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement(
            'CREATE TABLE IF NOT EXISTS `external_supplier_request_task` (
                `id` BINARY(16) NOT NULL,
                `order_id` BINARY(16) NOT NULL,
                `position_id` VARCHAR(128) NOT NULL,
                `initiator_user_id` VARCHAR(32) NULL,
                `recipient_user_id` VARCHAR(32) NULL,
                `status` VARCHAR(32) NOT NULL DEFAULT "open",
                `due_date` DATETIME(3) NOT NULL,
                `completed_at` DATETIME(3) NULL,
                `created_at` DATETIME(3) NOT NULL,
                `updated_at` DATETIME(3) NULL,
                PRIMARY KEY (`id`),
                KEY `idx.external_supplier_request_task.order` (`order_id`),
                KEY `idx.external_supplier_request_task.initiator` (`initiator_user_id`),
                KEY `idx.external_supplier_request_task.recipient` (`recipient_user_id`),
                KEY `idx.external_supplier_request_task.status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
        );
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
