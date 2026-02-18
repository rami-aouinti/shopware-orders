<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

final class TestOrderExclusion
{
    public const PAKET_ALIAS = 'p';

    public static function sqlCondition(string $paketAlias = self::PAKET_ALIAS): string
    {
        return sprintf('COALESCE(%s.is_test_order, 0) = 0', $paketAlias);
    }

    /** @param array<string,mixed> $payload */
    public static function payloadContainsTestMarker(array $payload): bool
    {
        $candidates = [
            $payload['Testbestellung'] ?? null,
            $payload['testbestellung'] ?? null,
            $payload['isTestOrder'] ?? null,
            $payload['testOrder'] ?? null,
            $payload['test_order'] ?? null,
            $payload['isTest'] ?? null,
            $payload['is_test_order'] ?? null,
            $payload['external_order_is_test_order'] ?? null,
        ];

        $additional = $payload['additional'] ?? null;
        if (is_array($additional)) {
            $candidates[] = $additional['Testbestellung'] ?? null;
            $candidates[] = $additional['testbestellung'] ?? null;
            $candidates[] = $additional['isTestOrder'] ?? null;
            $candidates[] = $additional['is_test_order'] ?? null;
            $candidates[] = $additional['external_order_is_test_order'] ?? null;
        }

        $detail = $payload['detail'] ?? null;
        if (is_array($detail)) {
            $detailAdditional = $detail['additional'] ?? null;
            if (is_array($detailAdditional)) {
                $candidates[] = $detailAdditional['Testbestellung'] ?? null;
                $candidates[] = $detailAdditional['testbestellung'] ?? null;
                $candidates[] = $detailAdditional['isTestOrder'] ?? null;
                $candidates[] = $detailAdditional['is_test_order'] ?? null;
                $candidates[] = $detailAdditional['external_order_is_test_order'] ?? null;
            }
        }

        foreach ($candidates as $candidate) {
            if (self::toBool($candidate)) {
                return true;
            }
        }

        return false;
    }

    public static function toBool(mixed $value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (int) $value === 1;
        }

        if (!is_string($value)) {
            return false;
        }

        return in_array(mb_strtolower(trim($value)), ['1', 'true', 'yes', 'ja', 'y', 'x'], true);
    }
}
