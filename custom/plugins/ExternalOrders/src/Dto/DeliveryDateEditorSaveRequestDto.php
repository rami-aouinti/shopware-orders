<?php declare(strict_types=1);

namespace ExternalOrders\Dto;

final class DeliveryDateEditorSaveRequestDto
{
    public function __construct(
        public readonly string $orderId,
        public readonly string $positionId,
        public readonly DeliveryDateRangeDto $supplierDeliveryDateRange,
        public readonly DeliveryDateRangeDto $newDeliveryDateRange,
        public readonly ?string $changedByUser,
    ) {
    }

    /**
     * @param array<string,mixed> $payload
     */
    public static function fromArray(array $payload): self
    {
        return new self(
            trim((string) ($payload['orderId'] ?? '')),
            trim((string) ($payload['positionId'] ?? '')),
            DeliveryDateRangeDto::fromArray(is_array($payload['supplierDeliveryDateRange'] ?? null) ? $payload['supplierDeliveryDateRange'] : []),
            DeliveryDateRangeDto::fromArray(is_array($payload['newDeliveryDateRange'] ?? null) ? $payload['newDeliveryDateRange'] : []),
            self::normalizeString($payload['changedByUser'] ?? null),
        );
    }

    private static function normalizeString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value !== '' ? $value : null;
    }
}
