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

    public function createTask(string $orderId, string $positionId, ?string $initiatorUserId): array
    {
        $taskId = Uuid::randomHex();
        $recipientUserId = $this->resolveRecipientUserId($initiatorUserId);
        $dueDate = $this->calculateNextBusinessDay();

        $this->connection->insert('external_supplier_request_task', [
            'id' => Uuid::fromHexToBytes($taskId),
            'order_id' => Uuid::fromHexToBytes($orderId),
            'position_id' => $positionId,
            'initiator_user_id' => $initiatorUserId,
            'recipient_user_id' => $recipientUserId,
            'status' => self::STATUS_OPEN,
            'due_date' => $dueDate->format('Y-m-d H:i:s.v'),
            'created_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'),
            'updated_at' => null,
            'completed_at' => null,
        ]);

        return [
            'taskId' => $taskId,
            'orderId' => $orderId,
            'positionId' => $positionId,
            'initiatorUserId' => $initiatorUserId,
            'recipientUserId' => $recipientUserId,
            'status' => self::STATUS_OPEN,
            'dueDate' => $dueDate->format(DATE_ATOM),
        ];
    }

    public function completeTask(string $taskId, Context $context): void
    {
        $task = $this->connection->fetchAssociative(
            'SELECT LOWER(HEX(id)) id, LOWER(HEX(order_id)) orderId, position_id positionId, initiator_user_id initiatorUserId, recipient_user_id recipientUserId, status FROM external_supplier_request_task WHERE id = :id',
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
            $context,
        ));
    }

    private function resolveRecipientUserId(?string $initiatorUserId): ?string
    {
        $configuredRecipient = trim((string) $this->systemConfigService->get('ExternalOrders.config.supplierRequestRecipientUserId'));

        if ($configuredRecipient !== '') {
            return $configuredRecipient;
        }

        return $initiatorUserId;
    }

    private function calculateNextBusinessDay(): \DateTimeImmutable
    {
        $currentDay = new \DateTimeImmutable('tomorrow 09:00:00');

        while (in_array((int) $currentDay->format('N'), [6, 7], true)) {
            $currentDay = $currentDay->modify('+1 day');
        }

        return $currentDay;
    }
}
