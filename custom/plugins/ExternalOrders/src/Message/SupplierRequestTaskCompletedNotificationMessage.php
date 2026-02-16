<?php declare(strict_types=1);

namespace ExternalOrders\Message;

class SupplierRequestTaskCompletedNotificationMessage
{
    public function __construct(
        private readonly string $taskId,
        private readonly string $orderId,
        private readonly string $positionId,
        private readonly ?string $initiatorUserId,
    ) {
    }

    public function getTaskId(): string { return $this->taskId; }
    public function getOrderId(): string { return $this->orderId; }
    public function getPositionId(): string { return $this->positionId; }
    public function getInitiatorUserId(): ?string { return $this->initiatorUserId; }
}
