<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration2026021421SendenummerHistoryActiveFlag extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 2026021421;
    }

    public function update(Connection $connection): void
    {
        $exists = (bool) $connection->fetchOne(
            'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName AND COLUMN_NAME = :columnName',
            ['tableName' => 'lieferzeiten_sendenummer_history', 'columnName' => 'is_active'],
        );

        if ($exists) {
            return;
        }

        $connection->executeStatement('ALTER TABLE `lieferzeiten_sendenummer_history` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `carrier`');
        $connection->executeStatement('UPDATE `lieferzeiten_sendenummer_history` SET `is_active` = 0');

        $connection->executeStatement(
            'UPDATE `lieferzeiten_sendenummer_history` sh
            INNER JOIN (
                SELECT position_id, MAX(created_at) AS latest_created_at
                FROM `lieferzeiten_sendenummer_history`
                GROUP BY position_id
            ) latest ON latest.position_id = sh.position_id AND latest.latest_created_at = sh.created_at
            SET sh.is_active = 1'
        );
    }

    public function updateDestructive(Connection $connection): void
    {
    }
}
