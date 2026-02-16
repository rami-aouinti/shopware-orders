<?php declare(strict_types=1);

namespace ExternalOrders\Tests\Controller;

use Doctrine\DBAL\Connection;
use ExternalOrders\Controller\ExternalOrderController;
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

        $commentUpdateRoute = $reflection->getMethod('updateComment')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/comment/{internalOrderId}', $commentUpdateRoute['path'] ?? null);

        $commentHistoryRoute = $reflection->getMethod('commentHistory')->getAttributes(Route::class)[0]->getArguments();
        static::assertSame('/api/_action/external-orders/comment-history/{internalOrderId}', $commentHistoryRoute['path'] ?? null);
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
            $this->createMock(Connection::class),
        );

        $request = new Request(query: [
            'san6' => ' SAN6-123 ',
            'san6OrderNumber' => ' SAN6-123 ',
            'statusCode' => ' shipped ',
            'status' => ' Versendet ',
        ]);

        $response = $controller->list($request, Context::createDefaultContext());

        static::assertSame(Response::HTTP_OK, $response->getStatusCode());
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



    public function testUpdateCommentValidatesPositionId(): void
    {
        $externalOrderService = $this->createMock(ExternalOrderService::class);
        $externalOrderService
            ->expects($this->never())
            ->method('updatePositionOrPackageComment');

        $controller = new ExternalOrderController(
            $externalOrderService,
            $this->createMock(ExternalOrderTestDataService::class),
            $this->createMock(ExternalOrderSyncService::class),
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(Connection::class),
        );

        $request = new Request(content: json_encode([
            'comment' => 'x',
        ], JSON_THROW_ON_ERROR));

        $response = $controller->updateComment('order-id', $request, Context::createDefaultContext());

        static::assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode());
    }

    public function testCommentHistoryReturnsServicePayload(): void
    {
        $externalOrderService = $this->createMock(ExternalOrderService::class);
        $externalOrderService
            ->expects($this->once())
            ->method('fetchCommentHistory')
            ->with(
                $this->isInstanceOf(Context::class),
                'order-id',
                'pos-1',
                null,
            )
            ->willReturn([
                ['changedBy' => 'user-1', 'oldComment' => '', 'newComment' => 'Neu', 'changedAt' => '2026-01-01 10:00:00.000', 'positionId' => 'pos-1', 'packageId' => null],
            ]);

        $controller = new ExternalOrderController(
            $externalOrderService,
            $this->createMock(ExternalOrderTestDataService::class),
            $this->createMock(ExternalOrderSyncService::class),
            $this->createMock(TopmSan6OrderExportService::class),
            $this->createMock(SupplierRequestTaskService::class),
            $this->createMock(Connection::class),
        );

        $request = new Request(query: [
            'positionId' => 'pos-1',
        ]);

        $response = $controller->commentHistory('order-id', $request, Context::createDefaultContext());

        static::assertSame(Response::HTTP_OK, $response->getStatusCode());
        static::assertStringContainsString('"changedBy":"user-1"', (string) $response->getContent());
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
}
