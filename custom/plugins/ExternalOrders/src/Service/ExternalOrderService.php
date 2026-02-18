<?php declare(strict_types=1);

namespace ExternalOrders\Service;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Psr\Log\LoggerInterface;
use Shopware\Core\Checkout\Order\OrderEntity;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsAnyFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\System\SystemConfig\SystemConfigService;
use Symfony\Contracts\HttpClient\HttpClientInterface;

readonly class ExternalOrderService
{
    public function __construct(
        private EntityRepository $orderRepository,
        private Connection $connection,
        private ?HttpClientInterface $httpClient = null,
        private ?SystemConfigService $systemConfigService = null,
        private ?LoggerInterface $logger = null,
    ) {
    }


    private const BUSINESS_STATUS_CODE_MAP = [
        'open' => 'processing',
        'in_progress' => 'processing',
        'paid' => 'processing',
        'versandbereit' => 'processing',
        'bezahlt' => 'processing',
        'processing' => 'processing',
        'partially_shipped' => 'shipped',
        'shipped' => 'shipped',
        'versendet' => 'shipped',
        'in_transit' => 'shipped',
        'out_for_delivery' => 'shipped',
        'completed' => 'completed',
        'done' => 'completed',
        'delivered' => 'completed',
        'bestellung_abgeschlossen' => 'completed',
        'cancelled' => 'cancelled',
        'test' => 'test',
    ];

    private const MODIFIABLE_STATUS_TARGETS = [
        'versendet' => 'Versendet',
        'bestellung_abgeschlossen' => 'Bestellung abgeschlossen',
    ];

    public function fetchOrders(
        Context $context,
        ?string $channel = null,
        ?string $search = null,
        int $page = 1,
        int $limit = 50,
        ?string $sort = null,
        ?string $order = null,
        array $filters = [],
        ?string $selectedArea = null,
        ?string $selectedMainView = null
    ): array {
        $page = max(1, $page);
        $limit = $limit > 0 ? $limit : 50;
        $sortField = $this->resolveSortField($sort);
        $sortDirection = $this->resolveSortDirection($order);

        $criteria = new Criteria();
        $criteria->setLimit(5000);
        $result = $this->orderRepository->search($criteria, $context);

        $orderIds = [];
        foreach ($result->getEntities() as $entity) {
            $orderIds[] = $entity->getId();
        }

        $metadataByOrderId = $this->fetchMetadataByOrderIds($orderIds);

        $orders = [];
        foreach ($result->getEntities() as $entity) {
            $metadata = $metadataByOrderId[$entity->getId()] ?? null;
            $externalId = $this->resolveExternalId($entity->getCustomFields(), $metadata);
            if ($externalId === null) {
                continue;
            }

            $orders[] = $this->mapOrderToListItem($entity, $externalId, $metadata);
        }

        if ($channel) {
            $orders = array_values(array_filter(
                $orders,
                static fn (array $orderItem): bool => ($orderItem['channel'] ?? '') === $channel
            ));
        }

        $orders = $this->filterOrdersByArea($orders, $selectedArea);
        $orders = $this->filterOrdersByMainView($orders, $selectedMainView);

        if ($search) {
            $orders = array_values(array_filter(
                $orders,
                static function (array $orderItem) use ($search): bool {
                    $haystacks = [
                        $orderItem['orderNumber'] ?? '',
                        $orderItem['customerName'] ?? '',
                        $orderItem['orderReference'] ?? '',
                        $orderItem['email'] ?? '',
                    ];

                    foreach ($haystacks as $value) {
                        if ($value !== '' && mb_stripos((string) $value, $search) !== false) {
                            return true;
                        }
                    }

                    return false;
                }
            ));
        }

        if ($filters !== []) {
            $orders = array_values(array_filter(
                $orders,
                fn (array $orderItem): bool => $this->matchesListFilters($orderItem, $filters)
            ));
        }

        $orders = $this->sortOrders($orders, $sortField, $sortDirection);
        $total = count($orders);
        $orders = array_slice($orders, ($page - 1) * $limit, $limit);

        $summary = $this->buildSummary($orders);

        return [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => (int) ceil($total / max(1, $limit)),
            'totalElements' => $total,
            'summary' => $summary,
            'orders' => $orders,
        ];
    }

    public function fetchOrderDetail(Context $context, string $orderId): ?array
    {
        $criteria = new Criteria([$orderId]);

        $entity = $this->orderRepository->search($criteria, $context)->first();
        if ($entity === null) {
            return null;
        }

        $metadataByOrderId = $this->fetchMetadataByOrderIds([$entity->getId()]);
        $metadata = $metadataByOrderId[$entity->getId()] ?? null;
        $externalId = $this->resolveExternalId($entity->getCustomFields(), $metadata);
        if ($externalId === null) {
            return null;
        }

        return $this->mapOrderToDetail($entity, $externalId, $metadata);
    }

    public function fetchOrderStatuses(Context $context, string $orderId): ?array
    {
        $criteria = new Criteria([$orderId]);
        $entity = $this->orderRepository->search($criteria, $context)->first();
        if ($entity === null) {
            return null;
        }

        $metadataByOrderId = $this->fetchMetadataByOrderIds([$entity->getId()]);
        $metadata = $metadataByOrderId[$entity->getId()] ?? null;
        if ($metadata === null) {
            return null;
        }

        $payload = $metadata['rawPayload'] ?? [];
        $trackingEvents = $this->extractTrackingEvents($payload);
        $trackingAggregation = $this->aggregateTrackingEvents($trackingEvents);

        $shopwareStatus = $this->extractStatusFromSource($payload, ['shopwareStatus', 'shopware_status', 'shopware']);
        $san6Status = $this->extractStatusFromSource($payload, ['san6Status', 'san6_status', 'ordersStatusName', 'statusLabel']);
        $trackingStatus = $trackingAggregation['trackingStatus'];
        $aggregatedStatus = $this->resolveAggregatedBusinessStatus($shopwareStatus, $san6Status, $trackingStatus, $trackingAggregation['allPackagesDelivered']);

        return [
            'internalOrderId' => $orderId,
            'externalId' => $metadata['externalId'],
            'channel' => $metadata['channel'],
            'sources' => [
                'shopware' => $shopwareStatus,
                'san6' => $san6Status,
                'tracking' => $trackingStatus,
            ],
            'tracking' => [
                'events' => $trackingEvents,
                'allPackagesDelivered' => $trackingAggregation['allPackagesDelivered'],
                'deliveredPackages' => $trackingAggregation['deliveredPackages'],
                'totalPackages' => $trackingAggregation['totalPackages'],
            ],
            'aggregatedStatus' => $aggregatedStatus,
        ];
    }

    public function updateModifiableStatus(Context $context, string $orderId, string $targetStatus): array
    {
        $normalizedTarget = strtolower(str_replace([' ', '-'], '_', trim($targetStatus)));
        $businessTarget = self::MODIFIABLE_STATUS_TARGETS[$normalizedTarget] ?? null;

        if ($businessTarget === null) {
            throw new \InvalidArgumentException('Unsupported status target. Allowed: Versendet, Bestellung abgeschlossen.');
        }

        $statuses = $this->fetchOrderStatuses($context, $orderId);
        if ($statuses === null) {
            throw new \RuntimeException('Order not found.');
        }

        if ($businessTarget === 'Bestellung abgeschlossen' && ($statuses['tracking']['allPackagesDelivered'] ?? false) !== true) {
            throw new \InvalidArgumentException('Bestellung abgeschlossen is only allowed when all packages are delivered.');
        }

        $metadataByOrderId = $this->fetchMetadataByOrderIds([$orderId]);
        $metadata = $metadataByOrderId[$orderId] ?? null;
        if ($metadata === null) {
            throw new \RuntimeException('Order metadata not found.');
        }

        $payload = $metadata['rawPayload'];
        $payload['status'] = $this->normalizeStatusCode($businessTarget);
        $payload['statusLabel'] = $businessTarget;
        $payload['ordersStatusName'] = $businessTarget;
        $payload['aggregatedStatus'] = $businessTarget;
        $payload['statusSources'] = [
            'shopware' => $statuses['sources']['shopware'] ?? null,
            'san6' => $statuses['sources']['san6'] ?? null,
            'tracking' => $statuses['sources']['tracking'] ?? null,
        ];

        if (isset($payload['detail']) && is_array($payload['detail'])) {
            $payload['detail']['additional']['status'] = $businessTarget;
        }

        $this->connection->update('external_order_data', [
            'raw_payload' => json_encode($payload, JSON_THROW_ON_ERROR),
            'source_status' => $this->normalizeStatusCode($businessTarget),
            'updated_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'),
        ], ['id' => hex2bin($metadata['id'])]);

        $propagation = $this->propagateStatusUpdate($metadata['externalId'], $businessTarget, $statuses);

        return [
            'internalOrderId' => $orderId,
            'externalId' => $metadata['externalId'],
            'status' => $businessTarget,
            'propagation' => $propagation,
            'tracking' => $statuses['tracking'],
        ];
    }

    /**
     * @param array<int, string> $orderIds
     *
     * @return array{updated:int, alreadyMarked:int, notFound:int}
     */
    public function markOrdersAsTest(Context $context, array $orderIds): array
    {
        $normalizedIds = array_values(array_unique(array_filter(array_map(
            static fn (mixed $id): string => trim((string) $id),
            $orderIds,
        ), static fn (string $id): bool => $id !== '')));

        if ($normalizedIds === []) {
            return ['updated' => 0, 'alreadyMarked' => 0, 'notFound' => 0];
        }

        $criteria = new Criteria();
        $criteria->addFilter(new EqualsAnyFilter('id', $normalizedIds));
        $entities = $this->orderRepository->search($criteria, $context)->getEntities();

        $metadataByOrderId = $this->fetchMetadataByOrderIds($normalizedIds);

        $upserts = [];
        $foundIds = [];
        $alreadyMarked = 0;

        foreach ($entities as $entity) {
            $metadata = $metadataByOrderId[$entity->getId()] ?? null;
            $externalId = $this->resolveExternalId($entity->getCustomFields(), $metadata);
            if ($externalId === null) {
                continue;
            }

            $customFields = $entity->getCustomFields() ?? [];

            $foundIds[] = $entity->getId();
            $isAlreadyMarked = (bool) ($customFields['external_order_is_test_order'] ?? false);
            if ($isAlreadyMarked) {
                $alreadyMarked++;
                continue;
            }

            $customFields['external_order_is_test_order'] = true;
            $customFields['external_order_status'] = 'test';
            $customFields['external_order_status_label'] = 'Test';

            $upserts[] = [
                'id' => $entity->getId(),
                'customFields' => $customFields,
            ];

            if ($metadata !== null) {
                $payload = $metadata['rawPayload'];
                $payload['isTestOrder'] = true;
                $payload['status'] = 'test';
                $payload['statusLabel'] = 'Test';
                $payload['ordersStatusName'] = 'Test';
                $payload['orderStatusColor'] = '9e9e9e';

                if (isset($payload['detail']) && is_array($payload['detail'])) {
                    $payload['detail']['additional']['status'] = 'Test';
                }

                $this->connection->update('external_order_data', [
                    'raw_payload' => json_encode($payload, JSON_THROW_ON_ERROR),
                    'source_status' => 'test',
                    'updated_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s.v'),
                ], ['id' => hex2bin($metadata['id'])]);
            }
        }

        if ($upserts !== []) {
            $this->orderRepository->upsert($upserts, $context);
        }

        return [
            'updated' => count($upserts),
            'alreadyMarked' => $alreadyMarked,
            'notFound' => count(array_diff($normalizedIds, $foundIds)),
        ];
    }

    private function mapOrderToListItem(OrderEntity $order, string $externalId, ?array $metadata): array
    {
        $payload = $metadata['rawPayload'] ?? [];
        $detail = $payload['detail'] ?? null;
        $detail = is_array($detail) ? $detail : null;

        $customer = $detail['customer'] ?? null;
        $customer = is_array($customer) ? $customer : [];
        $additional = $detail['additional'] ?? null;
        $additional = is_array($additional) ? $additional : [];
        $totals = $detail['totals'] ?? null;
        $totals = is_array($totals) ? $totals : [];
        $customerName = $payload['customersName']
            ?? $payload['customerName']
            ?? trim(($customer['firstName'] ?? '') . ' ' . ($customer['lastName'] ?? ''));
        $customerName = $customerName !== '' ? $customerName : 'N/A';

        $email = $payload['customersEmailAddress'] ?? $payload['email'] ?? ($customer['email'] ?? 'N/A');
        $orderNumber = (string) ($payload['orderNumber'] ?? ($detail['orderNumber'] ?? $order->getOrderNumber() ?? $externalId));
        $orderReference = (string) ($payload['auftragNumber'] ?? $payload['orderReference'] ?? $orderNumber);
        $channel = $payload['channel'] ?? 'unknown';

        $statusLabel = $payload['ordersStatusName'] ?? $payload['statusLabel'] ?? ($additional['status'] ?? 'Processing');
        $statusCode = $this->normalizeBusinessStatusCode(
            $payload['statusCode']
            ?? $payload['status']
            ?? ($metadata['source_status'] ?? null)
            ?? $statusLabel
        ) ?? 'processing';

        $orderDate = $payload['orderDate'] ?? $payload['datePurchased'] ?? $payload['date'] ?? ($additional['orderDate'] ?? ($order->getOrderDateTime()?->format(DATE_ATOM) ?? ''));
        $trackingNumbers = $payload['trackingNumbers'] ?? $payload['trackingNumber'] ?? [];
        if (!is_array($trackingNumbers)) {
            $trackingNumbers = [$trackingNumbers];
        }

        $trackingNumbers = array_values(array_filter(array_map(
            static fn (mixed $value): string => trim((string) $value),
            $trackingNumbers
        ), static fn (string $value): bool => $value !== ''));

        $latestShippingDate = $payload['latestShippingDate'] ?? $payload['shippingDateLatest'] ?? ($additional['latestShippingDate'] ?? null);
        $shippingDate = $payload['shippingDate'] ?? $payload['versandDatum'] ?? ($additional['shippingDate'] ?? null);
        $latestDeliveryDate = $payload['latestDeliveryDate'] ?? $payload['lieferzeitpunktLatest'] ?? ($additional['latestDeliveryDate'] ?? null);
        $deliveryDate = $payload['deliveryDate'] ?? $payload['lieferDatum'] ?? ($additional['deliveryDate'] ?? null);
        $lieferterminLieferant = $payload['lieferterminLieferant'] ?? $payload['supplierDeliveryDate'] ?? ($additional['lieferterminLieferant'] ?? null);
        $lieferterminAuftragsbearbeitung = $payload['lieferterminAuftragsbearbeitung'] ?? $payload['neuerLiefertermin'] ?? $payload['newDeliveryDate'] ?? ($additional['lieferterminAuftragsbearbeitung'] ?? null);
        $changedByUser = $payload['changedByUser'] ?? $payload['user'] ?? $customerName;
        $positions = $this->extractPositions($detail);
        $san6OrderNumber = $this->resolveSan6OrderNumber($payload, $orderReference);

        $totalItems = $payload['totalItems'] ?? $this->countDetailItems($detail);
        $totalRevenue = $payload['totalRevenue'] ?? ($totals['sum'] ?? $order->getAmountTotal() ?? 0.0);
        $orderId = $order->getId();
        $statusColor = $payload['orderStatusColor'] ?? ($additional['statusColor'] ?? null);
        $customFields = $order->getCustomFields() ?? [];
        $isTestOrder = (bool) (($customFields['external_order_is_test_order'] ?? null) ?? ($payload['isTestOrder'] ?? false));

        return [
            'id' => $order->getId(),
            'externalId' => $externalId,
            'orderId' => $orderId,
            'channel' => $channel,
            'orderNumber' => $orderNumber,
            'auftragNumber' => $orderReference,
            'customerName' => $customerName,
            'customersName' => $customerName,
            'orderReference' => $orderReference,
            'email' => $email,
            'customersEmailAddress' => $email,
            'date' => $orderDate,
            'datePurchased' => $orderDate,
            'orderDate' => $orderDate,
            'status' => $statusCode,
            'statusCode' => $statusCode,
            'statusLabel' => $statusLabel,
            'ordersStatusName' => $statusLabel,
            'orderStatusColor' => $statusColor,
            'isTestOrder' => $isTestOrder,
            'san6' => $san6OrderNumber,
            'san6OrderNumber' => $san6OrderNumber,
            'changedByUser' => $changedByUser,
            'sendenummer' => $payload['sendenummer'] ?? implode(', ', $trackingNumbers),
            'trackingNumber' => $payload['trackingNumber'] ?? implode(', ', $trackingNumbers),
            'trackingNumbers' => $trackingNumbers,
            'latestShippingDate' => $latestShippingDate,
            'shippingDate' => $shippingDate,
            'latestDeliveryDate' => $latestDeliveryDate,
            'deliveryDate' => $deliveryDate,
            'lieferterminLieferant' => $lieferterminLieferant,
            'lieferterminAuftragsbearbeitung' => $lieferterminAuftragsbearbeitung,
            'neuerLiefertermin' => $lieferterminAuftragsbearbeitung,
            'totalItems' => (int) $totalItems,
            'totalRevenue' => (float) $totalRevenue,
            'positions' => $positions,
        ];
    }

    /**
     * @return array<int, array{positionId:string, positionNumber:string, productLabel:string, orderedQuantity:int, lieferterminLieferant:?string}>
     */
    private function extractPositions(?array $detail): array
    {
        if (!is_array($detail) || !is_array($detail['items'] ?? null)) {
            return [];
        }

        $positions = [];

        foreach ($detail['items'] as $index => $item) {
            if (!is_array($item)) {
                continue;
            }

            $positionId = trim((string) ($item['positionId'] ?? $item['id'] ?? $item['lineItemId'] ?? $item['identifier'] ?? ''));
            if ($positionId === '') {
                $positionId = (string) ($index + 1);
            }

            $positionNumber = trim((string) ($item['positionNumber'] ?? $item['itemNumber'] ?? $item['number'] ?? ''));
            if ($positionNumber === '') {
                $positionNumber = (string) ($index + 1);
            }

            $orderedQuantity = (int) ($item['orderedQuantity'] ?? $item['quantity'] ?? 0);

            $positions[] = [
                'positionId' => $positionId,
                'positionNumber' => $positionNumber,
                'productLabel' => (string) ($item['name'] ?? $item['label'] ?? $item['title'] ?? ''),
                'orderedQuantity' => $orderedQuantity,
                'lieferterminLieferant' => isset($item['lieferterminLieferant']) ? (string) $item['lieferterminLieferant'] : null,
            ];
        }

        return $positions;
    }

    private function mapOrderToDetail(OrderEntity $order, string $externalId, ?array $metadata): array
    {
        $payload = $metadata['rawPayload'] ?? [];
        if (isset($payload['detail']) && is_array($payload['detail'])) {
            $detail = $payload['detail'];
            $detail['items'] = $this->normalizeDetailItems($detail['items'] ?? []);
            $detail['internalOrderId'] = $order->getId();
            $detail['externalId'] = $externalId;

            return $detail;
        }

        return $this->buildDetailFallback($payload, $externalId);
    }

    /**
     * @param array<int, string> $orderIds
     *
     * @return array<string, array{id:string, externalId:string, channel:?string, rawPayload:array<string,mixed>}>
     */
    private function fetchMetadataByOrderIds(array $orderIds): array
    {
        $orderIds = array_values(array_unique(array_filter($orderIds)));
        if ($orderIds === []) {
            return [];
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT LOWER(HEX(id)) as id, LOWER(HEX(order_id)) as order_id, external_id, channel, raw_payload
             FROM external_order_data
             WHERE order_id IN (:orderIds)',
            ['orderIds' => array_map(static fn (string $id): string => hex2bin($id) ?: '', $orderIds)],
            ['orderIds' => ArrayParameterType::BINARY]
        );

        $result = [];
        foreach ($rows as $row) {
            $orderId = $row['order_id'] ?? null;
            $externalId = $row['external_id'] ?? null;
            if (!is_string($orderId) || !is_string($externalId) || $externalId === '') {
                continue;
            }

            $rawPayload = json_decode((string) ($row['raw_payload'] ?? '{}'), true);
            $result[$orderId] = [
                'id' => (string) ($row['id'] ?? ''),
                'externalId' => $externalId,
                'channel' => isset($row['channel']) ? (string) $row['channel'] : null,
                'rawPayload' => is_array($rawPayload) ? $rawPayload : [],
            ];
        }

        return $result;
    }

    /**
     * @param array<string, mixed>|null $customFields
     * @param array{id:string, externalId:string, channel:?string, rawPayload:array<string,mixed>}|null $metadata
     */
    private function resolveExternalId(?array $customFields, ?array $metadata): ?string
    {
        $fromCustomFields = $customFields['external_order_id'] ?? null;
        if (is_string($fromCustomFields) && $fromCustomFields !== '') {
            return $fromCustomFields;
        }

        return $metadata['externalId'] ?? null;
    }

    private function buildDetailFallback(array $payload, string $externalId): array
    {
        $customerName = $payload['customerName'] ?? 'N/A';
        $names = array_values(array_filter(explode(' ', (string) $customerName), static fn (string $value) => $value !== ''));
        $firstName = $names[0] ?? 'N/A';
        $lastName = $names[1] ?? '';
        $orderNumber = $payload['orderNumber'] ?? $externalId;

        return [
            'orderNumber' => $orderNumber,
            'customer' => [
                'number' => 'N/A',
                'firstName' => $firstName,
                'lastName' => $lastName !== '' ? $lastName : 'N/A',
                'email' => $payload['email'] ?? 'N/A',
                'group' => 'N/A',
            ],
            'billingAddress' => [
                'company' => 'N/A',
                'street' => 'N/A',
                'zip' => 'N/A',
                'city' => 'N/A',
                'country' => 'N/A',
            ],
            'shippingAddress' => [
                'name' => $customerName,
                'street' => 'N/A',
                'zipCity' => 'N/A',
                'country' => 'N/A',
            ],
            'payment' => [
                'method' => 'N/A',
                'code' => 'N/A',
                'dueDate' => 'N/A',
                'outstanding' => 'N/A',
                'settled' => 'N/A',
                'extra' => 'N/A',
            ],
            'shipping' => [
                'method' => 'N/A',
                'carrier' => 'N/A',
                'trackingNumbers' => [],
            ],
            'additional' => [
                'orderDate' => $payload['orderDate'] ?? $payload['datePurchased'] ?? $payload['date'] ?? '',
                'status' => $payload['statusLabel'] ?? 'Processing',
                'orderType' => 'N/A',
                'notes' => 'N/A',
                'consultant' => 'N/A',
                'tenant' => 'N/A',
                'san6OrderNumber' => $orderNumber,
                'orgaEntries' => [],
                'documents' => [],
                'pdmsId' => 'N/A',
                'pdmsVariant' => 'N/A',
                'topmArticleNumber' => 'N/A',
                'topmExecution' => 'N/A',
                'statusHistorySource' => 'Database',
            ],
            'items' => $this->normalizeDetailItems([]),
            'statusHistory' => [
                [
                    'status' => $payload['statusLabel'] ?? 'Processing',
                    'date' => $payload['date'] ?? '',
                    'comment' => '',
                ],
            ],
            'totals' => [
                'items' => 0.0,
                'shipping' => 0.0,
                'sum' => (float) ($payload['totalRevenue'] ?? 0.0),
                'tax' => 0.0,
                'net' => 0.0,
            ],
        ];
    }


    /**
     * @param mixed $items
     *
     * @return array<int, array<string, mixed>>
     */
    private function normalizeDetailItems(mixed $items): array
    {
        if (!is_array($items)) {
            return [];
        }

        $normalizedItems = [];

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $orderedQuantity = (int) ($item['orderedQuantity'] ?? $item['quantity'] ?? 0);
            $shippedQuantity = (int) ($item['shippedQuantity'] ?? $orderedQuantity);

            $item['quantity'] = $orderedQuantity;
            $item['orderedQuantity'] = $orderedQuantity;
            $item['shippedQuantity'] = $shippedQuantity;

            $normalizedItems[] = $item;
        }

        return $normalizedItems;
    }

    private function countDetailItems(?array $detail): int
    {
        if (!is_array($detail) || !isset($detail['items']) || !is_array($detail['items'])) {
            return 0;
        }

        $total = 0;
        foreach ($detail['items'] as $item) {
            if (!is_array($item)) {
                continue;
            }

            $total += (int) ($item['quantity'] ?? 0);
        }

        return $total;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function extractTrackingEvents(array $payload): array
    {
        $candidates = [
            $payload['trackingEvents'] ?? null,
            $payload['tracking']['events'] ?? null,
            $payload['detail']['shipping']['trackingEvents'] ?? null,
            $payload['detail']['shipping']['events'] ?? null,
            $payload['detail']['shipping']['packages'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (!is_array($candidate)) {
                continue;
            }

            if (isset($candidate[0]) && is_array($candidate[0])) {
                if (isset($candidate[0]['events']) && is_array($candidate[0]['events'])) {
                    $events = [];
                    foreach ($candidate as $package) {
                        if (!is_array($package) || !is_array($package['events'] ?? null)) {
                            continue;
                        }
                        foreach ($package['events'] as $event) {
                            if (is_array($event)) {
                                $events[] = $event;
                            }
                        }
                    }

                    return $events;
                }

                return array_values(array_filter($candidate, static fn (mixed $item): bool => is_array($item)));
            }
        }

        return [];
    }

    /**
     * @param array<int, array<string, mixed>> $trackingEvents
     *
     * @return array{trackingStatus:?string, allPackagesDelivered:bool, deliveredPackages:int, totalPackages:int}
     */
    private function aggregateTrackingEvents(array $trackingEvents): array
    {
        if ($trackingEvents === []) {
            return [
                'trackingStatus' => null,
                'allPackagesDelivered' => false,
                'deliveredPackages' => 0,
                'totalPackages' => 0,
            ];
        }

        $perPackageDelivered = [];
        $fallbackDelivered = 0;

        foreach ($trackingEvents as $event) {
            $status = strtolower((string) ($event['status'] ?? $event['statusCode'] ?? $event['event'] ?? ''));
            $normalizedStatus = str_replace([' ', '-'], '_', $status);
            $packageKey = (string) ($event['trackingNumber'] ?? $event['packageId'] ?? '');
            $isDelivered = in_array($normalizedStatus, ['delivered', 'zugestellt', 'livree'], true);

            if ($packageKey !== '') {
                $perPackageDelivered[$packageKey] = ($perPackageDelivered[$packageKey] ?? false) || $isDelivered;
            } elseif ($isDelivered) {
                $fallbackDelivered++;
            }
        }

        $totalPackages = count($perPackageDelivered);
        $deliveredPackages = count(array_filter($perPackageDelivered, static fn (bool $delivered): bool => $delivered));

        if ($totalPackages === 0) {
            $totalPackages = max(1, $fallbackDelivered);
            $deliveredPackages = $fallbackDelivered;
        }

        $allPackagesDelivered = $totalPackages > 0 && $deliveredPackages === $totalPackages;

        return [
            'trackingStatus' => $allPackagesDelivered ? 'delivered' : 'in_transit',
            'allPackagesDelivered' => $allPackagesDelivered,
            'deliveredPackages' => $deliveredPackages,
            'totalPackages' => $totalPackages,
        ];
    }

    /**
     * @param array<int, string> $candidateKeys
     */
    private function extractStatusFromSource(array $payload, array $candidateKeys): ?string
    {
        foreach ($candidateKeys as $key) {
            $value = $payload[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }

    private function resolveAggregatedBusinessStatus(?string $shopwareStatus, ?string $san6Status, ?string $trackingStatus, bool $allPackagesDelivered): string
    {
        if ($allPackagesDelivered) {
            return 'Bestellung abgeschlossen';
        }

        $normalizedCandidates = array_map(
            static fn (?string $status): string => strtolower(str_replace([' ', '-'], '_', (string) $status)),
            [$trackingStatus, $shopwareStatus, $san6Status]
        );

        if (in_array('shipped', $normalizedCandidates, true) || in_array('versendet', $normalizedCandidates, true) || in_array('in_transit', $normalizedCandidates, true)) {
            return 'Versendet';
        }

        return 'Bezahlt / in Bearbeitung';
    }

    private function normalizeStatusCode(string $statusLabel): string
    {
        return match ($statusLabel) {
            'Versendet' => 'shipped',
            'Bestellung abgeschlossen' => 'completed',
            default => 'processing',
        };
    }

    /**
     * @return array<string, array{success:bool,message:string|null}>
     */
    private function propagateStatusUpdate(string $externalId, string $status, array $statuses): array
    {
        $results = [
            'shopware' => ['success' => false, 'message' => 'Not configured'],
            'gambio' => ['success' => false, 'message' => 'Not configured'],
        ];

        if ($this->httpClient === null || $this->systemConfigService === null) {
            $results['shopware']['message'] = 'HTTP/SystemConfig service unavailable';
            $results['gambio']['message'] = 'HTTP/SystemConfig service unavailable';

            return $results;
        }

        foreach (['shopware', 'gambio'] as $target) {
            $url = trim((string) ($this->systemConfigService->get(sprintf('ExternalOrders.config.externalOrdersStatusUpdateUrl%s', ucfirst($target))) ?? ''));
            $token = trim((string) ($this->systemConfigService->get(sprintf('ExternalOrders.config.externalOrdersStatusUpdateToken%s', ucfirst($target))) ?? ''));

            if ($url === '') {
                continue;
            }

            try {
                $headers = ['Content-Type' => 'application/json'];
                if ($token !== '') {
                    $headers['Authorization'] = sprintf('Bearer %s', $token);
                }

                $this->httpClient->request('POST', $url, [
                    'headers' => $headers,
                    'json' => [
                        'externalId' => $externalId,
                        'status' => $status,
                        'tracking' => $statuses['tracking'] ?? [],
                    ],
                ]);

                $results[$target] = ['success' => true, 'message' => null];
            } catch (\Throwable $exception) {
                $results[$target] = ['success' => false, 'message' => $exception->getMessage()];
                $this->logger?->warning('External order status propagation failed.', [
                    'target' => $target,
                    'externalId' => $externalId,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return $results;
    }

    private function resolveSortField(?string $sort): string
    {
        $allowed = [
            'orderNumber' => 'orderNumber',
            'orderReference' => 'orderReference',
            'customerName' => 'customerName',
            'email' => 'email',
            'date' => 'date',
            'statusLabel' => 'statusLabel',
        ];

        if ($sort !== null && $sort !== '') {
            return $allowed[$sort] ?? $allowed['date'];
        }

        return $allowed['date'];
    }

    private function resolveSortDirection(?string $order): string
    {
        return strtoupper((string) $order) === FieldSorting::ASCENDING
            ? FieldSorting::ASCENDING
            : FieldSorting::DESCENDING;
    }

    /**
     * @param array<int, array<string, mixed>> $orders
     *
     * @return array<int, array<string, mixed>>
     */

    private function matchesListFilters(array $orderItem, array $filters): bool
    {
        foreach ($filters as $key => $value) {
            $needle = trim((string) $value);
            if ($needle === '') {
                continue;
            }

            switch ($key) {
                case 'bestellnummer':
                    if (!$this->stringContains($orderItem['orderNumber'] ?? null, $needle)) {
                        return false;
                    }
                    break;
                case 'san6OrderNumber':
                case 'san6':
                    if (!$this->stringContains($orderItem['san6OrderNumber'] ?? ($orderItem['san6'] ?? ($orderItem['orderReference'] ?? null)), $needle)) {
                        return false;
                    }
                    break;
                case 'changedByUser':
                    if (!$this->stringContains($orderItem['changedByUser'] ?? ($orderItem['customerName'] ?? null), $needle)) {
                        return false;
                    }
                    break;
                case 'sendenummer':
                    if (!$this->stringContains($orderItem['sendenummer'] ?? ($orderItem['trackingNumber'] ?? null), $needle)) {
                        return false;
                    }
                    break;
                case 'status':
                case 'statusCode':
                    if (!$this->statusMatches($orderItem, $needle)) {
                        return false;
                    }
                    break;
                case 'orderDateFrom':
                    if (!$this->dateInRange($orderItem['orderDate'] ?? ($orderItem['datePurchased'] ?? ($orderItem['date'] ?? null)), $needle, null)) {
                        return false;
                    }
                    break;
                case 'orderDateTo':
                    if (!$this->dateInRange($orderItem['orderDate'] ?? ($orderItem['datePurchased'] ?? ($orderItem['date'] ?? null)), null, $needle)) {
                        return false;
                    }
                    break;
                case 'orderedQuantity':
                    $orderedQuantities = [];
                    foreach (($orderItem['positions'] ?? []) as $position) {
                        if (!is_array($position)) {
                            continue;
                        }

                        $orderedQuantities[] = (string) ((int) ($position['orderedQuantity'] ?? 0));
                    }

                    if ($orderedQuantities === [] || !array_filter($orderedQuantities, static fn (string $quantity): bool => mb_stripos($quantity, $needle) !== false)) {
                        return false;
                    }
                    break;
                case 'latestShippingDateFrom':
                    if (!$this->dateInRange($orderItem['latestShippingDate'] ?? null, $needle, null)) {
                        return false;
                    }
                    break;
                case 'latestShippingDateTo':
                    if (!$this->dateInRange($orderItem['latestShippingDate'] ?? null, null, $needle)) {
                        return false;
                    }
                    break;
                case 'shippingDateFrom':
                    if (!$this->dateInRange($orderItem['shippingDate'] ?? null, $needle, null)) {
                        return false;
                    }
                    break;
                case 'shippingDateTo':
                    if (!$this->dateInRange($orderItem['shippingDate'] ?? null, null, $needle)) {
                        return false;
                    }
                    break;
                case 'latestDeliveryDateFrom':
                    if (!$this->dateInRange($orderItem['latestDeliveryDate'] ?? null, $needle, null)) {
                        return false;
                    }
                    break;
                case 'latestDeliveryDateTo':
                    if (!$this->dateInRange($orderItem['latestDeliveryDate'] ?? null, null, $needle)) {
                        return false;
                    }
                    break;
                case 'deliveryDateFrom':
                    if (!$this->dateInRange($orderItem['deliveryDate'] ?? null, $needle, null)) {
                        return false;
                    }
                    break;
                case 'deliveryDateTo':
                    if (!$this->dateInRange($orderItem['deliveryDate'] ?? null, null, $needle)) {
                        return false;
                    }
                    break;
                case 'lieferterminLieferantFrom':
                    if (!$this->dateInRange($orderItem['lieferterminLieferant'] ?? null, $needle, null)) {
                        return false;
                    }
                    break;
                case 'lieferterminLieferantTo':
                    if (!$this->dateInRange($orderItem['lieferterminLieferant'] ?? null, null, $needle)) {
                        return false;
                    }
                    break;
                case 'lieferterminAuftragsbearbeitungFrom':
                    if (!$this->dateInRange($orderItem['lieferterminAuftragsbearbeitung'] ?? null, $needle, null)) {
                        return false;
                    }
                    break;
                case 'lieferterminAuftragsbearbeitungTo':
                    if (!$this->dateInRange($orderItem['lieferterminAuftragsbearbeitung'] ?? null, null, $needle)) {
                        return false;
                    }
                    break;
                default:
                    break;
            }
        }

        return true;
    }

    private function stringContains(mixed $value, string $needle): bool
    {
        $haystack = mb_strtolower(trim((string) ($value ?? '')));
        $needle = mb_strtolower(trim($needle));

        if ($needle === '') {
            return true;
        }

        return $haystack !== '' && mb_stripos($haystack, $needle) !== false;
    }

    private function statusMatches(array $orderItem, string $needle): bool
    {
        $normalizedNeedle = mb_strtolower(trim($needle));
        $statusSources = [
            $orderItem['statusCode'] ?? null,
            $orderItem['status'] ?? null,
            $orderItem['statusLabel'] ?? null,
            $orderItem['ordersStatusName'] ?? null,
        ];

        if (in_array($normalizedNeedle, ['processing', 'shipped', 'completed', 'cancelled', 'test'], true)) {
            foreach ($statusSources as $source) {
                if ($this->normalizeBusinessStatusCode($source) === $normalizedNeedle) {
                    return true;
                }
            }

            return false;
        }

        foreach ($statusSources as $source) {
            if ($this->stringContains($source, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function resolveSan6OrderNumber(array $payload, mixed $orderReference): string
    {
        $san6OrderNumber = $payload['san6OrderNumber'] ?? $payload['san6'] ?? $payload['orderReference'] ?? $payload['auftragNumber'] ?? $orderReference;

        return trim((string) $san6OrderNumber);
    }

    private function normalizeBusinessStatusCode(mixed $status): ?string
    {
        $normalized = str_replace([' ', '-'], '_', mb_strtolower(trim((string) ($status ?? ''))));
        if ($normalized === '') {
            return null;
        }

        return self::BUSINESS_STATUS_CODE_MAP[$normalized] ?? null;
    }

    private function dateInRange(mixed $value, ?string $from, ?string $to): bool
    {
        $candidate = $this->normalizeDateValue($value);
        if ($candidate === null) {
            return false;
        }

        $fromDate = $from !== null ? $this->normalizeDateValue($from) : null;
        $toDate = $to !== null ? $this->normalizeDateValue($to) : null;

        if ($fromDate !== null && $candidate < $fromDate) {
            return false;
        }

        if ($toDate !== null && $candidate > $toDate) {
            return false;
        }

        return true;
    }

    private function normalizeDateValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        try {
            return (new \DateTimeImmutable($raw))->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }


    /**
     * @param array<int, array<string, mixed>> $orders
     *
     * @return array<int, array<string, mixed>>
     */
    private function filterOrdersByArea(array $orders, ?string $selectedArea): array
    {
        $normalizedArea = $this->normalizeSelectionKey($selectedArea);
        if ($normalizedArea === null) {
            return $orders;
        }

        $areaToChannels = [
            'first_medical_ecommerce' => ['b2b'],
            'medical_solutions' => ['ebay_de', 'kaufland', 'ebay_at', 'zonami', 'peg', 'bezb'],
        ];

        $allowedChannels = $areaToChannels[$normalizedArea] ?? null;
        if ($allowedChannels === null) {
            return $orders;
        }

        return array_values(array_filter(
            $orders,
            static fn (array $orderItem): bool => in_array((string) ($orderItem['channel'] ?? ''), $allowedChannels, true)
        ));
    }

    /**
     * @param array<int, array<string, mixed>> $orders
     *
     * @return array<int, array<string, mixed>>
     */
    private function filterOrdersByMainView(array $orders, ?string $selectedMainView): array
    {
        $normalizedMainView = $this->normalizeSelectionKey($selectedMainView);
        if ($normalizedMainView === null || $normalizedMainView === 'all_orders') {
            return $orders;
        }

        if ($normalizedMainView !== 'open_orders') {
            return $orders;
        }

        return array_values(array_filter(
            $orders,
            fn (array $orderItem): bool => $this->isOpenOrder($orderItem)
        ));
    }

    private function normalizeSelectionKey(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $normalized = trim($value);
        if ($normalized === '') {
            return null;
        }

        $normalized = preg_replace('/(?<!^)[A-Z]/', '_$0', $normalized) ?? $normalized;
        $normalized = str_replace(['-', ' '], '_', $normalized);
        $normalized = strtolower($normalized);

        return trim($normalized, '_') ?: null;
    }

    /**
     * @param array<int, array<string, mixed>> $orders
     *
     * @return array<string, int|float>
     */
    private function buildSummary(array $orders): array
    {
        $totalRevenue = 0.0;
        $totalItems = 0;
        $openOrdersTotal = 0;
        $overdueShippingTotal = 0;
        $overdueDeliveriesCompletedTotal = 0;

        foreach ($orders as $orderItem) {
            $totalRevenue += (float) ($orderItem['totalRevenue'] ?? 0.0);
            $totalItems += (int) ($orderItem['totalItems'] ?? 0);
            $openOrdersTotal += $this->isOpenOrder($orderItem) ? 1 : 0;
            $overdueShippingTotal += $this->isOverdueShipping($orderItem) ? 1 : 0;
            $overdueDeliveriesCompletedTotal += $this->isOverdueCompletedDelivery($orderItem) ? 1 : 0;
        }

        return [
            'orderCount' => count($orders),
            'totalOrders' => count($orders),
            'totalRevenue' => $totalRevenue,
            'totalItems' => $totalItems,
            'totalQuantity' => $totalItems,
            'openOrdersTotal' => $openOrdersTotal,
            'overdueShippingTotal' => $overdueShippingTotal,
            'overdueDeliveriesCompletedTotal' => $overdueDeliveriesCompletedTotal,
        ];
    }

    private function isOpenOrder(array $orderItem): bool
    {
        $statusCandidates = [
            $orderItem['status'] ?? null,
            $orderItem['statusLabel'] ?? null,
            $orderItem['ordersStatusName'] ?? null,
        ];

        foreach ($statusCandidates as $status) {
            $normalized = strtolower(str_replace([' ', '-'], '_', trim((string) ($status ?? ''))));
            if (in_array($normalized, ['open', 'offen', 'processing', 'in_progress', 'pending', 'paid', 'versandbereit', 'bezahlt'], true)) {
                return true;
            }
        }

        return false;
    }

    private function isOverdueShipping(array $orderItem): bool
    {
        if ($this->extractBooleanMetric($orderItem, ['isOverdueShipping', 'overdueShipping', 'shippingOverdue'])) {
            return true;
        }

        $latestShippingDate = $this->normalizeDateValue($orderItem['latestShippingDate'] ?? null);
        if ($latestShippingDate === null) {
            return false;
        }

        return $latestShippingDate < (new \DateTimeImmutable('today'))->format('Y-m-d')
            && !$this->statusMatches($orderItem, 'shipped')
            && !$this->statusMatches($orderItem, 'completed');
    }

    private function isOverdueCompletedDelivery(array $orderItem): bool
    {
        if ($this->extractBooleanMetric($orderItem, ['isOverdueCompletedDelivery', 'overdueCompletedDelivery', 'overdueDeliveryCompleted'])) {
            return true;
        }

        if (!$this->statusMatches($orderItem, 'completed')) {
            return false;
        }

        $deliveryDate = $this->normalizeDateValue($orderItem['deliveryDate'] ?? null);
        if ($deliveryDate === null) {
            return false;
        }

        return $deliveryDate < (new \DateTimeImmutable('today'))->format('Y-m-d');
    }

    /**
     * @param array<string, mixed> $orderItem
     * @param array<int, string> $candidates
     */
    private function extractBooleanMetric(array $orderItem, array $candidates): bool
    {
        foreach ($candidates as $key) {
            $value = $orderItem[$key] ?? null;

            if (is_bool($value)) {
                return $value;
            }

            if (is_numeric($value)) {
                return (float) $value > 0;
            }

            if (is_string($value)) {
                $normalized = strtolower(trim($value));
                if (in_array($normalized, ['1', 'true', 'yes', 'ja'], true)) {
                    return true;
                }

                if (in_array($normalized, ['0', 'false', 'no', 'nein'], true)) {
                    return false;
                }
            }
        }

        return false;
    }

    private function sortOrders(array $orders, string $sortField, string $sortDirection): array
    {
        usort($orders, static function (array $left, array $right) use ($sortField, $sortDirection): int {
            $leftValue = $left[$sortField] ?? '';
            $rightValue = $right[$sortField] ?? '';

            if ($sortField === 'date') {
                $leftValue = strtotime((string) $leftValue) ?: 0;
                $rightValue = strtotime((string) $rightValue) ?: 0;
            }

            $comparison = $leftValue <=> $rightValue;

            return $sortDirection === FieldSorting::ASCENDING ? $comparison : -$comparison;
        });

        return $orders;
    }
}
