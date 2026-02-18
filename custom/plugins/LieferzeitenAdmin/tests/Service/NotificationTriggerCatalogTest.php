<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Service;

use LieferzeitenAdmin\Service\Notification\NotificationTriggerCatalog;
use PHPUnit\Framework\TestCase;

class NotificationTriggerCatalogTest extends TestCase
{
    public function testChannelsOnlyContainEmail(): void
    {
        static::assertSame(['email'], NotificationTriggerCatalog::channels());
    }

    public function testRequiredNotificationConfigTriggersContainExactlyTenUniqueEntries(): void
    {
        $required = NotificationTriggerCatalog::requiredForNotificationConfig();

        static::assertCount(10, $required);
        static::assertSame($required, array_values(array_unique($required)));
    }

    public function testCanonicalizeResolvesLegacyAliases(): void
    {
        static::assertSame(
            NotificationTriggerCatalog::DELIVERY_DATE_ASSIGNED,
            NotificationTriggerCatalog::canonicalize('date_livraison.attribuee')
        );
        static::assertSame(
            NotificationTriggerCatalog::DELIVERY_DATE_UPDATED,
            NotificationTriggerCatalog::canonicalize('date_livraison.modifiee')
        );
        static::assertSame(
            NotificationTriggerCatalog::ORDER_CREATED,
            NotificationTriggerCatalog::canonicalize(NotificationTriggerCatalog::ORDER_CREATED)
        );
    }
}
