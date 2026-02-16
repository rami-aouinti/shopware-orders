<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

final class OrderStatusModel
{
    private const FINAL_STATES = [
        'delivered',
        'zugestellt',
        'ablageort',
        'paketshop_retire',
        'paketshop_collected',
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
     * @return array<int, array{code:int,label:string,readSources:list<string>,writeBackTargets:list<string>,syncMode:string,matrixRule:string}>
     */
    public static function definitions(): array
    {
        return TicketStatusRuleMatrixPolicy::definitions();
    }

    public static function canWriteBack(int $status): bool
    {
        return TicketStatusRuleMatrixPolicy::canWriteBack($status);
    }

    public static function isFinalDeliveredParcelState(string $state): bool
    {
        return in_array($state, self::FINAL_STATES, true);
    }

    public static function isBlockingParcelState(string $state): bool
    {
        return in_array($state, self::BLOCKING_STATES, true);
    }
}
