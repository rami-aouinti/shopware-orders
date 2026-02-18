<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Integration;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use LieferzeitenAdmin\Service\LieferzeitenOrderStatusWriteService;
use LieferzeitenAdmin\Service\LieferzeitenPositionWriteService;
use LieferzeitenAdmin\Service\LieferzeitenTaskService;
use LieferzeitenAdmin\Service\Notification\NotificationEventService;
use LieferzeitenAdmin\Service\Notification\SalesChannelResolver;
use LieferzeitenAdmin\Service\Notification\TaskAssignmentRuleResolver;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\System\SystemConfig\SystemConfigService;

class LieferzeitenStatusPropagationIntegrationTest extends TestCase
{
    private Connection $connection;

    protected function setUp(): void
    {
        $this->connection = DriverManager::getConnection(['url' => 'sqlite:///:memory:']);
        $this->connection->executeStatement('CREATE TABLE lieferzeiten_paket (
            id BLOB PRIMARY KEY,
            status TEXT NULL,
            status_push_queue TEXT NULL,
            updated_at TEXT NOT NULL
        )');
        $this->connection->executeStatement('CREATE TABLE lieferzeiten_position (
            id BLOB PRIMARY KEY,
            paket_id BLOB NULL,
            updated_at TEXT NOT NULL
        )');
    }

    public function testStatusSevenAndEightArePropagatedToPushQueue(): void
    {
        $paketId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
        $updatedAt = '2026-02-10 09:00:00.000';

        $this->connection->insert('lieferzeiten_paket', [
            'id' => hex2bin($paketId),
            'status' => '6',
            'status_push_queue' => null,
            'updated_at' => $updatedAt,
        ]);

        $repository = $this->createMock(EntityRepository::class);
        $repository->method('upsert')->willReturnCallback(function (array $payloads): void {
            foreach ($payloads as $payload) {
                $this->connection->executeStatement(
                    'UPDATE lieferzeiten_paket
                     SET status = :status,
                         status_push_queue = :statusPushQueue,
                         updated_at = :updatedAt
                     WHERE id = :id',
                    [
                        'status' => $payload['status'] ?? null,
                        'statusPushQueue' => json_encode($payload['statusPushQueue'] ?? [], JSON_THROW_ON_ERROR),
                        'updatedAt' => ($payload['lastChangedAt'] ?? new \DateTimeImmutable())->format('Y-m-d H:i:s.v'),
                        'id' => hex2bin((string) $payload['id']),
                    ]
                );
            }
        });

        $service = new LieferzeitenOrderStatusWriteService($repository, $this->connection);
        $context = Context::createDefaultContext();

        $service->updateOrderStatus($paketId, 7, $updatedAt, $context);
        $afterStatusSeven = $this->connection->fetchAssociative('SELECT status, status_push_queue, updated_at FROM lieferzeiten_paket WHERE id = :id', ['id' => hex2bin($paketId)]);

        static::assertSame('7', $afterStatusSeven['status']);
        $queueAfterSeven = json_decode((string) $afterStatusSeven['status_push_queue'], true, 512, JSON_THROW_ON_ERROR);
        static::assertCount(1, $queueAfterSeven);
        static::assertSame(7, $queueAfterSeven[0]['targetStatus'] ?? null);
        static::assertSame('user_lms', $queueAfterSeven[0]['triggerSource'] ?? null);

        $service->updateOrderStatus($paketId, 8, (string) $afterStatusSeven['updated_at'], $context);
        $afterStatusEight = $this->connection->fetchAssociative('SELECT status, status_push_queue FROM lieferzeiten_paket WHERE id = :id', ['id' => hex2bin($paketId)]);

        static::assertSame('8', $afterStatusEight['status']);
        $queueAfterEight = json_decode((string) $afterStatusEight['status_push_queue'], true, 512, JSON_THROW_ON_ERROR);
        static::assertCount(2, $queueAfterEight);
        static::assertSame([7, 8], array_column($queueAfterEight, 'targetStatus'));
    }

    public function testClosureBlockingRulesForPaketStatuses(): void
    {
        $openPaketId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $closedPaketId = 'cccccccccccccccccccccccccccccccc';

        $this->connection->insert('lieferzeiten_paket', [
            'id' => hex2bin($openPaketId),
            'status' => '7',
            'status_push_queue' => null,
            'updated_at' => '2026-02-10 09:00:00.000',
        ]);
        $this->connection->insert('lieferzeiten_paket', [
            'id' => hex2bin($closedPaketId),
            'status' => '8',
            'status_push_queue' => null,
            'updated_at' => '2026-02-10 09:00:00.000',
        ]);

        $service = new LieferzeitenPositionWriteService(
            $this->createMock(EntityRepository::class),
            $this->createMock(EntityRepository::class),
            $this->connection,
            $this->createMock(EntityRepository::class),
            $this->createMock(EntityRepository::class),
            $this->createMock(EntityRepository::class),
            $this->createMock(EntityRepository::class),
            $this->createMock(LieferzeitenTaskService::class),
            $this->createMock(NotificationEventService::class),
            $this->createMock(TaskAssignmentRuleResolver::class),
            $this->createMock(SystemConfigService::class),
            $this->createMock(SalesChannelResolver::class),
        );

        static::assertTrue($service->canUpdateNeuerLieferterminForPaket($openPaketId));
        static::assertFalse($service->canUpdateNeuerLieferterminForPaket($closedPaketId));
    }
}
