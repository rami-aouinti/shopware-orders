<?php declare(strict_types=1);

namespace ExternalOrders\MessageHandler;

use ExternalOrders\Message\SupplierRequestTaskCompletedNotificationMessage;
use Psr\Log\LoggerInterface;

class SupplierRequestTaskCompletedNotificationHandler
{
    public function __construct(private readonly LoggerInterface $logger)
    {
    }

    public function __invoke(SupplierRequestTaskCompletedNotificationMessage $message): void
    {
        $this->logger->info('Supplier request task completed', [
            'taskId' => $message->getTaskId(),
            'orderId' => $message->getOrderId(),
            'positionId' => $message->getPositionId(),
            'initiatorUserId' => $message->getInitiatorUserId(),
            'notificationChannel' => 'administration-queue',
        ]);
    }
}
