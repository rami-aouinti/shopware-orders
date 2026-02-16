<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

final class OrderStatusModel
{
    /**
     * @return array<int, array{code:int,label:string,readSources:list<string>,writeBackTargets:list<string>,syncMode:string}>
     */
    public static function definitions(): array
    {
        return [
            1 => [
                'code' => 1,
                'label' => 'New',
                'readSources' => ['shopware', 'gambio'],
                'writeBackTargets' => [],
                'syncMode' => 'read_only',
            ],
            2 => [
                'code' => 2,
                'label' => 'In clarification',
                'readSources' => ['shopware', 'gambio'],
                'writeBackTargets' => [],
                'syncMode' => 'read_only',
            ],
            3 => [
                'code' => 3,
                'label' => 'Awaiting supplier',
                'readSources' => ['shopware', 'gambio', 'san6'],
                'writeBackTargets' => [],
                'syncMode' => 'read_only',
            ],
            4 => [
                'code' => 4,
                'label' => 'Partially available',
                'readSources' => ['shopware', 'gambio', 'san6'],
                'writeBackTargets' => [],
                'syncMode' => 'read_only',
            ],
            5 => [
                'code' => 5,
                'label' => 'Ready for shipping',
                'readSources' => ['shopware', 'gambio', 'san6'],
                'writeBackTargets' => [],
                'syncMode' => 'read_only',
            ],
            6 => [
                'code' => 6,
                'label' => 'Partially shipped',
                'readSources' => ['shopware', 'gambio', 'san6', 'tracking'],
                'writeBackTargets' => [],
                'syncMode' => 'read_only',
            ],
            7 => [
                'code' => 7,
                'label' => 'Shipped',
                'readSources' => ['shopware', 'gambio', 'san6', 'tracking'],
                'writeBackTargets' => ['shopware', 'gambio'],
                'syncMode' => 'bidirectional',
            ],
            8 => [
                'code' => 8,
                'label' => 'Closed',
                'readSources' => ['shopware', 'gambio', 'san6', 'tracking'],
                'writeBackTargets' => ['shopware', 'gambio'],
                'syncMode' => 'bidirectional',
            ],
        ];
    }

    public static function canWriteBack(int $status): bool
    {
        $definition = self::definitions()[$status] ?? null;

        return is_array($definition) && ($definition['writeBackTargets'] ?? []) !== [];
    }

    public static function isFinalDeliveredParcelState(string $state): bool
    {
        return in_array($state, [
            'delivered',
            'zugestellt',
            'ablageort',
            'paketshop_retire',
            'paketshop_collected',
            'completed',
            '8',
        ], true);
    }

    public static function isBlockingParcelState(string $state): bool
    {
        return in_array($state, [
            'paketshop_non_retire',
            'paketshop_not_collected',
            'retoure',
            'refus',
            'verweigert',
            'douane',
            'zoll_abgelehnt',
            'nicht_zustellbar',
        ], true);
    }
}
