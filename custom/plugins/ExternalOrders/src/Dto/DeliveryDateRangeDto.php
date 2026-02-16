<?php declare(strict_types=1);

namespace ExternalOrders\Dto;

final class DeliveryDateRangeDto
{
    public function __construct(
        public readonly ?string $from,
        public readonly ?string $to,
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public static function fromArray(array $payload): self
    {
        $from = self::normalizeDate($payload['from'] ?? null);
        $to = self::normalizeDate($payload['to'] ?? null);

        return new self($from, $to);
    }

    /**
     * @return array{from:?string,to:?string}
     */
    public function toArray(): array
    {
        return [
            'from' => $this->from,
            'to' => $this->to,
        ];
    }

    private static function normalizeDate(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        if ($value === '') {
            return null;
        }

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 ? $value : null;
    }
}

