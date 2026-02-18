<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

/**
 * Explizite Regelmatrix für die 8 Ticket-Status.
 *
 * matrixRule beschreibt die fachliche Herkunft der Statusentscheidung:
 * - source_read_only: reiner Lesestatus aus Shopware/Gambio
 * - san6_shipping_gate: SAN6-Versandfreigabe steuert Status 7
 * - tracking_completion_gate: Tracking + Sonderfälle steuern Status 8
 *
 * @phpstan-type StatusRule array{
 *     code:int,
 *     label:string,
 *     primarySource:string,
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
            'primarySource' => 'shopware',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        2 => [
            'code' => 2,
            'label' => 'In Klärung',
            'primarySource' => 'gambio',
            'readSources' => ['shopware', 'gambio'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        3 => [
            'code' => 3,
            'label' => 'Warten auf Lieferanten',
            'primarySource' => 'san6',
            'readSources' => ['shopware', 'gambio', 'san6'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        4 => [
            'code' => 4,
            'label' => 'Teilweise verfügbar',
            'primarySource' => 'san6',
            'readSources' => ['shopware', 'gambio', 'san6'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        5 => [
            'code' => 5,
            'label' => 'Versandbereit',
            'primarySource' => 'san6',
            'readSources' => ['shopware', 'gambio', 'san6'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        6 => [
            'code' => 6,
            'label' => 'Teilversendet',
            'primarySource' => 'tracking',
            'readSources' => ['shopware', 'gambio', 'san6', 'tracking'],
            'writeBackTargets' => [],
            'syncMode' => 'read_only',
            'matrixRule' => 'source_read_only',
        ],
        7 => [
            'code' => 7,
            'label' => 'Versendet',
            'primarySource' => 'san6',
            'readSources' => ['shopware', 'gambio', 'san6', 'tracking'],
            'writeBackTargets' => ['shopware', 'gambio'],
            'syncMode' => 'bidirectional',
            'matrixRule' => 'san6_shipping_gate',
        ],
        8 => [
            'code' => 8,
            'label' => 'Abgeschlossen',
            'primarySource' => 'tracking',
            'readSources' => ['shopware', 'gambio', 'san6', 'tracking'],
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
