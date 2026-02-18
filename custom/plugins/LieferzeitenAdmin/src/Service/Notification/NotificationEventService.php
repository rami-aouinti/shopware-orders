<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service\Notification;

use LieferzeitenAdmin\Service\Audit\AuditLogService;
use LieferzeitenAdmin\Service\Reliability\IntegrationReliabilityService;
use Psr\Log\LoggerInterface;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\Uuid\Uuid;

class NotificationEventService
{
    /** @var array<int,string> */
    private const CRITICAL_FORCEABLE_TRIGGERS = [
        NotificationTriggerCatalog::ADDITIONAL_DELIVERY_DATE_REQUEST_CLOSED,
    ];

    public function __construct(
        private readonly EntityRepository $notificationEventRepository,
        private readonly NotificationToggleResolver $toggleResolver,
        private readonly LoggerInterface $logger,
        private readonly IntegrationReliabilityService $reliabilityService,
        private readonly AuditLogService $auditLogService,
    ) {
    }

    /**
     * @param array<string,mixed> $payload
     */
    public function dispatch(
        string $eventKey,
        string $triggerKey,
        string $channel,
        array $payload,
        Context $context,
        ?string $externalOrderId = null,
        ?string $sourceSystem = null,
        ?string $salesChannelId = null,
        bool $forceIfCritical = false,
    ): bool {
        $canonicalTriggerKey = NotificationTriggerCatalog::canonicalize($triggerKey);
        $payload['salesChannelId'] = $salesChannelId;
        $triggerEnabled = $this->toggleResolver->isEnabled($canonicalTriggerKey, $channel, $context, $salesChannelId);
        $forced = $forceIfCritical && $this->isCriticalForceableTrigger($canonicalTriggerKey);
        if (!$triggerEnabled && !$forced) {
            $this->logger->info('Notification event skipped by toggle.', [
                'eventKey' => $eventKey,
                'triggerKey' => $canonicalTriggerKey,
                'channel' => $channel,
                'salesChannelId' => $salesChannelId,
            ]);

            $this->auditLogService->log('skipped_by_toggle', 'notification_event', $eventKey, $context, [
                'triggerKey' => $triggerKey,
                'canonicalTriggerKey' => $canonicalTriggerKey,
                'channel' => $channel,
                'salesChannelId' => $salesChannelId,
            ], 'mails');

            return false;
        }

        if ($this->existsByEventKey($eventKey, $context)) {
            return false;
        }

        $this->reliabilityService->executeWithRetry('mails', 'queue_notification_event', function () use ($eventKey, $canonicalTriggerKey, $channel, $payload, $context, $externalOrderId, $sourceSystem): void {
            $this->notificationEventRepository->create([[
                'id' => Uuid::randomHex(),
                'eventKey' => $eventKey,
                'triggerKey' => $canonicalTriggerKey,
                'channel' => $channel,
                'externalOrderId' => $externalOrderId,
                'sourceSystem' => $sourceSystem,
                'payload' => $payload,
                'status' => 'queued',
                'dispatchedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            ]], $context);
        }, $context, payload: ['eventKey' => $eventKey, 'channel' => $channel]);

        $this->logger->info('Notification event queued.', [
            'eventKey' => $eventKey,
            'triggerKey' => $canonicalTriggerKey,
            'channel' => $channel,
            'forced' => $forced,
        ]);

        $this->auditLogService->log('notification_queued', 'notification_event', $eventKey, $context, [
            'triggerKey' => $triggerKey,
            'canonicalTriggerKey' => $canonicalTriggerKey,
            'channel' => $channel,
            'forced' => $forced,
        ], 'mails');

        return true;
    }

    private function isCriticalForceableTrigger(string $triggerKey): bool
    {
        return \in_array($triggerKey, self::CRITICAL_FORCEABLE_TRIGGERS, true);
    }

    private function existsByEventKey(string $eventKey, Context $context): bool
    {
        $criteria = new Criteria();
        $criteria->setLimit(1);
        $criteria->addFilter(new EqualsFilter('eventKey', $eventKey));

        return $this->notificationEventRepository->search($criteria, $context)->first() !== null;
    }
}
