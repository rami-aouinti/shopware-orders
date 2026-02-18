<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

use Doctrine\DBAL\Connection;
use ExternalOrders\Service\ExternalOrderTestDataService;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\Uuid\Uuid;

class DemoDataSeederService
{
    private const DOMAINS = ['First Medical', 'E-Commerce', 'Medical Solutions'];
    private const ORDER_PREFIX = 'DEMO-';

    private const SEED_MARKER_PREFIX = 'demo.seeder.run:';

    /** @var array<string, array<string, bool>> */
    private array $tableColumnCache = [];

    public function __construct(
        private readonly Connection $connection,
        private readonly LieferzeitenExternalOrderLinkService $externalOrderLinkService,
        private readonly ?ExternalOrderTestDataService $externalOrderTestDataService,
    ) {
    }


    public function hasDemoData(): bool
    {
        $checks = [
            [
                'sql' => 'SELECT 1 FROM `lieferzeiten_paket` WHERE external_order_id LIKE :prefix LIMIT 1',
                'params' => ['prefix' => self::ORDER_PREFIX . '%'],
            ],
            [
                'sql' => 'SELECT 1 FROM `lieferzeiten_channel_settings` WHERE sales_channel_id LIKE :prefix OR last_changed_by = :changedBy LIMIT 1',
                'params' => ['prefix' => 'demo_%', 'changedBy' => 'demo.seeder'],
            ],
            [
                'sql' => 'SELECT 1 FROM `lieferzeiten_task_assignment_rule` WHERE name LIKE :prefix OR trigger_key LIKE :prefix LIMIT 1',
                'params' => ['prefix' => 'demo_%'],
            ],
            [
                'sql' => 'SELECT 1 FROM `lieferzeiten_notification_toggle` WHERE code LIKE :prefix OR trigger_key LIKE :prefix LIMIT 1',
                'params' => ['prefix' => 'demo_%'],
            ],
        ];

        foreach ($checks as $check) {
            $result = $this->connection->fetchOne($check['sql'], $check['params']);

            if ($result === false) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function removeDemoData(Context $context): array
    {
        $deleted = [];

        $this->connection->transactional(function () use (&$deleted): void {
            $deleted = $this->cleanup();
        });

        return [
            'status' => 'ok',
            'deleted' => $deleted,
            'created' => [],
            'message' => 'Demo data removed successfully.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function seed(Context $context, bool $reset = false, bool $linkExternalOrders = true, ?string $seedRunId = null): array
    {
        $created = [];
        $deleted = [];
        $linkResult = ['linked' => 0, 'missingIds' => [], 'deletedCount' => 0, 'deletedMissingPackages' => 0, 'destructiveCleanup' => false];

        $this->connection->transactional(function () use ($reset, $linkExternalOrders, $seedRunId, &$created, &$deleted, &$linkResult): void {
            $expectedDemoExternalOrderIds = $this->externalOrderTestDataService?->getDemoExternalOrderIds() ?? [];

            if ($reset) {
                $deleted = $this->cleanup();
            }

            $seedMarker = self::SEED_MARKER_PREFIX . ($seedRunId ?: 'default');
            $created = $this->insertDemoData($expectedDemoExternalOrderIds, $seedMarker);

            if ($linkExternalOrders) {
                $linkResult = $this->externalOrderLinkService->linkDemoExternalOrders($expectedDemoExternalOrderIds, $seedRunId, $seedMarker);
            }
        });

        return [
            'status' => 'ok',
            'reset' => $reset,
            'deleted' => $deleted,
            'created' => $created,
            'linking' => $linkResult,
            'message' => 'Demo data generated successfully.',
        ];
    }


    /**
     * @param array<int, string>|null $expectedExternalOrderIds
     * @return array{linked:int, missingIds:array<int, string>, deletedCount:int, deletedMissingPackages:int, destructiveCleanup:bool}
     */
    public function linkExpectedDemoExternalOrders(
        ?array $expectedExternalOrderIds = null,
        ?string $seedRunId = null,
        ?string $expectedSourceMarker = null,
        bool $allowDestructiveCleanup = false,
    ): array
    {
        return $this->externalOrderLinkService->linkDemoExternalOrders(
            $expectedExternalOrderIds ?? ($this->externalOrderTestDataService?->getDemoExternalOrderIds() ?? []),
            $seedRunId,
            $expectedSourceMarker,
            $allowDestructiveCleanup,
        );
    }

    /**
     * @return array<string, int>
     */
    private function cleanup(): array
    {
        $orderPrefixParam = 'DEMO-%';

        $counts = [
            'paket' => 0,
            'position' => 0,
            'lieferterminLieferantHistory' => 0,
            'neuerLieferterminHistory' => 0,
            'sendenummerHistory' => 0,
            'channelSettings' => 0,
            'notificationToggles' => 0,
            'notificationEvents' => 0,
            'taskAssignmentRules' => 0,
            'tasks' => 0,
            'auditLogs' => 0,
        ];

        $demoPaketIds = $this->connection->fetchFirstColumn(
            'SELECT id FROM `lieferzeiten_paket` WHERE external_order_id LIKE :prefix',
            ['prefix' => $orderPrefixParam],
        );

        if ($demoPaketIds !== []) {
            $placeholders = implode(',', array_fill(0, count($demoPaketIds), '?'));

            $demoPositionIds = $this->connection->fetchFirstColumn(
                sprintf('SELECT id FROM `lieferzeiten_position` WHERE paket_id IN (%s)', $placeholders),
                $demoPaketIds,
            );

            if ($demoPositionIds !== []) {
                $positionPlaceholders = implode(',', array_fill(0, count($demoPositionIds), '?'));
                $counts['lieferterminLieferantHistory'] = $this->connection->executeStatement(
                    sprintf('DELETE FROM `lieferzeiten_liefertermin_lieferant_history` WHERE position_id IN (%s)', $positionPlaceholders),
                    $demoPositionIds,
                );
                $counts['neuerLieferterminHistory'] = $this->connection->executeStatement(
                    sprintf('DELETE FROM `lieferzeiten_neuer_liefertermin_history` WHERE position_id IN (%s)', $positionPlaceholders),
                    $demoPositionIds,
                );
                $counts['sendenummerHistory'] = $this->connection->executeStatement(
                    sprintf('DELETE FROM `lieferzeiten_sendenummer_history` WHERE position_id IN (%s)', $positionPlaceholders),
                    $demoPositionIds,
                );
                $counts['position'] = $this->connection->executeStatement(
                    sprintf('DELETE FROM `lieferzeiten_position` WHERE id IN (%s)', $positionPlaceholders),
                    $demoPositionIds,
                );
            }

            $counts['paket'] = $this->connection->executeStatement(
                sprintf('DELETE FROM `lieferzeiten_paket` WHERE id IN (%s)', $placeholders),
                $demoPaketIds,
            );
        }

        $counts['notificationEvents'] = $this->connection->executeStatement(
            'DELETE FROM `lieferzeiten_notification_event` WHERE event_key LIKE :prefix',
            ['prefix' => 'demo:%'],
        );
        $counts['channelSettings'] = $this->connection->executeStatement(
            'DELETE FROM `lieferzeiten_channel_settings` WHERE sales_channel_id LIKE :prefix OR last_changed_by = :changedBy',
            ['prefix' => 'demo_%', 'changedBy' => 'demo.seeder'],
        );
        $counts['notificationToggles'] = $this->connection->executeStatement(
            'DELETE FROM `lieferzeiten_notification_toggle` WHERE code LIKE :prefix OR trigger_key LIKE :prefix',
            ['prefix' => 'demo_%'],
        );
        $counts['taskAssignmentRules'] = $this->connection->executeStatement(
            'DELETE FROM `lieferzeiten_task_assignment_rule` WHERE name LIKE :prefix OR trigger_key LIKE :prefix',
            ['prefix' => 'demo_%'],
        );
        $counts['tasks'] = $this->connection->executeStatement(
            'DELETE FROM `lieferzeiten_task` WHERE payload LIKE :prefix',
            ['prefix' => '%"externalOrderId":"DEMO-%'],
        );
        $counts['auditLogs'] = $this->connection->executeStatement(
            'DELETE FROM `lieferzeiten_audit_log` WHERE payload LIKE :prefix',
            ['prefix' => '%"externalOrderId":"DEMO-%'],
        );

        return $counts;
    }

    /**
     * @return array<string, int>
     */
    private function insertDemoData(array $externalOrderIds, string $seedMarker): array
    {
        $counts = [
            'paket' => 0,
            'position' => 0,
            'lieferterminLieferantHistory' => 0,
            'neuerLieferterminHistory' => 0,
            'sendenummerHistory' => 0,
            'channelSettings' => 0,
            'notificationToggles' => 0,
            'notificationEvents' => 0,
            'taskAssignmentRules' => 0,
            'tasks' => 0,
            'auditLogs' => 0,
        ];

        if ($externalOrderIds === []) {
            return $counts;
        }

        $now = new \DateTimeImmutable('now');
        $datasets = $this->buildOrderDataset($now, $externalOrderIds);

        foreach ($datasets as $dataset) {
            $paketId = $this->uuidBytes();
            $this->connection->insert('lieferzeiten_paket', [
                'id' => $paketId,
                'paket_number' => $dataset['paketNumber'],
                'external_order_id' => $dataset['externalOrderId'],
                'source_system' => $dataset['statusSource'],
                'status' => (string) $dataset['status'],
                'shipping_assignment_type' => $dataset['shippingAssignmentType'],
                'partial_shipment_quantity' => $dataset['partialShipmentQuantity'],
                'order_date' => $dataset['orderDate']->format('Y-m-d H:i:s'),
                'shipping_date' => $dataset['shippingDate']->format('Y-m-d H:i:s'),
                'delivery_date' => $dataset['deliveryDate']->format('Y-m-d H:i:s'),
                'business_date_from' => $dataset['businessFrom']->format('Y-m-d H:i:s'),
                'business_date_to' => $dataset['businessTo']->format('Y-m-d H:i:s'),
                'payment_date' => $dataset['paymentDate']?->format('Y-m-d H:i:s'),
                'calculated_delivery_date' => $dataset['calculatedDeliveryDate']->format('Y-m-d H:i:s'),
                'is_test_order' => $dataset['isTestOrder'] ? 1 : 0,
                'last_changed_by' => $seedMarker,
                'last_changed_at' => $now->format('Y-m-d H:i:s'),
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['paket'];

            foreach ($dataset['positions'] as $index => $positionData) {
                $positionId = $this->uuidBytes();
                $positionPayload = [
                    'id' => $positionId,
                    'paket_id' => $paketId,
                    'position_number' => $positionData['positionNumber'] ?? sprintf('%s-%d', $dataset['externalOrderId'], $index + 1),
                    'article_number' => $positionData['articleNumber'] ?? sprintf('SKU-%d%d', $dataset['status'], $index + 1),
                    'status' => $positionData['status'],
                    'ordered_at' => $dataset['orderDate']->format('Y-m-d H:i:s'),
                    'last_changed_by' => 'demo.seeder',
                    'last_changed_at' => $now->format('Y-m-d H:i:s'),
                    'created_at' => $now->format('Y-m-d H:i:s'),
                ];

                if ($this->tableHasColumn('lieferzeiten_position', 'ordered_quantity') && isset($positionData['orderedQuantity'])) {
                    $positionPayload['ordered_quantity'] = $positionData['orderedQuantity'];
                }
                if ($this->tableHasColumn('lieferzeiten_position', 'shipped_quantity') && isset($positionData['shippedQuantity'])) {
                    $positionPayload['shipped_quantity'] = $positionData['shippedQuantity'];
                }

                $this->connection->insert('lieferzeiten_position', $positionPayload);
                ++$counts['position'];

                $this->connection->insert('lieferzeiten_liefertermin_lieferant_history', [
                    'id' => $this->uuidBytes(),
                    'position_id' => $positionId,
                    'liefertermin_from' => $positionData['supplierFrom']->format('Y-m-d H:i:s'),
                    'liefertermin_to' => $positionData['supplierTo']->format('Y-m-d H:i:s'),
                    'last_changed_by' => 'demo.seeder',
                    'last_changed_at' => $now->format('Y-m-d H:i:s'),
                    'created_at' => $now->format('Y-m-d H:i:s'),
                ]);
                ++$counts['lieferterminLieferantHistory'];

                $this->connection->insert('lieferzeiten_neuer_liefertermin_history', [
                    'id' => $this->uuidBytes(),
                    'position_id' => $positionId,
                    'liefertermin_from' => $positionData['newFrom']->format('Y-m-d H:i:s'),
                    'liefertermin_to' => $positionData['newTo']->format('Y-m-d H:i:s'),
                    'last_changed_by' => 'demo.seeder',
                    'last_changed_at' => $now->format('Y-m-d H:i:s'),
                    'created_at' => $now->format('Y-m-d H:i:s'),
                ]);
                ++$counts['neuerLieferterminHistory'];

                $trackingHistory = $positionData['trackingHistory'] ?? [];
                if ($trackingHistory === [] && ($positionData['trackingNumber'] ?? null) !== null) {
                    $trackingHistory[] = [
                        'sendenummer' => $positionData['trackingNumber'],
                        'carrier' => $dataset['shippingAssignmentType'] === 'eigenversand' ? null : $dataset['shippingAssignmentType'],
                        'isActive' => true,
                    ];
                }

                foreach ($trackingHistory as $historyIndex => $trackingData) {
                    $trackingPayload = [
                        'id' => $this->uuidBytes(),
                        'position_id' => $positionId,
                        'sendenummer' => $trackingData['sendenummer'],
                        'last_changed_by' => 'demo.seeder',
                        'last_changed_at' => $now->modify(sprintf('+%d seconds', $historyIndex + 1))->format('Y-m-d H:i:s'),
                        'created_at' => $now->modify(sprintf('+%d seconds', $historyIndex + 1))->format('Y-m-d H:i:s'),
                    ];

                    if ($this->tableHasColumn('lieferzeiten_sendenummer_history', 'carrier')) {
                        $trackingPayload['carrier'] = $trackingData['carrier'] ?? null;
                    }

                    if ($this->tableHasColumn('lieferzeiten_sendenummer_history', 'is_active')) {
                        $trackingPayload['is_active'] = ($trackingData['isActive'] ?? true) ? 1 : 0;
                    }

                    $this->connection->insert('lieferzeiten_sendenummer_history', $trackingPayload);
                    ++$counts['sendenummerHistory'];
                }
            }

            $this->connection->insert('lieferzeiten_task', [
                'id' => $this->uuidBytes(),
                'status' => $dataset['taskStatus'],
                'assignee' => $dataset['taskAssignee'],
                'due_date' => $dataset['deliveryDate']->format('Y-m-d H:i:s'),
                'initiator' => 'demo.seeder',
                'payload' => json_encode([
                    'externalOrderId' => $dataset['externalOrderId'],
                    'sourceSystem' => $dataset['statusSource'],
                    'taskType' => $dataset['taskType'],
                    'scenarioKey' => $dataset['scenarioKey'],
                ], JSON_THROW_ON_ERROR),
                'closed_at' => $dataset['taskStatus'] === 'closed' ? $now->format('Y-m-d H:i:s') : null,
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['tasks'];

            $this->connection->insert('lieferzeiten_notification_event', [
                'id' => $this->uuidBytes(),
                'event_key' => sprintf('demo:%s:%s', $dataset['externalOrderId'], $dataset['status']),
                'trigger_key' => 'demo_shipping_delay',
                'channel' => 'email',
                'external_order_id' => $dataset['externalOrderId'],
                'source_system' => $dataset['domain'],
                'payload' => json_encode(['message' => 'Demo event', 'externalOrderId' => $dataset['externalOrderId'], 'scenarioKey' => $dataset['scenarioKey']], JSON_THROW_ON_ERROR),
                'status' => 'queued',
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['notificationEvents'];

            $this->connection->insert('lieferzeiten_audit_log', [
                'id' => $this->uuidBytes(),
                'action' => 'demo_data_seeded',
                'target_type' => 'lieferzeiten_paket',
                'target_id' => $dataset['externalOrderId'],
                'source_system' => $dataset['statusSource'],
                'user_id' => 'demo.seeder',
                'correlation_id' => 'demo-seeder',
                'payload' => json_encode(['externalOrderId' => $dataset['externalOrderId'], 'scenarioKey' => $dataset['scenarioKey']], JSON_THROW_ON_ERROR),
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['auditLogs'];
        }

        foreach ([
            ['sales_channel_id' => 'demo_main_storefront', 'default_status' => 'open', 'enable_notifications' => 1, 'shipping_working_days' => 0, 'shipping_cutoff' => '14:00', 'delivery_working_days' => 2, 'delivery_cutoff' => '14:00'],
            ['sales_channel_id' => 'demo_b2b_storefront', 'default_status' => 'closed', 'enable_notifications' => 0, 'shipping_working_days' => 1, 'shipping_cutoff' => '12:00', 'delivery_working_days' => 3, 'delivery_cutoff' => '12:00'],
            ['sales_channel_id' => 'demo_marketplace', 'default_status' => 'open', 'enable_notifications' => 1, 'shipping_working_days' => 0, 'shipping_cutoff' => '16:00', 'delivery_working_days' => 1, 'delivery_cutoff' => '16:00'],
        ] as $channelSetting) {
            $this->connection->insert('lieferzeiten_channel_settings', [
                'id' => $this->uuidBytes(),
                'sales_channel_id' => $channelSetting['sales_channel_id'],
                'default_status' => $channelSetting['default_status'],
                'enable_notifications' => $channelSetting['enable_notifications'],
                'shipping_working_days' => $channelSetting['shipping_working_days'],
                'shipping_cutoff' => $channelSetting['shipping_cutoff'],
                'delivery_working_days' => $channelSetting['delivery_working_days'],
                'delivery_cutoff' => $channelSetting['delivery_cutoff'],
                'last_changed_by' => 'demo.seeder',
                'last_changed_at' => $now->format('Y-m-d H:i:s'),
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['channelSettings'];
        }

        foreach ([
            ['trigger_key' => 'demo_shipping_delay', 'channel' => 'email', 'enabled' => 1],
            ['trigger_key' => 'demo_delivery_delay', 'channel' => 'slack', 'enabled' => 1],
            ['trigger_key' => 'demo_eigenversand_alert', 'channel' => 'email', 'enabled' => 0],
        ] as $toggle) {
            $this->connection->insert('lieferzeiten_notification_toggle', [
                'id' => $this->uuidBytes(),
                'code' => $toggle['trigger_key'] . ':' . $toggle['channel'],
                'trigger_key' => $toggle['trigger_key'],
                'channel' => $toggle['channel'],
                'enabled' => $toggle['enabled'],
                'last_changed_by' => 'demo.seeder',
                'last_changed_at' => $now->format('Y-m-d H:i:s'),
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['notificationToggles'];
        }

        foreach ([
            ['name' => 'demo_rule_shipping_delay', 'trigger_key' => 'demo_shipping_delay', 'status' => 'open', 'priority' => 100],
            ['name' => 'demo_rule_delivery_delay', 'trigger_key' => 'demo_delivery_delay', 'status' => 'open', 'priority' => 90],
            ['name' => 'demo_rule_eigenversand', 'trigger_key' => 'demo_eigenversand_alert', 'status' => 'closed', 'priority' => 80],
        ] as $rule) {
            $this->connection->insert('lieferzeiten_task_assignment_rule', [
                'id' => $this->uuidBytes(),
                'name' => $rule['name'],
                'status' => $rule['status'],
                'trigger_key' => $rule['trigger_key'],
                'assignee_type' => 'team',
                'assignee_identifier' => 'ops-team',
                'priority' => $rule['priority'],
                'active' => 1,
                'conditions' => json_encode(['demo' => true, 'trigger' => $rule['trigger_key']], JSON_THROW_ON_ERROR),
                'last_changed_by' => 'demo.seeder',
                'last_changed_at' => $now->format('Y-m-d H:i:s'),
                'created_at' => $now->format('Y-m-d H:i:s'),
            ]);
            ++$counts['taskAssignmentRules'];
        }

        return $counts;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildOrderDataset(\DateTimeImmutable $base, array $externalOrderIds): array
    {
        $scenarioTemplates = [
            [
                'scenarioKey' => 'multi_position_gesamtversand_reexpedition',
                'domain' => self::DOMAINS[0],
                'status' => 1,
                'shippingType' => 'dhl',
                'orderDateModifier' => '-2 days',
                'taskStatus' => 'open',
                'taskType' => 'status_check',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'businessDays' => 6,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 10,
                        'shippedQuantity' => 7,
                        'splitReference' => 'LINE-A',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-OLD-{suffix}-A', 'carrier' => 'dhl', 'isActive' => false],
                            ['sendenummer' => 'DHL-NEW-{suffix}-A', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                    [
                        'status' => 'open',
                        'orderedQuantity' => 2,
                        'shippedQuantity' => 2,
                        'splitReference' => 'LINE-B',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-B', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'split_position_partial_7_10',
                'domain' => self::DOMAINS[1],
                'status' => 2,
                'shippingType' => 'gls',
                'orderDateModifier' => '-3 days',
                'taskStatus' => 'open',
                'taskType' => 'partial_shipment_followup',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '7/10',
                'businessDays' => 7,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 10,
                        'shippedQuantity' => 7,
                        'splitReference' => 'LINE-C',
                        'trackingHistory' => [
                            ['sendenummer' => 'GLS-{suffix}-PART1', 'carrier' => 'gls', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'split_position_partial_3_10_terminal_pending',
                'domain' => self::DOMAINS[2],
                'status' => 3,
                'shippingType' => 'gls',
                'orderDateModifier' => '-4 days',
                'taskStatus' => 'open',
                'taskType' => 'partial_shipment_complete',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '3/10',
                'terminalDelivery' => false,
                'businessDays' => 8,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 10,
                        'shippedQuantity' => 3,
                        'splitReference' => 'LINE-C',
                        'trackingHistory' => [
                            ['sendenummer' => 'GLS-{suffix}-PART2-OLD', 'carrier' => 'gls', 'isActive' => false],
                            ['sendenummer' => 'GLS-{suffix}-PART2-NEW', 'carrier' => 'gls', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'teillieferung_multicolis_terminal_mix',
                'domain' => self::DOMAINS[0],
                'status' => 4,
                'shippingType' => 'dhl',
                'orderDateModifier' => '-5 days',
                'taskStatus' => 'open',
                'taskType' => 'delivery_terminal_check',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '1/2',
                'terminalDelivery' => false,
                'businessDays' => 9,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 1,
                        'splitReference' => 'COLLI-1',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-C1', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                    [
                        'status' => 'open',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 0,
                        'splitReference' => 'COLLI-2',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-C2', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'gesamtversand_all_terminal_closed',
                'domain' => self::DOMAINS[1],
                'status' => 5,
                'shippingType' => 'dhl',
                'orderDateModifier' => '-6 days',
                'taskStatus' => 'closed',
                'taskType' => 'delivery_terminal_check',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '2/2',
                'terminalDelivery' => true,
                'businessDays' => 9,
                'positions' => [
                    [
                        'status' => 'closed',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 1,
                        'splitReference' => 'COLLI-1',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-DONE1', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                    [
                        'status' => 'closed',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 1,
                        'splitReference' => 'COLLI-2',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-DONE2', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'eigenversand_without_external_tracking',
                'domain' => self::DOMAINS[2],
                'status' => 6,
                'shippingType' => 'eigenversand',
                'orderDateModifier' => '-7 days',
                'taskStatus' => 'open',
                'taskType' => 'eigenversand_manual_followup',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '1/1',
                'terminalDelivery' => false,
                'businessDays' => 10,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 1,
                        'splitReference' => 'EIGEN-1',
                        'trackingHistory' => [],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'vorkasse_without_payment_date',
                'domain' => self::DOMAINS[0],
                'status' => 7,
                'shippingType' => 'gls',
                'orderDateModifier' => '-8 days',
                'taskStatus' => 'open',
                'taskType' => 'payment_date_missing',
                'isTestOrder' => false,
                'paymentDateMode' => 'missing',
                'partialShipmentQuantity' => '1/1',
                'businessDays' => 10,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 1,
                        'splitReference' => 'PAY-0',
                        'trackingHistory' => [
                            ['sendenummer' => 'GLS-{suffix}-PAY0', 'carrier' => 'gls', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'vorkasse_with_payment_date',
                'domain' => self::DOMAINS[1],
                'status' => 8,
                'shippingType' => 'gls',
                'orderDateModifier' => '-9 days',
                'taskStatus' => 'closed',
                'taskType' => 'payment_date_available',
                'isTestOrder' => false,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '1/1',
                'terminalDelivery' => true,
                'businessDays' => 10,
                'positions' => [
                    [
                        'status' => 'closed',
                        'orderedQuantity' => 1,
                        'shippedQuantity' => 1,
                        'splitReference' => 'PAY-1',
                        'trackingHistory' => [
                            ['sendenummer' => 'GLS-{suffix}-PAY1', 'carrier' => 'gls', 'isActive' => true],
                        ],
                    ],
                ],
            ],
            [
                'scenarioKey' => 'test_order_multi_position',
                'domain' => self::DOMAINS[2],
                'status' => 8,
                'shippingType' => 'dhl',
                'orderDateModifier' => '-1 day',
                'taskStatus' => 'open',
                'taskType' => 'status_check',
                'isTestOrder' => true,
                'paymentDateMode' => 'set',
                'partialShipmentQuantity' => '2/2',
                'terminalDelivery' => false,
                'businessDays' => 5,
                'positions' => [
                    [
                        'status' => 'open',
                        'orderedQuantity' => 3,
                        'shippedQuantity' => 1,
                        'splitReference' => 'TEST-1',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-T1', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                    [
                        'status' => 'open',
                        'orderedQuantity' => 2,
                        'shippedQuantity' => 1,
                        'splitReference' => 'TEST-2',
                        'trackingHistory' => [
                            ['sendenummer' => 'DHL-{suffix}-T2', 'carrier' => 'dhl', 'isActive' => true],
                        ],
                    ],
                ],
            ],
        ];

        $datasets = [];
        $max = min(count($scenarioTemplates), count($externalOrderIds));

        for ($index = 0; $index < $max; $index += 1) {
            $datasets[] = $this->buildOrder(
                $externalOrderIds[$index],
                sprintf('%04d', $index + 1),
                $base->modify($scenarioTemplates[$index]['orderDateModifier']),
                $scenarioTemplates[$index],
            );
        }

        return $datasets;
    }

    /**
     * @param array<string, mixed> $scenario
     * @return array<string, mixed>
     */
    private function buildOrder(
        string $externalOrderId,
        string $rowSuffix,
        \DateTimeImmutable $orderDate,
        array $scenario,
    ): array {
        $isTerminalDelivery = (bool) ($scenario['terminalDelivery'] ?? false);
        $shippingDate = $orderDate->modify('+2 days');
        $deliveryDate = $isTerminalDelivery ? $orderDate->modify('+5 days') : $orderDate->modify('+6 days');

        $positions = [];
        foreach ($scenario['positions'] as $index => $positionTemplate) {
            $supplierFrom = $orderDate->modify(sprintf('+%d days', $index + 1));
            $supplierTo = $supplierFrom->modify('+2 days');
            $splitReference = $positionTemplate['splitReference'] ?? ('SPLIT-' . ($index + 1));

            $trackingHistory = [];
            foreach (($positionTemplate['trackingHistory'] ?? []) as $trackingTemplate) {
                $trackingNumber = str_replace('{suffix}', $rowSuffix, (string) $trackingTemplate['sendenummer']);
                $trackingHistory[] = [
                    'sendenummer' => $trackingNumber,
                    'carrier' => $trackingTemplate['carrier'] ?? null,
                    'isActive' => (bool) ($trackingTemplate['isActive'] ?? true),
                ];
            }

            $positions[] = [
                'status' => $positionTemplate['status'],
                'positionNumber' => sprintf('%s-%s-%02d', $externalOrderId, $splitReference, $index + 1),
                'articleNumber' => sprintf('SKU-%s-%s-%02d', $scenario['status'], $rowSuffix, $index + 1),
                'orderedQuantity' => (int) ($positionTemplate['orderedQuantity'] ?? 1),
                'shippedQuantity' => (int) ($positionTemplate['shippedQuantity'] ?? 0),
                'supplierFrom' => $supplierFrom,
                'supplierTo' => $supplierTo,
                'newFrom' => $supplierFrom->modify('+1 day'),
                'newTo' => $supplierTo->modify('+1 day'),
                'trackingHistory' => $trackingHistory,
            ];
        }

        $paymentDateMode = (string) ($scenario['paymentDateMode'] ?? 'set');
        $paymentDate = $paymentDateMode === 'missing' ? null : $orderDate->modify('-1 day');

        return [
            'externalOrderId' => $externalOrderId,
            'scenarioKey' => $scenario['scenarioKey'],
            'paketNumber' => 'SAN6-' . $rowSuffix,
            'domain' => $scenario['domain'],
            'status' => (string) $scenario['status'],
            'shippingAssignmentType' => $scenario['shippingType'],
            'partialShipmentQuantity' => $scenario['partialShipmentQuantity'] ?? sprintf('%d/%d', count($positions), count($positions)),
            'orderDate' => $orderDate,
            'shippingDate' => $shippingDate,
            'deliveryDate' => $deliveryDate,
            'businessFrom' => $orderDate,
            'businessTo' => $orderDate->modify(sprintf('+%d days', (int) ($scenario['businessDays'] ?? 6))),
            'paymentDate' => $paymentDate,
            'calculatedDeliveryDate' => $deliveryDate,
            'isTestOrder' => (bool) ($scenario['isTestOrder'] ?? false),
            'taskStatus' => $scenario['taskStatus'],
            'taskAssignee' => $scenario['taskStatus'] === 'closed' ? 'qa-team' : 'ops-team',
            'taskType' => $scenario['taskType'],
            'positions' => $positions,
        ];
    }

    private function tableHasColumn(string $table, string $column): bool
    {
        if (!isset($this->tableColumnCache[$table])) {
            $columns = [];
            foreach ($this->connection->createSchemaManager()->listTableColumns($table) as $name => $_definition) {
                $columns[strtolower((string) $name)] = true;
            }

            $this->tableColumnCache[$table] = $columns;
        }

        return $this->tableColumnCache[$table][strtolower($column)] ?? false;
    }

    private function uuidBytes(): string
    {
        return hex2bin(Uuid::randomHex()) ?: random_bytes(16);
    }
}
