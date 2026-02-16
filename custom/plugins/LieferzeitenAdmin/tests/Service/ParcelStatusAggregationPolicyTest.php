<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Service;

use LieferzeitenAdmin\Service\ParcelStatusAggregationPolicy;
use LieferzeitenAdmin\Service\Status8TrackingMappingProvider;
use PHPUnit\Framework\TestCase;
use Shopware\Core\System\SystemConfig\SystemConfigService;

class ParcelStatusAggregationPolicyTest extends TestCase
{
    /** @dataProvider provideSpecialParcelStates */
    public function testSpecialParcelStateClassification(string $state, bool $expectedFinal, bool $expectedBlocking): void
    {
        $policy = new ParcelStatusAggregationPolicy();
        $mapping = $this->createMappingProvider();

        static::assertSame($expectedFinal, $policy->isFinalState(['trackingStatus' => $state], [], $mapping));
        static::assertSame($expectedBlocking, $policy->isBlockingState(['trackingStatus' => $state]));
    }

    /**
     * @return iterable<string,array{0:string,1:bool,2:bool}>
     */
    public static function provideSpecialParcelStates(): iterable
    {
        yield 'paketshop zugestellt is waiting state' => ['paketshop_zugestellt', false, true];
        yield 'paketshop abgeholt is final' => ['paketshop_abgeholt', true, false];
        yield 'ablageort is final' => ['ablageort', true, false];
        yield 'verweigert is blocking' => ['verweigert', false, true];
        yield 'zoll abgelehnt is blocking' => ['zoll_abgelehnt', false, true];
        yield 'retoure is blocking' => ['retoure', false, true];
    }

    public function testOrderCompletionRequiresAllParcelsToMatchCompletionRule(): void
    {
        $policy = new ParcelStatusAggregationPolicy();
        $mapping = $this->createMappingProvider();

        static::assertFalse($policy->areAllParcelsCompleted([
            ['trackingStatus' => 'zugestellt'],
            ['trackingStatus' => 'paketshop_zugestellt'],
        ], [], $mapping));

        static::assertTrue($policy->areAllParcelsCompleted([
            ['trackingStatus' => 'zugestellt'],
            ['trackingStatus' => 'paketshop_abgeholt'],
            ['trackingStatus' => 'ablageort'],
        ], [], $mapping));
    }

    private function createMappingProvider(): Status8TrackingMappingProvider
    {
        $config = $this->createMock(SystemConfigService::class);
        $config->method('get')->willReturn(null);

        return new Status8TrackingMappingProvider($config);
    }
}
