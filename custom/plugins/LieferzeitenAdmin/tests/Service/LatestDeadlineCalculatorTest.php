<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Service;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use LieferzeitenAdmin\Service\BaseDateResolver;
use LieferzeitenAdmin\Service\BusinessDayDeliveryDateCalculator;
use LieferzeitenAdmin\Service\ChannelDateSettingsProvider;
use LieferzeitenAdmin\Service\LatestDeadlineCalculator;
use PHPUnit\Framework\TestCase;
use Shopware\Core\System\SystemConfig\SystemConfigService;

class LatestDeadlineCalculatorTest extends TestCase
{
    private Connection $connection;

    protected function setUp(): void
    {
        $this->connection = DriverManager::getConnection(['url' => 'sqlite:///:memory:']);
        $this->connection->executeStatement('CREATE TABLE lieferzeiten_channel_settings (sales_channel_id TEXT, shipping_working_days INTEGER, shipping_cutoff TEXT, delivery_working_days INTEGER, delivery_cutoff TEXT)');
    }

    public function testCalculatesFromOrderDateForRegularPayment(): void
    {
        $calculator = $this->createCalculator('{"shipping":{"workingDays":0,"cutoff":"12:00"},"delivery":{"workingDays":2,"cutoff":"12:00"}}');

        $result = $calculator->calculate([
            'paymentMethod' => 'Rechnung',
            'orderDate' => '2026-02-02 09:00:00',
            'paymentDate' => '2026-02-10 09:00:00',
        ], null, 'shopware');

        static::assertSame('order_date', $result['baseDateType']);
        static::assertFalse($result['missingPaymentDate']);
        static::assertSame('2026-02-02 09:00:00', $result['latestShipping']?->format('Y-m-d H:i:s'));
        static::assertSame('2026-02-04 09:00:00', $result['latestDelivery']?->format('Y-m-d H:i:s'));
    }

    public function testCalculatesFromPaymentDateForPrepaymentAndUsesSalesChannelSettings(): void
    {
        $this->connection->insert('lieferzeiten_channel_settings', [
            'sales_channel_id' => 'sc-1',
            'shipping_working_days' => 1,
            'shipping_cutoff' => '12:00',
            'delivery_working_days' => 3,
            'delivery_cutoff' => '12:00',
        ]);

        $calculator = $this->createCalculator('{"shipping":{"workingDays":0,"cutoff":"12:00"},"delivery":{"workingDays":1,"cutoff":"12:00"}}');

        $result = $calculator->calculate([
            'paymentMethod' => 'Vorkasse',
            'orderDate' => '2026-02-02 09:00:00',
            'paymentDate' => '2026-02-05 10:00:00',
        ], 'sc-1', 'shopware');

        static::assertSame('payment_date', $result['baseDateType']);
        static::assertSame('2026-02-06 10:00:00', $result['latestShipping']?->format('Y-m-d H:i:s'));
        static::assertSame('2026-02-10 10:00:00', $result['latestDelivery']?->format('Y-m-d H:i:s'));
    }

    private function createCalculator(string $systemConfig): LatestDeadlineCalculator
    {
        $config = $this->createMock(SystemConfigService::class);
        $config->method('get')->willReturn($systemConfig);

        return new LatestDeadlineCalculator(
            new BaseDateResolver(),
            new ChannelDateSettingsProvider($config, $this->connection),
            new BusinessDayDeliveryDateCalculator(),
        );
    }
}
