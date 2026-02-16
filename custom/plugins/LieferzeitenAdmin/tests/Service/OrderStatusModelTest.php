<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Service;

use LieferzeitenAdmin\Service\OrderStatusModel;
use PHPUnit\Framework\TestCase;

class OrderStatusModelTest extends TestCase
{
    public function testDefinitionsContainReadAndWriteStrategyForAllBusinessStatuses(): void
    {
        $definitions = OrderStatusModel::definitions();

        static::assertCount(8, $definitions);
        static::assertSame(['shopware', 'gambio'], $definitions[1]['readSources']);
        static::assertSame(['shopware', 'gambio'], $definitions[8]['writeBackTargets']);
        static::assertSame('bidirectional', $definitions[7]['syncMode']);
        static::assertSame('source_read_only', $definitions[1]['matrixRule']);
        static::assertSame('san6_shipping_gate', $definitions[7]['matrixRule']);
        static::assertSame('tracking_completion_gate', $definitions[8]['matrixRule']);
    }

    public function testCanWriteBackOnlyForStatusesSevenAndEight(): void
    {
        static::assertFalse(OrderStatusModel::canWriteBack(6));
        static::assertTrue(OrderStatusModel::canWriteBack(7));
        static::assertTrue(OrderStatusModel::canWriteBack(8));
    }

    public function testFinalAndBlockingParcelStates(): void
    {
        static::assertTrue(OrderStatusModel::isFinalDeliveredParcelState('paketshop_retire'));
        static::assertTrue(OrderStatusModel::isFinalDeliveredParcelState('delivered'));
        static::assertFalse(OrderStatusModel::isFinalDeliveredParcelState('retoure'));

        static::assertTrue(OrderStatusModel::isBlockingParcelState('paketshop_non_retire'));
        static::assertTrue(OrderStatusModel::isBlockingParcelState('zoll_abgelehnt'));
        static::assertTrue(OrderStatusModel::isBlockingParcelState('verweigert'));
        static::assertFalse(OrderStatusModel::isBlockingParcelState('zugestellt'));
    }
}
