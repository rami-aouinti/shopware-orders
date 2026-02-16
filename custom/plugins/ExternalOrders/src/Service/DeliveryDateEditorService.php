<?php declare(strict_types=1);

namespace ExternalOrders\Service;

use Doctrine\DBAL\Connection;
use ExternalOrders\Dto\DeliveryDateEditorSaveRequestDto;
use ExternalOrders\Dto\DeliveryDateValidationErrorDto;
use Shopware\Core\Framework\Uuid\Uuid;

class DeliveryDateEditorService
{
    private const FIELD_SUPPLIER = 'supplierDeliveryDateRange';
    private const FIELD_NEW = 'newDeliveryDateRange';

    public function __construct(
        private readonly Connection $connection,
    ) {
    }

    /**
     * @return array{orderId:string,positionId:string,supplierDeliveryDateRange:array{from:?string,to:?string,calendarWeek:?string},newDeliveryDateRange:array{from:?string,to:?string,calendarWeek:?string},canSave:bool,errors:array<int,array{field:string,message:string,code:string}>,history:array<string,array<int,array<string,mixed>>>}
     */
    public function getEditorState(string $orderId, string $positionId): array
    {
        $state = $this->findState($orderId, $positionId);

        $fallback = $state === null ? $this->extractRangesFromOrderPayload($orderId, $positionId) : [
            'supplier' => ['from' => null, 'to' => null],
            'new' => ['from' => null, 'to' => null],
        ];

        $supplierRange = [
            'from' => $state['supplier_from'] ?? $fallback['supplier']['from'] ?? null,
            'to' => $state['supplier_to'] ?? $fallback['supplier']['to'] ?? null,
        ];
        $newRange = [
            'from' => $state['new_from'] ?? $fallback['new']['from'] ?? null,
            'to' => $state['new_to'] ?? $fallback['new']['to'] ?? null,
        ];

        $errors = $this->validateRanges($supplierRange, $newRange);

        return [
            'orderId' => $orderId,
            'positionId' => $positionId,
            'supplierDeliveryDateRange' => [
                ...$supplierRange,
                'calendarWeek' => $this->buildCalendarWeekLabel($supplierRange['from'], $supplierRange['to']),
            ],
            'newDeliveryDateRange' => [
                ...$newRange,
                'calendarWeek' => $this->buildCalendarWeekLabel($newRange['from'], $newRange['to']),
            ],
            'canSave' => $errors === [],
            'errors' => array_map(static fn (DeliveryDateValidationErrorDto $error): array => $error->toArray(), $errors),
            'history' => $this->fetchHistory($orderId, $positionId),
        ];
    }

    /**
     * @return array{saved:bool,canSave:bool,errors:array<int,array{field:string,message:string,code:string}>,state:array<string,mixed>}
     */
    public function saveEditorState(DeliveryDateEditorSaveRequestDto $request): array
    {
        $errors = $this->validateRanges(
            $request->supplierDeliveryDateRange->toArray(),
            $request->newDeliveryDateRange->toArray(),
        );

        $validationRows = array_map(static fn (DeliveryDateValidationErrorDto $error): array => $error->toArray(), $errors);

        if ($request->orderId === '' || !Uuid::isValid($request->orderId) || $request->positionId === '') {
            $validationRows[] = (new DeliveryDateValidationErrorDto('orderId', 'orderId oder positionId ist ungültig.', 'invalid_identifiers'))->toArray();
            return [
                'saved' => false,
                'canSave' => false,
                'errors' => $validationRows,
                'state' => [],
            ];
        }

        if ($errors !== []) {
            $this->storeValidationErrors($request->orderId, $request->positionId, $validationRows);

            return [
                'saved' => false,
                'canSave' => false,
                'errors' => $validationRows,
                'state' => $this->getEditorState($request->orderId, $request->positionId),
            ];
        }

        $existing = $this->findState($request->orderId, $request->positionId);
        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s.v');

        $supplierFrom = $request->supplierDeliveryDateRange->from;
        $supplierTo = $request->supplierDeliveryDateRange->to;
        $newFrom = $request->newDeliveryDateRange->from;
        $newTo = $request->newDeliveryDateRange->to;

        if ($existing === null) {
            $this->connection->insert('external_order_delivery_date_state', [
                'id' => Uuid::randomBytes(),
                'order_id' => Uuid::fromHexToBytes($request->orderId),
                'position_id' => $request->positionId,
                'supplier_from' => $supplierFrom,
                'supplier_to' => $supplierTo,
                'new_from' => $newFrom,
                'new_to' => $newTo,
                'last_validation_errors' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            $this->connection->update('external_order_delivery_date_state', [
                'supplier_from' => $supplierFrom,
                'supplier_to' => $supplierTo,
                'new_from' => $newFrom,
                'new_to' => $newTo,
                'last_validation_errors' => null,
                'updated_at' => $now,
            ], ['id' => hex2bin((string) $existing['id'])]);
        }

        $this->insertHistoryIfChanged($request->orderId, $request->positionId, self::FIELD_SUPPLIER, $existing['supplier_from'] ?? null, $existing['supplier_to'] ?? null, $supplierFrom, $supplierTo, $request->changedByUser, $now);
        $this->insertHistoryIfChanged($request->orderId, $request->positionId, self::FIELD_NEW, $existing['new_from'] ?? null, $existing['new_to'] ?? null, $newFrom, $newTo, $request->changedByUser, $now);

        return [
            'saved' => true,
            'canSave' => true,
            'errors' => [],
            'state' => $this->getEditorState($request->orderId, $request->positionId),
        ];
    }

    /**
     * @param array{from:?string,to:?string} $supplierRange
     * @param array{from:?string,to:?string} $newRange
     * @return array<int,DeliveryDateValidationErrorDto>
     */
    private function validateRanges(array $supplierRange, array $newRange): array
    {
        $errors = [];

        $supplierHasAny = $supplierRange['from'] !== null || $supplierRange['to'] !== null;
        $supplierComplete = $supplierRange['from'] !== null && $supplierRange['to'] !== null;
        $newHasAny = $newRange['from'] !== null || $newRange['to'] !== null;
        $newComplete = $newRange['from'] !== null && $newRange['to'] !== null;

        if ($supplierHasAny && !$supplierComplete) {
            $errors[] = new DeliveryDateValidationErrorDto(self::FIELD_SUPPLIER, 'Liefertermin Lieferant benötigt Von- und Bis-Datum.', 'range_incomplete');
        }

        if ($newHasAny && !$newComplete) {
            $errors[] = new DeliveryDateValidationErrorDto(self::FIELD_NEW, 'Neuer Liefertermin benötigt Von- und Bis-Datum.', 'range_incomplete');
        }

        if ($supplierComplete) {
            $errors = [...$errors, ...$this->validateMinMaxDays(self::FIELD_SUPPLIER, $supplierRange['from'], $supplierRange['to'], 1, 14)];
        }

        if ($newComplete) {
            $errors = [...$errors, ...$this->validateMinMaxDays(self::FIELD_NEW, $newRange['from'], $newRange['to'], 1, 4)];
        }

        if ($newComplete && !$supplierComplete) {
            $errors[] = new DeliveryDateValidationErrorDto(self::FIELD_SUPPLIER, 'Speichern nur erlaubt, wenn Liefertermin Lieferant vorhanden ist.', 'supplier_missing');
        }

        if ($supplierComplete && !$newComplete) {
            $errors[] = new DeliveryDateValidationErrorDto(self::FIELD_NEW, 'Speichern nur erlaubt, wenn Neuer Liefertermin gesetzt ist.', 'new_delivery_missing');
        }

        return $errors;
    }

    /**
     * @return array<int,DeliveryDateValidationErrorDto>
     */
    private function validateMinMaxDays(string $field, string $from, string $to, int $minDays, int $maxDays): array
    {
        try {
            $fromDate = new \DateTimeImmutable($from);
            $toDate = new \DateTimeImmutable($to);
        } catch (\Throwable) {
            return [new DeliveryDateValidationErrorDto($field, 'Ungültiges Datumsformat.', 'invalid_date')];
        }

        $diff = (int) $fromDate->diff($toDate)->format('%r%a') + 1;
        if ($diff < $minDays || $diff > $maxDays) {
            return [new DeliveryDateValidationErrorDto(
                $field,
                sprintf('Der Zeitraum muss zwischen %d und %d Tagen liegen.', $minDays, $maxDays),
                'range_days_out_of_bounds'
            )];
        }

        return [];
    }

    private function buildCalendarWeekLabel(?string $from, ?string $to): ?string
    {
        if ($from === null || $to === null) {
            return null;
        }

        try {
            $fromDate = new \DateTimeImmutable($from);
            $toDate = new \DateTimeImmutable($to);
        } catch (\Throwable) {
            return null;
        }

        $fromLabel = sprintf('KW %s/%s', $fromDate->format('W'), $fromDate->format('o'));
        $toLabel = sprintf('KW %s/%s', $toDate->format('W'), $toDate->format('o'));

        return $fromLabel === $toLabel ? $fromLabel : sprintf('%s - %s', $fromLabel, $toLabel);
    }


    /**
     * @return array{supplier:array{from:?string,to:?string},new:array{from:?string,to:?string}}
     */
    private function extractRangesFromOrderPayload(string $orderId, string $positionId): array
    {
        if (!Uuid::isValid($orderId) || $positionId === '') {
            return [
                'supplier' => ['from' => null, 'to' => null],
                'new' => ['from' => null, 'to' => null],
            ];
        }

        $row = $this->connection->fetchAssociative(
            'SELECT raw_payload FROM external_order_data WHERE order_id = :orderId LIMIT 1',
            ['orderId' => Uuid::fromHexToBytes($orderId)]
        );

        if (!is_array($row)) {
            return [
                'supplier' => ['from' => null, 'to' => null],
                'new' => ['from' => null, 'to' => null],
            ];
        }

        $payload = json_decode((string) ($row['raw_payload'] ?? '{}'), true);
        $payload = is_array($payload) ? $payload : [];

        $supplier = $this->normalizeRangeValue($payload['lieferterminLieferant'] ?? $payload['supplierDeliveryDate'] ?? null);
        $new = $this->normalizeRangeValue($payload['lieferterminAuftragsbearbeitung'] ?? $payload['neuerLiefertermin'] ?? $payload['newDeliveryDate'] ?? null);

        $detailItems = $payload['detail']['items'] ?? null;
        if (is_array($detailItems)) {
            foreach ($detailItems as $item) {
                if (!is_array($item)) {
                    continue;
                }

                $itemPositionId = trim((string) ($item['positionId'] ?? $item['id'] ?? $item['lineItemId'] ?? ''));
                if ($itemPositionId !== $positionId) {
                    continue;
                }

                $supplier = $this->normalizeRangeValue($item['lieferterminLieferant'] ?? $supplier['from']);
                $new = $this->normalizeRangeValue($item['lieferterminAuftragsbearbeitung'] ?? $item['neuerLiefertermin'] ?? $new['from']);
                break;
            }
        }

        return [
            'supplier' => $supplier,
            'new' => $new,
        ];
    }

    /**
     * @return array{from:?string,to:?string}
     */
    private function normalizeRangeValue(mixed $value): array
    {
        if (!is_string($value)) {
            return ['from' => null, 'to' => null];
        }

        $value = trim($value);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return ['from' => null, 'to' => null];
        }

        return ['from' => $value, 'to' => $value];
    }

    private function findState(string $orderId, string $positionId): ?array
    {
        if (!Uuid::isValid($orderId) || $positionId === '') {
            return null;
        }

        $row = $this->connection->fetchAssociative(
            'SELECT LOWER(HEX(id)) as id, supplier_from, supplier_to, new_from, new_to
             FROM external_order_delivery_date_state
             WHERE order_id = :orderId AND position_id = :positionId
             LIMIT 1',
            [
                'orderId' => Uuid::fromHexToBytes($orderId),
                'positionId' => $positionId,
            ]
        );

        return is_array($row) ? $row : null;
    }

    /**
     * @return array<string,array<int,array<string,mixed>>>
     */
    private function fetchHistory(string $orderId, string $positionId): array
    {
        if (!Uuid::isValid($orderId) || $positionId === '') {
            return [self::FIELD_SUPPLIER => [], self::FIELD_NEW => []];
        }

        $rows = $this->connection->fetchAllAssociative(
            'SELECT field_name, previous_from, previous_to, next_from, next_to, changed_by_user, created_at
             FROM external_order_delivery_date_history
             WHERE order_id = :orderId AND position_id = :positionId
             ORDER BY created_at DESC',
            [
                'orderId' => Uuid::fromHexToBytes($orderId),
                'positionId' => $positionId,
            ]
        );

        $history = [self::FIELD_SUPPLIER => [], self::FIELD_NEW => []];

        foreach ($rows as $row) {
            $field = (string) ($row['field_name'] ?? '');
            if (!isset($history[$field])) {
                continue;
            }

            $history[$field][] = [
                'from' => [
                    'from' => $row['previous_from'] ?? null,
                    'to' => $row['previous_to'] ?? null,
                    'calendarWeek' => $this->buildCalendarWeekLabel($row['previous_from'] ?? null, $row['previous_to'] ?? null),
                ],
                'to' => [
                    'from' => $row['next_from'] ?? null,
                    'to' => $row['next_to'] ?? null,
                    'calendarWeek' => $this->buildCalendarWeekLabel($row['next_from'] ?? null, $row['next_to'] ?? null),
                ],
                'changedByUser' => $row['changed_by_user'] ?? null,
                'changedAt' => $row['created_at'] ?? null,
            ];
        }

        return $history;
    }

    /**
     * @param array<int,array{field:string,message:string,code:string}> $errors
     */
    private function storeValidationErrors(string $orderId, string $positionId, array $errors): void
    {
        if (!Uuid::isValid($orderId) || $positionId === '') {
            return;
        }

        $now = (new \DateTimeImmutable())->format('Y-m-d H:i:s.v');
        $existing = $this->findState($orderId, $positionId);

        if ($existing === null) {
            $this->connection->insert('external_order_delivery_date_state', [
                'id' => Uuid::randomBytes(),
                'order_id' => Uuid::fromHexToBytes($orderId),
                'position_id' => $positionId,
                'supplier_from' => null,
                'supplier_to' => null,
                'new_from' => null,
                'new_to' => null,
                'last_validation_errors' => json_encode($errors, JSON_THROW_ON_ERROR),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            return;
        }

        $this->connection->update('external_order_delivery_date_state', [
            'last_validation_errors' => json_encode($errors, JSON_THROW_ON_ERROR),
            'updated_at' => $now,
        ], ['id' => hex2bin((string) $existing['id'])]);
    }

    private function insertHistoryIfChanged(
        string $orderId,
        string $positionId,
        string $field,
        ?string $previousFrom,
        ?string $previousTo,
        ?string $nextFrom,
        ?string $nextTo,
        ?string $changedByUser,
        string $createdAt
    ): void {
        if ($previousFrom === $nextFrom && $previousTo === $nextTo) {
            return;
        }

        $this->connection->insert('external_order_delivery_date_history', [
            'id' => Uuid::randomBytes(),
            'order_id' => Uuid::fromHexToBytes($orderId),
            'position_id' => $positionId,
            'field_name' => $field,
            'previous_from' => $previousFrom,
            'previous_to' => $previousTo,
            'next_from' => $nextFrom,
            'next_to' => $nextTo,
            'changed_by_user' => $changedByUser,
            'created_at' => $createdAt,
        ]);
    }
}
