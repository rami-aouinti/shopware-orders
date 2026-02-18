<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

/**
 * Explizite Regelmatrix für die 8 Ticket-Status.
 *
 * matrixRule beschreibt die fachliche Herkunft der Statusentscheidung:
 * - source_read_only: reiner Lesestatus aus Shopware/Gambio
 * - san6_shipping_gate: SAN6-Versandfreigabe steuert Status 7
 * - tracking_completion_gate: Tracking steuert Status 8, fallback auf SAN6 ohne Tracking
 *
 * @phpstan-type StatusRule array{
 *     code:int,
 *     label:string,
 *     readSources:list<string>,
 *     writeBackTargets:list<string>,
 *     syncMode:string,
 *     matrixRule:string
 * }
 */
final class TicketStatusRuleMatrixPolicy
{
    /** @var array<int, StatusRule> */
    private const MATRIX = [
        1 => [
            'code' => 1,
            'label' => 'Neu',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        2 => [
            'code' => 2,
            'label' => 'In Klärung',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        3 => [
            'code' => 3,
            'label' => 'Warten auf Lieferanten',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        4 => [
            'code' => 4,
            'label' => 'Teilweise verfügbar',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        5 => [
            'code' => 5,
            'label' => 'Versandbereit',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        6 => [
            'code' => 6,
            'label' => 'Teilversendet',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        7 => [
            'code' => 7,
            'label' => 'Versendet',
            'readSources' => ['san6'],
            'writeBackTargets' => ['shopware', 'gambio'],
            'syncMode' => 'bidirectional',
            'matrixRule' => 'san6_shipping_gate',
        ],
        8 => [
            'code' => 8,
            'label' => 'Bestellung abgeschlossen',
            'readSources' => ['tracking', 'san6'],
            'writeBackTargets' => ['shopware', 'gambio'],
            'syncMode' => 'bidirectional',
            'matrixRule' => 'tracking_completion_gate',
        ],
    ];

    /** @return array<int, StatusRule> */
    public static function definitions(): array
    {
        return self::MATRIX;
    }

    public static function canWriteBack(int $status): bool
    {
        $definition = self::MATRIX[$status] ?? null;

        return is_array($definition) && ($definition['writeBackTargets'] ?? []) !== [];
    }
}
