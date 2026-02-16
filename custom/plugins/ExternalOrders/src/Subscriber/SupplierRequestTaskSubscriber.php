<?php declare(strict_types=1);

namespace ExternalOrders\Subscriber;

use ExternalOrders\Event\SupplierRequestTaskCompletedEvent;
use ExternalOrders\Message\SupplierRequestTaskCompletedNotificationMessage;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Messenger\MessageBusInterface;

class SupplierRequestTaskSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly MessageBusInterface $messageBus)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            SupplierRequestTaskCompletedEvent::class => 'onSupplierRequestTaskCompleted',
        ];
    }

    public function onSupplierRequestTaskCompleted(SupplierRequestTaskCompletedEvent $event): void
    {
        $this->messageBus->dispatch(new SupplierRequestTaskCompletedNotificationMessage(
            $event->getTaskId(),
            $event->getOrderId(),
            $event->getPositionId(),
            $event->getInitiatorUserId(),
        ));
    }
}
