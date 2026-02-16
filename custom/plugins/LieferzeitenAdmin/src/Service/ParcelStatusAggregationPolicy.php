<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

/**
 * Regelwerk für Tracking-abhängige Abschlusslogik (Status 8).
 *
 * Sonderfälle:
 * - Paketshop zugestellt: NICHT abgeschlossen (wartet auf Abholung)
 * - Paketshop abgeholt: abgeschlossen
 * - Ablageort: abgeschlossen
 * - verweigert / Zoll abgelehnt / Retoure: blockierend (nicht abgeschlossen)
 */
final class ParcelStatusAggregationPolicy
{
    private const FINAL_STATES = [
        'delivered',
        'zugestellt',
        'ablageort',
        'paketshop_collected',
        'paketshop_retire',
        'paketshop_abgeholt',
        'completed',
        '8',
    ];

    private const BLOCKING_STATES = [
        'paketshop_non_retire',
        'paketshop_not_collected',
        'paketshop_zugestellt',
        'retoure',
        'refus',
        'verweigert',
        'douane',
        'zoll_abgelehnt',
        'nicht_zustellbar',
    ];

    /**
     * @param array<int,array<string,mixed>> $parcels
     * @param array<string,mixed> $order
     */
    public function areAllParcelsCompleted(array $parcels, array $order, Status8TrackingMappingProvider $mappingProvider): bool
    {
        if ($parcels === []) {
            return false;
        }

        $completed = 0;
        foreach ($parcels as $parcel) {
            if (!is_array($parcel)) {
                continue;
            }

            if ($this->isBlockingState($parcel)) {
                return false;
            }

            if (!$this->isFinalState($parcel, $order, $mappingProvider)) {
                return false;
            }

            ++$completed;
        }

        return $completed > 0 && $completed === count($parcels);
    }

    /** @param array<string,mixed> $parcel */
    public function isBlockingState(array $parcel): bool
    {
        return in_array($this->normalizeState($parcel), self::BLOCKING_STATES, true);
    }

    /**
     * @param array<string,mixed> $parcel
     * @param array<string,mixed> $order
     */
    public function isFinalState(array $parcel, array $order, Status8TrackingMappingProvider $mappingProvider): bool
    {
        $mapped = $mappingProvider->isClosed($parcel, $order);
        if ($mapped !== null) {
            return $mapped;
        }

        $closed = $parcel['closed'] ?? null;
        if ($closed !== null) {
            return (bool) $closed;
        }

        return in_array($this->normalizeState($parcel), self::FINAL_STATES, true);
    }

    /** @param array<string,mixed> $parcel */
    public function normalizeState(array $parcel): string
    {
        $rawState = (string) ($parcel['trackingStatus'] ?? $parcel['san6Status'] ?? $parcel['status'] ?? $parcel['state'] ?? '');
        $state = mb_strtolower(trim($rawState));
        $state = str_replace([' ', '-', '/'], '_', $state);

        return match ($state) {
            'paketshop_delivered', 'parcelshop_delivered' => 'paketshop_zugestellt',
            'paketshop_picked_up', 'parcelshop_collected' => 'paketshop_collected',
            default => $state,
        };
    }
}

