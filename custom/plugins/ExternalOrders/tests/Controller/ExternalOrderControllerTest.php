<?php declare(strict_types=1);

namespace ExternalOrders\Tests\Controller;

use Doctrine\DBAL\Connection;
use ExternalOrders\Controller\ExternalOrderController;
use ExternalOrders\Service\DeliveryDateEditorService;
use ExternalOrders\Service\ExternalOrderService;
use ExternalOrders\Service\ExternalOrderSyncService;
use ExternalOrders\Service\ExternalOrderTestDataService;
use ExternalOrders\Service\SupplierRequestTaskService;
use ExternalOrders\Service\TopmSan6OrderExportService;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Context;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class ExternalOrderControllerTest extends TestCase
{
    public function testDetailAndExportRoutesUseInternalOrderIdPlaceholder(): void
    {
        $reflection = new \ReflectionClass(ExternalOrderController::class);

        $detailRoute = $reflection->getMethod('detail')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/detail/{internalOrderId}', $detailRoute['path'] ?? null);

        $exportRoute = $reflection->getMethod('exportOrder')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/export/{internalOrderId}', $exportRoute['path'] ?? null);

        $exportStatusRoute = $reflection->getMethod('exportStatus')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/export-status/{internalOrderId}', $exportStatusRoute['path'] ?? null);

        $statusRoute = $reflection->getMethod('status')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/status/{internalOrderId}', $statusRoute['path'] ?? null);

        $statusUpdateRoute = $reflection->getMethod('updateStatus')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/status/{internalOrderId}', $statusUpdateRoute['path'] ?? null);
    }


    public function testListForwardsSan6AndStatusCodeFilters(): void
    {
        $externalOrderService = $this->createMock(ExternalOrderService::class);
        $externalOrderService
            ->expects($this->once())
            ->method('fetchOrders')
            ->with(
                $this->isInstanceOf(Context::class),
                null,
                null,
                1,
                50,
                null,
                null,
                $this->equalTo([
                    'san6' => 'SAN6-123',
                    'san6OrderNumber' => 'SAN6-123',
                    'latestShippingDateFrom' => '2026-04-11',
                    'latestShippingDateTo' => '2026-04-12',
                    'statusCode' => 'shipped',
                    'status' => 'Versendet',
                ]),
                null,
                null,
            )
            ->willReturn(['orders' => []]);

        $controller = new ExternalOrderController(
            $externalOrderService,
            $this->createMock(ExternalOrderTestDataService::class),
            $this->createMock(ExternalOrderSyncService::class),
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(DeliveryDateEditorService::class),
            $this->createMock(Connection::class),
        );

        $request = new Request(query: [
            'san6' => ' SAN6-123 ',
            'san6OrderNumber' => ' SAN6-123 ',
            'latestShippingDateFrom' => ' 2026-04-11 ',
            'latestShippingDateTo' => ' 2026-04-12 ',
            'statusCode' => ' shipped ',
            'status' => ' Versendet ',
        ]);

        $response = $controller->list($request, Context::createDefaultContext());

        static::assertSame(Response::HTTP_OK, $response->getStatusCode());
    }



    public function testListForwardsLieferzeitRouteSelectionFilters(): void
    {
        $externalOrderService = $this->createMock(ExternalOrderService::class);
        $externalOrderService
            ->expects($this->exactly(2))
            ->method('fetchOrders')
            ->with(
                $this->isInstanceOf(Context::class),
                null,
                null,
                1,
                50,
                null,
                null,
                $this->equalTo([]),
                $this->logicalOr($this->equalTo('first-medical-ecommerce'), $this->equalTo('medical-solutions')),
                $this->logicalOr($this->equalTo('allOrders'), $this->equalTo('openOrders')),
            )
            ->willReturnOnConsecutiveCalls(
                ['orders' => [['channel' => 'b2b']], 'total' => 1],
                ['orders' => [['channel' => 'ebay_de']], 'total' => 1],
            );

        $controller = new ExternalOrderController(
            $externalOrderService,
            $this->createMock(ExternalOrderTestDataService::class),
            $this->createMock(ExternalOrderSyncService::class),
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(DeliveryDateEditorService::class),
            $this->createMock(Connection::class),
        );

        $firstMedicalRequest = new Request(query: [
            'selectedArea' => 'first-medical-ecommerce',
            'selectedMainView' => 'allOrders',
        ]);

        $medicalSolutionsRequest = new Request(query: [
            'selectedArea' => 'medical-solutions',
            'selectedMainView' => 'openOrders',
        ]);

        $firstMedicalResponse = $controller->list($firstMedicalRequest, Context::createDefaultContext());
        $medicalSolutionsResponse = $controller->list($medicalSolutionsRequest, Context::createDefaultContext());

        static::assertSame(Response::HTTP_OK, $firstMedicalResponse->getStatusCode());
        static::assertStringContainsString('b2b', (string) $firstMedicalResponse->getContent());
        static::assertSame(Response::HTTP_OK, $medicalSolutionsResponse->getStatusCode());
        static::assertStringContainsString('ebay_de', (string) $medicalSolutionsResponse->getContent());
    }
    public function testMarkTestPrefersInternalOrderIdsPayload(): void
    {
        $externalOrderService = $this->createMock(ExternalOrderService::class);
        $externalOrderService
            ->expects($this->once())
            ->method('markOrdersAsTest')
            ->with($this->isInstanceOf(Context::class), ['internal-1'])
            ->willReturn(['updated' => 1, 'alreadyMarked' => 0, 'notFound' => 0]);

        $controller = new ExternalOrderController(
            $externalOrderService,
            $this->createMock(ExternalOrderTestDataService::class),
            $this->createMock(ExternalOrderSyncService::class),
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(DeliveryDateEditorService::class),
            $this->createMock(Connection::class),
        );

        $request = new Request(content: json_encode([
            'orderIds' => ['legacy-id'],
            'internalOrderIds' => ['internal-1'],
        ], JSON_THROW_ON_ERROR));

        $response = $controller->markTest($request, Context::createDefaultContext());

        static::assertSame(Response::HTTP_OK, $response->getStatusCode());
        static::assertSame('{"updated":1,"alreadyMarked":0,"notFound":0}', $response->getContent());
    }

    public function testFileTransferRouteIsExplicitlyPublicWithoutAcl(): void
    {
        $reflection = new \ReflectionClass(ExternalOrderController::class);
        $method = $reflection->getMethod('serveTopmExportFile');
        $attributes = $method->getAttributes(Route::class);

        static::assertCount(1, $attributes);

        /** @var array{path?: string, defaults?: array{auth_required?: bool, _acl?: array<mixed>}, name?: string} $arguments */
        $arguments = $attributes[0]->getArguments();

        static::assertSame('/topm-export/{token}', $arguments['path'] ?? null);
        static::assertSame('api.external-orders.export.file-transfer', $arguments['name'] ?? null);
        static::assertFalse($arguments['defaults']['auth_required'] ?? true);
        static::assertSame([], $arguments['defaults']['_acl'] ?? ['unexpected']);
    }


    public function testSan6TestReadRouteReturnsProbeData(): void
    {
        $syncService = $this->createMock(ExternalOrderSyncService::class);
        $syncService
            ->expects($this->once())
            ->method('probeSan6Read')
            ->willReturn([
                'url' => 'https://example.test/san6?funktion=API-AUFTRAEGE',
                'function' => 'API-AUFTRAEGE',
                'ordersCount' => 2,
                'sampleExternalIds' => ['A-1', 'A-2'],
                'rawPreview' => '<Daten/>',
                'error' => null,
                'resultCode' => '00',
                'resultText' => 'OK',
            ]);

        $controller = new ExternalOrderController(
            $this->createMock(ExternalOrderService::class),
            $this->createMock(ExternalOrderTestDataService::class),
            $syncService,
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(DeliveryDateEditorService::class),
            $this->createMock(Connection::class),
        );

        $response = $controller->san6TestRead();

        static::assertSame(Response::HTTP_OK, $response->getStatusCode());
        static::assertJsonStringEqualsJsonString(
            json_encode([
                'url' => 'https://example.test/san6?funktion=API-AUFTRAEGE',
                'function' => 'API-AUFTRAEGE',
                'ordersCount' => 2,
                'sampleExternalIds' => ['A-1', 'A-2'],
                'rawPreview' => '<Daten/>',
                'error' => null,
                'resultCode' => '00',
                'resultText' => 'OK',
            ], JSON_THROW_ON_ERROR),
            (string) $response->getContent()
        );
    }

    public function testSan6RawPreviewRouteReturnsRowsWithLimit(): void
    {
        $externalOrderService = $this->createMock(ExternalOrderService::class);
        $externalOrderService
            ->expects($this->once())
            ->method('fetchSan6RawPayloadPreview')
            ->with(5)
            ->willReturn([
                [
                    'id' => 'meta-1',
                    'internalOrderId' => 'order-1',
                    'externalId' => 'EXT-1',
                    'channel' => 'san6',
                    'rawPayload' => ['foo' => 'bar'],
                ],
            ]);

        $controller = new ExternalOrderController(
            $externalOrderService,
            $this->createMock(ExternalOrderTestDataService::class),
            $this->createMock(ExternalOrderSyncService::class),
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(DeliveryDateEditorService::class),
            $this->createMock(Connection::class),
        );

        $response = $controller->san6RawPreview(new Request(query: ['limit' => '5']));

        static::assertSame(Response::HTTP_OK, $response->getStatusCode());
        static::assertJsonStringEqualsJsonString(
            json_encode([
                'limit' => 5,
                'rows' => [[
                    'id' => 'meta-1',
                    'internalOrderId' => 'order-1',
                    'externalId' => 'EXT-1',
                    'channel' => 'san6',
                    'rawPayload' => ['foo' => 'bar'],
                ]],
            ], JSON_THROW_ON_ERROR),
            (string) $response->getContent()
        );
    }

}
