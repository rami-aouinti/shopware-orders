<?php declare(strict_types=1);

namespace ExternalOrders\Tests\Service;

use Doctrine\DBAL\DriverManager;
use ExternalOrders\Dto\DeliveryDateEditorSaveRequestDto;
use ExternalOrders\Service\DeliveryDateEditorService;
use PHPUnit\Framework\TestCase;

class DeliveryDateEditorServiceTest extends TestCase
{
    public function testSaveEditorStateReturnsValidationErrorsForInvalidRanges(): void
    {
        $connection = DriverManager::getConnection(['url' => 'sqlite:///:memory:']);
        $this->createSchema($connection);

        $service = new DeliveryDateEditorService($connection);
        $request = DeliveryDateEditorSaveRequestDto::fromArray([
            'orderId' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            'positionId' => '1',
            'supplierDeliveryDateRange' => ['from' => '2026-03-01', 'to' => '2026-03-20'],
            'newDeliveryDateRange' => ['from' => '2026-03-05', 'to' => '2026-03-05'],
            'changedByUser' => 'tester',
        ]);

        $result = $service->saveEditorState($request);

        static::assertFalse($result['saved']);
        static::assertFalse($result['canSave']);
        static::assertNotEmpty($result['errors']);
        static::assertSame('range_days_out_of_bounds', $result['errors'][0]['code']);
    }

    public function testSaveEditorStatePersistsAndReturnsHistoryAndCalendarWeek(): void
    {
        $connection = DriverManager::getConnection(['url' => 'sqlite:///:memory:']);
        $this->createSchema($connection);

        $service = new DeliveryDateEditorService($connection);

        $first = DeliveryDateEditorSaveRequestDto::fromArray([
            'orderId' => 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            'positionId' => '42',
            'supplierDeliveryDateRange' => ['from' => '2026-03-01', 'to' => '2026-03-03'],
            'newDeliveryDateRange' => ['from' => '2026-03-02', 'to' => '2026-03-04'],
            'changedByUser' => 'alpha',
        ]);
        $second = DeliveryDateEditorSaveRequestDto::fromArray([
            'orderId' => 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            'positionId' => '42',
            'supplierDeliveryDateRange' => ['from' => '2026-03-04', 'to' => '2026-03-05'],
            'newDeliveryDateRange' => ['from' => '2026-03-03', 'to' => '2026-03-04'],
            'changedByUser' => 'beta',
        ]);

        $service->saveEditorState($first);
        $saveResult = $service->saveEditorState($second);

        static::assertTrue($saveResult['saved']);
        static::assertTrue($saveResult['canSave']);
        static::assertSame('KW 10/2026', $saveResult['state']['supplierDeliveryDateRange']['calendarWeek']);
        static::assertCount(1, $saveResult['state']['history']['supplierDeliveryDateRange']);
        static::assertCount(1, $saveResult['state']['history']['newDeliveryDateRange']);
    }

    private function createSchema(\Doctrine\DBAL\Connection $connection): void
    {
        $connection->executeStatement('CREATE TABLE external_order_delivery_date_state (id BLOB NOT NULL, order_id BLOB NOT NULL, position_id VARCHAR(64) NOT NULL, supplier_from VARCHAR(10) NULL, supplier_to VARCHAR(10) NULL, new_from VARCHAR(10) NULL, new_to VARCHAR(10) NULL, last_validation_errors TEXT NULL, created_at VARCHAR(32) NOT NULL, updated_at VARCHAR(32) NULL, PRIMARY KEY(id));');
        $connection->executeStatement('CREATE TABLE external_order_delivery_date_history (id BLOB NOT NULL, order_id BLOB NOT NULL, position_id VARCHAR(64) NOT NULL, field_name VARCHAR(64) NOT NULL, previous_from VARCHAR(10) NULL, previous_to VARCHAR(10) NULL, next_from VARCHAR(10) NULL, next_to VARCHAR(10) NULL, changed_by_user VARCHAR(255) NULL, created_at VARCHAR(32) NOT NULL, PRIMARY KEY(id));');
    }
}
