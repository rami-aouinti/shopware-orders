<?php declare(strict_types=1);

namespace ExternalOrders\Tests\Service;

use Doctrine\DBAL\Connection;
use ExternalOrders\Service\ExternalOrderService;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Checkout\Order\OrderCollection;
use Shopware\Core\Checkout\Order\OrderDefinition;
use Shopware\Core\Checkout\Order\OrderEntity;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult;

class ExternalOrderServiceTest extends TestCase
{
    public function testFetchOrdersUsesOrderIdAsPrimaryIdentifierAndExternalIdAsBusinessReference(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'SW-10001', 25.5, [
            'external_order_id' => 'EXT-10001',
        ]);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->once())->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria(), $context)
        );

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->willReturn([]);

        $service = new ExternalOrderService($repository, $connection);

        $result = $service->fetchOrders($context);

        static::assertSame(1, $result['total']);
        static::assertSame('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', $result['orders'][0]['id']);
        static::assertSame('EXT-10001', $result['orders'][0]['externalId']);
        static::assertSame('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', $result['orders'][0]['orderId']);
    }

    public function testFetchOrderDetailLoadsMetadataFromExternalOrderData(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'SW-20001', 10.0, []);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->once())->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria([$order->getId()]), $context)
        );

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->willReturn([[ 
                'id' => 'cccccccccccccccccccccccccccccccc',
                'order_id' => 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                'external_id' => 'EXT-20001',
                'channel' => 'san6',
                'raw_payload' => json_encode([
                    'detail' => [
                        'orderNumber' => 'EXT-ORDER-20001',
                        'items' => [['quantity' => 2]],
                    ],
                ], JSON_THROW_ON_ERROR),
            ]]);

        $service = new ExternalOrderService($repository, $connection);

        $detail = $service->fetchOrderDetail($context, $order->getId());

        static::assertNotNull($detail);
        static::assertSame('EXT-ORDER-20001', $detail['orderNumber']);
        static::assertSame('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', $detail['internalOrderId']);
        static::assertSame('EXT-20001', $detail['externalId']);
    }

    public function testMarkOrdersAsTestUsesInternalOrderIds(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('dddddddddddddddddddddddddddddddd', 'SW-30001', 15.0, []);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->once())->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria(), $context)
        );
        $repository->expects($this->once())->method('upsert');

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->willReturn([[ 
                'id' => 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                'order_id' => 'dddddddddddddddddddddddddddddddd',
                'external_id' => 'EXT-30001',
                'channel' => 'san6',
                'raw_payload' => json_encode(['status' => 'processing'], JSON_THROW_ON_ERROR),
            ]]);
        $connection->expects($this->once())->method('update');

        $service = new ExternalOrderService($repository, $connection);

        $result = $service->markOrdersAsTest($context, ['dddddddddddddddddddddddddddddddd']);

        static::assertSame(['updated' => 1, 'alreadyMarked' => 0, 'notFound' => 0], $result);
    }

    public function testFetchOrderStatusesAggregatesTrackingSources(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('ffffffffffffffffffffffffffffffff', 'SW-40001', 15.0, []);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->once())->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria([$order->getId()]), $context)
        );

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->willReturn([[
                'id' => '11111111111111111111111111111111',
                'order_id' => 'ffffffffffffffffffffffffffffffff',
                'external_id' => 'EXT-40001',
                'channel' => 'san6',
                'raw_payload' => json_encode([
                    'shopwareStatus' => 'shipped',
                    'ordersStatusName' => 'Versendet',
                    'trackingEvents' => [
                        ['trackingNumber' => 'DHL-1', 'status' => 'delivered'],
                        ['trackingNumber' => 'DHL-2', 'status' => 'in_transit'],
                    ],
                ], JSON_THROW_ON_ERROR),
            ]]);

        $service = new ExternalOrderService($repository, $connection);

        $result = $service->fetchOrderStatuses($context, $order->getId());

        static::assertNotNull($result);
        static::assertSame('shipped', $result['sources']['shopware']);
        static::assertSame('Versendet', $result['sources']['san6']);
        static::assertSame('in_transit', $result['sources']['tracking']);
        static::assertFalse($result['tracking']['allPackagesDelivered']);
        static::assertSame('Versendet', $result['aggregatedStatus']);
    }

    public function testUpdateModifiableStatusRejectsCompletedWhenPackagesNotDelivered(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('12121212121212121212121212121212', 'SW-50001', 15.0, []);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->exactly(2))->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria([$order->getId()]), $context)
        );

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->willReturn([[
                'id' => '22222222222222222222222222222222',
                'order_id' => '12121212121212121212121212121212',
                'external_id' => 'EXT-50001',
                'channel' => 'san6',
                'raw_payload' => json_encode([
                    'trackingEvents' => [
                        ['trackingNumber' => 'DHL-1', 'status' => 'in_transit'],
                    ],
                ], JSON_THROW_ON_ERROR),
            ]]);

        $service = new ExternalOrderService($repository, $connection);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('only allowed when all packages are delivered');

        $service->updateModifiableStatus($context, $order->getId(), 'Bestellung abgeschlossen');
    }


    public function testFetchOrdersProvidesCanonicalAliasesAndSupportsAllListFilters(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('abababababababababababababababab', 'SW-60001', 12.0, []);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->once())->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria(), $context)
        );

        $payload = [
            'orderNumber' => 'SW-60001',
            'orderDate' => '2026-04-07T10:00:00+00:00',
            'auftragNumber' => 'SAN6-60001',
            'san6' => 'SAN6-60001',
            'status' => 'versendet',
            'latestShippingDate' => '2026-04-11',
            'shippingDate' => '2026-04-10',
            'latestDeliveryDate' => '2026-04-12',
            'deliveryDate' => '2026-04-11',
            'lieferterminLieferant' => '2026-04-09',
            'lieferterminAuftragsbearbeitung' => '2026-04-08',
            'changedByUser' => 'Max Mustermann',
            'sendenummer' => 'DHL-60001',
            'detail' => [
                'items' => [[
                    'positionId' => '10',
                    'positionNumber' => '1',
                    'name' => 'Artikel 1',
                    'orderedQuantity' => 5,
                ]],
            ],
        ];

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->exactly(2))
            ->method('fetchAllAssociative')
            ->willReturn([[ 
                'id' => 'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd',
                'order_id' => 'abababababababababababababababab',
                'external_id' => 'EXT-60001',
                'channel' => 'san6',
                'raw_payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            ]]);

        $service = new ExternalOrderService($repository, $connection);

        $unfiltered = $service->fetchOrders($context);
        static::assertSame('SAN6-60001', $unfiltered['orders'][0]['san6']);
        static::assertSame('SAN6-60001', $unfiltered['orders'][0]['san6OrderNumber']);
        static::assertSame('shipped', $unfiltered['orders'][0]['statusCode']);
        static::assertSame('2026-04-07T10:00:00+00:00', $unfiltered['orders'][0]['orderDate']);
        static::assertSame(5, $unfiltered['orders'][0]['positions'][0]['orderedQuantity']);

        $filtered = $service->fetchOrders($context, filters: [
            'bestellnummer' => 'SW-60001',
            'san6OrderNumber' => 'SAN6-60001',
            'orderDateFrom' => '2026-04-07',
            'orderDateTo' => '2026-04-07',
            'orderedQuantity' => '5',
            'latestShippingDateFrom' => '2026-04-11',
            'latestShippingDateTo' => '2026-04-11',
            'shippingDateFrom' => '2026-04-10',
            'shippingDateTo' => '2026-04-10',
            'latestDeliveryDateFrom' => '2026-04-12',
            'latestDeliveryDateTo' => '2026-04-12',
            'deliveryDateFrom' => '2026-04-11',
            'deliveryDateTo' => '2026-04-11',
            'lieferterminLieferantFrom' => '2026-04-09',
            'lieferterminLieferantTo' => '2026-04-09',
            'lieferterminAuftragsbearbeitungFrom' => '2026-04-08',
            'lieferterminAuftragsbearbeitungTo' => '2026-04-08',
            'changedByUser' => 'Max',
            'sendenummer' => 'DHL-60001',
            'status' => 'shipped',
            'san6' => 'SAN6-60001',
            'statusCode' => 'shipped',
        ]);

        static::assertSame(1, $filtered['total']);
    }


    public function testFetchOrdersHandlesNumericOrderReferenceWithoutTypeError(): void
    {
        $context = Context::createDefaultContext();
        $order = $this->createOrderEntity('acacacacacacacacacacacacacacacac', 'SW-70001', 45.0, []);

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->once())->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 1, new OrderCollection([$order]), null, new Criteria(), $context)
        );

        $payload = [
            'orderNumber' => 'SW-70001',
            'auftragNumber' => 70001,
        ];

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->willReturn([[
                'id' => 'dededededededededededededededede',
                'order_id' => 'acacacacacacacacacacacacacacacac',
                'external_id' => 'EXT-70001',
                'channel' => 'san6',
                'raw_payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            ]]);

        $service = new ExternalOrderService($repository, $connection);

        $result = $service->fetchOrders($context);

        static::assertSame('70001', $result['orders'][0]['auftragNumber']);
        static::assertSame('70001', $result['orders'][0]['san6OrderNumber']);
    }



    public function testFetchOrdersFiltersByLieferzeitAreaAndMainViewValuesFromUi(): void
    {
        $context = Context::createDefaultContext();
        $orders = [
            $this->createOrderEntity('99999999999999999999999999999991', 'SW-AREA-1', 11.0, []),
            $this->createOrderEntity('99999999999999999999999999999992', 'SW-AREA-2', 22.0, []),
            $this->createOrderEntity('99999999999999999999999999999993', 'SW-AREA-3', 33.0, []),
        ];

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->exactly(2))->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 3, new OrderCollection($orders), null, new Criteria(), $context)
        );

        $payloadRows = [
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
                'order_id' => '99999999999999999999999999999991',
                'external_id' => 'EXT-AREA-1',
                'channel' => 'b2b',
                'raw_payload' => json_encode([
                    'status' => 'open',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2',
                'order_id' => '99999999999999999999999999999992',
                'external_id' => 'EXT-AREA-2',
                'channel' => 'ebay_de',
                'raw_payload' => json_encode([
                    'status' => 'open',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3',
                'order_id' => '99999999999999999999999999999993',
                'external_id' => 'EXT-AREA-3',
                'channel' => 'kaufland',
                'raw_payload' => json_encode([
                    'status' => 'completed',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
        ];

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->exactly(2))
            ->method('fetchAllAssociative')
            ->willReturn($payloadRows);

        $service = new ExternalOrderService($repository, $connection);

        $areaFiltered = $service->fetchOrders($context, selectedArea: 'first-medical-ecommerce');
        static::assertSame(1, $areaFiltered['total']);
        static::assertSame('b2b', $areaFiltered['orders'][0]['channel']);

        $mainViewFiltered = $service->fetchOrders($context, selectedArea: 'medical-solutions', selectedMainView: 'openOrders');
        static::assertSame(1, $mainViewFiltered['total']);
        static::assertSame('ebay_de', $mainViewFiltered['orders'][0]['channel']);
    }


    public function testFetchOrdersAppliesAllMainViewOptionsForMedicalSolutionsArea(): void
    {
        $context = Context::createDefaultContext();
        $orders = [
            $this->createOrderEntity('99999999999999999999999999999992', 'SW-AREA-2', 22.0, []),
            $this->createOrderEntity('99999999999999999999999999999993', 'SW-AREA-3', 33.0, []),
        ];

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->exactly(2))->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 2, new OrderCollection($orders), null, new Criteria(), $context)
        );

        $payloadRows = [
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2',
                'order_id' => '99999999999999999999999999999992',
                'external_id' => 'EXT-AREA-2',
                'channel' => 'ebay_de',
                'raw_payload' => json_encode([
                    'status' => 'open',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3',
                'order_id' => '99999999999999999999999999999993',
                'external_id' => 'EXT-AREA-3',
                'channel' => 'kaufland',
                'raw_payload' => json_encode([
                    'status' => 'completed',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
        ];

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->exactly(2))
            ->method('fetchAllAssociative')
            ->willReturn($payloadRows);

        $service = new ExternalOrderService($repository, $connection);

        $allOrdersView = $service->fetchOrders($context, selectedArea: 'medical-solutions', selectedMainView: 'allOrders');
        static::assertSame(2, $allOrdersView['total']);

        $openOrdersView = $service->fetchOrders($context, selectedArea: 'medical-solutions', selectedMainView: 'openOrders');
        static::assertSame(1, $openOrdersView['total']);
        static::assertSame('ebay_de', $openOrdersView['orders'][0]['channel']);
    }

    public function testFetchOrdersAcceptsSnakeCaseSelectionValues(): void
    {
        $context = Context::createDefaultContext();
        $orders = [
            $this->createOrderEntity('99999999999999999999999999999991', 'SW-AREA-1', 11.0, []),
            $this->createOrderEntity('99999999999999999999999999999992', 'SW-AREA-2', 22.0, []),
        ];

        $repository = $this->createMock(EntityRepository::class);
        $repository->expects($this->exactly(2))->method('search')->willReturn(
            new EntitySearchResult(OrderDefinition::ENTITY_NAME, 2, new OrderCollection($orders), null, new Criteria(), $context)
        );

        $payloadRows = [
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
                'order_id' => '99999999999999999999999999999991',
                'external_id' => 'EXT-AREA-1',
                'channel' => 'b2b',
                'raw_payload' => json_encode([
                    'status' => 'open',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
            [
                'id' => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2',
                'order_id' => '99999999999999999999999999999992',
                'external_id' => 'EXT-AREA-2',
                'channel' => 'ebay_de',
                'raw_payload' => json_encode([
                    'status' => 'open',
                    'detail' => ['items' => [['orderedQuantity' => 1]]],
                ], JSON_THROW_ON_ERROR),
            ],
        ];

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->exactly(2))
            ->method('fetchAllAssociative')
            ->willReturn($payloadRows);

        $service = new ExternalOrderService($repository, $connection);

        $areaFiltered = $service->fetchOrders($context, selectedArea: 'first_medical_ecommerce');
        static::assertSame(1, $areaFiltered['total']);
        static::assertSame('b2b', $areaFiltered['orders'][0]['channel']);

        $mainViewFiltered = $service->fetchOrders($context, selectedArea: 'medical_solutions', selectedMainView: 'open_orders');
        static::assertSame(1, $mainViewFiltered['total']);
        static::assertSame('ebay_de', $mainViewFiltered['orders'][0]['channel']);
    }

    /**
     * @param array<string, mixed>|null $customFields
     */

    public function testFetchSan6RawPayloadPreviewReturnsDecodedPayloadRows(): void
    {
        $repository = $this->createMock(EntityRepository::class);

        $connection = $this->createMock(Connection::class);
        $connection->expects($this->once())
            ->method('fetchAllAssociative')
            ->with(
                $this->stringContains('FROM external_order_data'),
                ['channel' => 'san6']
            )
            ->willReturn([[ 
                'id' => 'abababababababababababababababab',
                'order_id' => 'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd',
                'external_id' => 'EXT-70001',
                'channel' => 'san6',
                'created_at' => '2026-05-01 10:00:00.000',
                'updated_at' => '2026-05-01 11:00:00.000',
                'raw_payload' => json_encode(['Auftragsnummer' => '70001'], JSON_THROW_ON_ERROR),
            ]]);

        $service = new ExternalOrderService($repository, $connection);

        $rows = $service->fetchSan6RawPayloadPreview(5);

        static::assertCount(1, $rows);
        static::assertSame('EXT-70001', $rows[0]['externalId']);
        static::assertSame('70001', $rows[0]['rawPayload']['Auftragsnummer']);
    }


    private function createOrderEntity(string $id, string $orderNumber, float $amountTotal, ?array $customFields): OrderEntity
    {
        $order = $this->createMock(OrderEntity::class);
        $order->method('getId')->willReturn($id);
        $order->method('getOrderNumber')->willReturn($orderNumber);
        $order->method('getAmountTotal')->willReturn($amountTotal);
        $order->method('getOrderDateTime')->willReturn(new \DateTimeImmutable('2024-06-18 09:14:00'));
        $order->method('getCustomFields')->willReturn($customFields);

        return $order;
    }
}
