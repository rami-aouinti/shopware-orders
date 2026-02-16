<?php declare(strict_types=1);

namespace ExternalOrders\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration2026021800DeliveryDateEditorState extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 2026021800;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement(
            'CREATE TABLE IF NOT EXISTS `external_order_delivery_date_state` (
                `id` BINARY(16) NOT NULL,
                `order_id` BINARY(16) NOT NULL,
                `position_id` VARCHAR(64) NOT NULL,
                `supplier_from` DATE NULL,
                `supplier_to` DATE NULL,
                `new_from` DATE NULL,
                `new_to` DATE NULL,
                `last_validation_errors` JSON NULL,
                `created_at` DATETIME(3) NOT NULL,
                `updated_at` DATETIME(3) NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uniq.external_order_delivery_date_state.order_position` (`order_id`, `position_id`),
                KEY `idx.external_order_delivery_date_state.order` (`order_id`),
                CONSTRAINT `fk.external_order_delivery_date_state.order` FOREIGN KEY (`order_id`)
                    REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
        );

        $connection->executeStatement(
            'CREATE TABLE IF NOT EXISTS `external_order_delivery_date_history` (
                `id` BINARY(16) NOT NULL,
                `order_id` BINARY(16) NOT NULL,
                `position_id` VARCHAR(64) NOT NULL,
                `field_name` VARCHAR(64) NOT NULL,
                `previous_from` DATE NULL,
                `previous_to` DATE NULL,
                `next_from` DATE NULL,
                `next_to` DATE NULL,
                `changed_by_user` VARCHAR(255) NULL,
                `created_at` DATETIME(3) NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx.external_order_delivery_date_history.order_position` (`order_id`, `position_id`),
                KEY `idx.external_order_delivery_date_history.field_name` (`field_name`),
                CONSTRAINT `fk.external_order_delivery_date_history.order` FOREIGN KEY (`order_id`)
                    REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
        );
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
