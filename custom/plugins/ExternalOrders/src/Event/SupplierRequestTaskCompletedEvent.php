<?php declare(strict_types=1);

namespace ExternalOrders\Event;

use Shopware\Core\Framework\Context;
use Symfony\Contracts\EventDispatcher\Event;

class SupplierRequestTaskCompletedEvent extends Event
{
    public function __construct(
        private readonly string $taskId,
        private readonly string $orderId,
        private readonly string $positionId,
        private readonly ?string $initiatorUserId,
        private readonly ?string $recipientUserId,
        private readonly ?string $correlationId,
        private readonly Context $context,
    ) {
    }

    public function getTaskId(): string { return $this->taskId; }
    public function getOrderId(): string { return $this->orderId; }
    public function getPositionId(): string { return $this->positionId; }
    public function getInitiatorUserId(): ?string { return $this->initiatorUserId; }
    public function getRecipientUserId(): ?string { return $this->recipientUserId; }
    public function getCorrelationId(): ?string { return $this->correlationId; }
    public function getContext(): Context { return $this->context; }
}
