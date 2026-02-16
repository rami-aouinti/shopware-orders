<?php declare(strict_types=1);

namespace ExternalOrders\Service;

use Doctrine\DBAL\Connection;
use ExternalOrders\Event\SupplierRequestTaskCompletedEvent;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Uuid\Uuid;
use Shopware\Core\System\SystemConfig\SystemConfigService;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

class SupplierRequestTaskService
{
    private const STATUS_OPEN = 'open';
    private const STATUS_DONE = 'done';

    public function __construct(
        private readonly Connection $connection,
        private readonly SystemConfigService $systemConfigService,
        private readonly EventDispatcherInterface $eventDispatcher,
    ) {
    }

    public function createTask(string $orderId, string $positionId, ?string $initiatorUserId, ?string $assigneeUserId = null, ?string $correlationId = null): array
    {
        $taskId = Uuid::randomHex();
        $recipientUserId = $this->resolveRecipientUserId($initiatorUserId, $assigneeUserId);
        $dueDate = $this->calculateNextBusinessDay();
        $correlationId = $this->resolveCorrelationId($correlationId);

        $this->connection->insert('external_supplier_request_task', [
            'id' => Uuid::fromHexToBytes($taskId),
            'order_id' => Uuid::fromHexToBytes($orderId),
            'position_id' => $positionId,
            'initiator_user_id' => $initiatorUserId,
            'recipient_user_id' => $recipientUserId,
            'correlation_id' => $correlationId,
            'status' => self::STATUS_OPEN,
            'due_date' => $dueDate->format('Y-m-d H:i:s.v'),
            'created_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'),
            'updated_at' => null,
            'completed_at' => null,
        ]);

        return $this->buildTaskPayload([
            'taskId' => $taskId,
            'orderId' => $orderId,
            'positionId' => $positionId,
            'initiatorUserId' => $initiatorUserId,
            'assigneeUserId' => $recipientUserId,
            'correlationId' => $correlationId,
            'status' => self::STATUS_OPEN,
            'dueDate' => $dueDate->format(DATE_ATOM),
        ]);
    }

    public function completeTask(string $taskId, Context $context): void
    {
        $task = $this->connection->fetchAssociative(
            'SELECT LOWER(HEX(id)) id, LOWER(HEX(order_id)) orderId, position_id positionId, initiator_user_id initiatorUserId, recipient_user_id recipientUserId, correlation_id correlationId, status FROM external_supplier_request_task WHERE id = :id',
            ['id' => Uuid::fromHexToBytes($taskId)]
        );

        if (!is_array($task) || ($task['status'] ?? null) === self::STATUS_DONE) {
            return;
        }

        $now = new \DateTimeImmutable();
        $this->connection->update('external_supplier_request_task', [
            'status' => self::STATUS_DONE,
            'updated_at' => $now->format('Y-m-d H:i:s.v'),
            'completed_at' => $now->format('Y-m-d H:i:s.v'),
        ], ['id' => Uuid::fromHexToBytes($taskId)]);

        $this->eventDispatcher->dispatch(new SupplierRequestTaskCompletedEvent(
            (string) $task['id'],
            (string) $task['orderId'],
            (string) $task['positionId'],
            isset($task['initiatorUserId']) ? (string) $task['initiatorUserId'] : null,
            isset($task['recipientUserId']) ? (string) $task['recipientUserId'] : null,
            isset($task['correlationId']) ? (string) $task['correlationId'] : null,
            $context,
        ));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function findCompletedTasksByInitiator(string $initiatorUserId, ?\DateTimeImmutable $completedSince = null, int $limit = 25): array
    {
        $query = 'SELECT LOWER(HEX(id)) taskId, LOWER(HEX(order_id)) orderId, position_id positionId, initiator_user_id initiatorUserId, recipient_user_id recipientUserId, correlation_id correlationId, status, due_date dueDate, completed_at completedAt
            FROM external_supplier_request_task
            WHERE initiator_user_id = :initiatorUserId AND status = :status AND completed_at IS NOT NULL';

        $params = [
            'initiatorUserId' => $initiatorUserId,
            'status' => self::STATUS_DONE,
            'limit' => max(1, $limit),
        ];

        if ($completedSince !== null) {
            $query .= ' AND completed_at > :completedSince';
            $params['completedSince'] = $completedSince->format('Y-m-d H:i:s.v');
        }

        $query .= ' ORDER BY completed_at ASC LIMIT :limit';

        $rows = $this->connection->fetchAllAssociative($query, $params, ['limit' => \PDO::PARAM_INT]);

        return array_map(function (array $row): array {
            return $this->buildTaskPayload([
                'taskId' => (string) ($row['taskId'] ?? ''),
                'orderId' => (string) ($row['orderId'] ?? ''),
                'positionId' => (string) ($row['positionId'] ?? ''),
                'initiatorUserId' => isset($row['initiatorUserId']) ? (string) $row['initiatorUserId'] : null,
                'assigneeUserId' => isset($row['recipientUserId']) ? (string) $row['recipientUserId'] : null,
                'correlationId' => isset($row['correlationId']) ? (string) $row['correlationId'] : null,
                'status' => (string) ($row['status'] ?? self::STATUS_DONE),
                'dueDate' => $this->formatDateAsAtom($row['dueDate'] ?? null),
                'completedAt' => $this->formatDateAsAtom($row['completedAt'] ?? null),
            ]);
        }, $rows);
    }

    private function resolveRecipientUserId(?string $initiatorUserId, ?string $assigneeUserId): ?string
    {
        if ($assigneeUserId !== null && trim($assigneeUserId) !== '') {
            return trim($assigneeUserId);
        }

        $configuredRecipient = trim((string) $this->systemConfigService->get('ExternalOrders.config.supplierRequestRecipientUserId'));

        if ($configuredRecipient !== '') {
            return $configuredRecipient;
        }

        return $initiatorUserId;
    }

    private function resolveCorrelationId(?string $correlationId): string
    {
        $trimmed = trim((string) $correlationId);

        if ($trimmed !== '') {
            return $trimmed;
        }

        return Uuid::randomHex();
    }

    private function calculateNextBusinessDay(): \DateTimeImmutable
    {
        $currentDay = new \DateTimeImmutable('tomorrow 09:00:00');

        while (in_array((int) $currentDay->format('N'), [6, 7], true)) {
            $currentDay = $currentDay->modify('+1 day');
        }

        return $currentDay;
    }

    /**
     * @param array<string, mixed> $task
     *
     * @return array<string, mixed>
     */
    private function buildTaskPayload(array $task): array
    {
        return [
            ...$task,
            'references' => [
                'orderId' => $task['orderId'] ?? null,
                'positionId' => $task['positionId'] ?? null,
                'initiatorUserId' => $task['initiatorUserId'] ?? null,
                'assigneeUserId' => $task['assigneeUserId'] ?? null,
                'correlationId' => $task['correlationId'] ?? null,
            ],
        ];
    }

    private function formatDateAsAtom(mixed $value): ?string
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }

        return (new \DateTimeImmutable($value))->format(DATE_ATOM);
    }
}
