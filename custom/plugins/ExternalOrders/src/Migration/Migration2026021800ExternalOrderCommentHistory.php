<?php declare(strict_types=1);

namespace ExternalOrders\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration2026021800ExternalOrderCommentHistory extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 2026021800;
    }

    public function update(Connection $connection): void
    {
        $connection->executeStatement(
            'CREATE TABLE IF NOT EXISTS `external_order_comment_history` (
                `id` BINARY(16) NOT NULL,
                `external_order_data_id` BINARY(16) NOT NULL,
                `order_id` BINARY(16) NOT NULL,
                `position_id` VARCHAR(255) NOT NULL,
                `package_id` VARCHAR(255) NULL,
                `old_comment` LONGTEXT NOT NULL,
                `new_comment` LONGTEXT NOT NULL,
                `changed_by` VARCHAR(255) NOT NULL,
                `created_at` DATETIME(3) NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx.external_order_comment_history.order_context` (`order_id`, `position_id`, `package_id`),
                KEY `idx.external_order_comment_history.external_order_data_id` (`external_order_data_id`),
                CONSTRAINT `fk.external_order_comment_history.external_order_data_id` FOREIGN KEY (`external_order_data_id`)
                    REFERENCES `external_order_data` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT `fk.external_order_comment_history.order_id` FOREIGN KEY (`order_id`)
                    REFERENCES `order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
        );
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}

