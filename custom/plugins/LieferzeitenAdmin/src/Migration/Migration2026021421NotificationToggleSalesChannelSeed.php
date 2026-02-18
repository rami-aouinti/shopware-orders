<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Migration;

use Doctrine\DBAL\Connection;
use RuntimeException;
use LieferzeitenAdmin\Service\Notification\NotificationTriggerCatalog;
use Shopware\Core\Defaults;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration2026021421NotificationToggleSalesChannelSeed extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 2026021421;
    }

    public function update(Connection $connection): void
    {
        $this->normalizeLegacyTriggerKeys($connection);
        $this->seedGlobalAndSalesChannelToggles($connection);
    }

    public function updateDestructive(Connection $connection): void
    {
    }

    private function normalizeLegacyTriggerKeys(Connection $connection): void
    {
        $aliasMap = [
            'date_livraison.attribuee' => NotificationTriggerCatalog::DELIVERY_DATE_ASSIGNED,
            'date_livraison.modifiee' => NotificationTriggerCatalog::DELIVERY_DATE_UPDATED,
            'livraison.date.retour' => NotificationTriggerCatalog::RETURN_TO_SENDER,
        ];

        foreach ($aliasMap as $legacyTrigger => $canonicalTrigger) {
            $connection->executeStatement(
                'UPDATE `lieferzeiten_notification_toggle` SET `trigger_key` = :canonical, `code` = CONCAT(:canonical, ":", `channel`) WHERE `trigger_key` = :legacy',
                [
                    'legacy' => $legacyTrigger,
                    'canonical' => $canonicalTrigger,
                ],
            );
            $connection->executeStatement(
                'UPDATE `lieferzeiten_notification_event` SET `trigger_key` = :canonical WHERE `trigger_key` = :legacy',
                [
                    'legacy' => $legacyTrigger,
                    'canonical' => $canonicalTrigger,
                ],
            );
            $connection->executeStatement(
                'UPDATE `lieferzeiten_notification_template` SET `trigger_key` = :canonical WHERE `trigger_key` = :legacy',
                [
                    'legacy' => $legacyTrigger,
                    'canonical' => $canonicalTrigger,
                ],
            );
        }
    }

    private function seedGlobalAndSalesChannelToggles(Connection $connection): void
    {
        $triggerKeys = NotificationTriggerCatalog::requiredForNotificationConfig();
        $channels = NotificationTriggerCatalog::channels();
        $salesChannelIds = $connection->fetchFirstColumn('SELECT LOWER(HEX(`id`)) FROM `sales_channel`');

        foreach ($triggerKeys as $triggerKey) {
            foreach ($channels as $channel) {
                $this->insertToggleIfMissing($connection, $triggerKey, $channel, null);

                foreach ($salesChannelIds as $salesChannelId) {
                    if (!is_string($salesChannelId) || $salesChannelId === '') {
                        continue;
                    }

                    $this->insertToggleIfMissing($connection, $triggerKey, $channel, $salesChannelId);
                }
            }
        }
    }

    private function insertToggleIfMissing(Connection $connection, string $triggerKey, string $channel, ?string $salesChannelId): void
    {
        $exists = $salesChannelId === null
            ? $connection->fetchOne(
                'SELECT 1 FROM `lieferzeiten_notification_toggle` WHERE `trigger_key` = :trigger AND `channel` = :channel AND `sales_channel_id` IS NULL LIMIT 1',
                ['trigger' => $triggerKey, 'channel' => $channel],
            )
            : $connection->fetchOne(
                'SELECT 1 FROM `lieferzeiten_notification_toggle` WHERE `trigger_key` = :trigger AND `channel` = :channel AND `sales_channel_id` = :salesChannelId LIMIT 1',
                ['trigger' => $triggerKey, 'channel' => $channel, 'salesChannelId' => $salesChannelId],
            );

        if ($exists !== false) {
            return;
        }

        $id = $connection->fetchOne('SELECT UUID()');
        if (!is_string($id) || $id === '') {
            throw new RuntimeException('Unable to create UUID for notification toggle seed.');
        }

        $connection->executeStatement(
            'INSERT INTO `lieferzeiten_notification_toggle` (`id`, `code`, `trigger_key`, `channel`, `sales_channel_id`, `enabled`, `created_at`) VALUES (UNHEX(REPLACE(:id, "-", "")), :code, :triggerKey, :channel, :salesChannelId, :enabled, :createdAt)',
            [
                'id' => $id,
                'code' => $triggerKey . ':' . $channel,
                'triggerKey' => $triggerKey,
                'channel' => $channel,
                'salesChannelId' => $salesChannelId,
                'enabled' => 1,
                'createdAt' => (new \DateTimeImmutable())->format(Defaults::STORAGE_DATE_TIME_FORMAT),
            ],
        );
    }
}
