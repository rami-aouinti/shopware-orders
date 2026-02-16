<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Service;

class LatestDeadlineCalculator
{
    public function __construct(
        private readonly BaseDateResolver $baseDateResolver,
        private readonly ChannelDateSettingsProvider $settingsProvider,
        private readonly BusinessDayDeliveryDateCalculator $dateCalculator,
    ) {
    }

    /**
     * @param array<string,mixed> $payload
     * @return array{baseDateType:string,missingPaymentDate:bool,latestShipping: ?\DateTimeImmutable, latestDelivery: ?\DateTimeImmutable}
     */
    public function calculate(array $payload, ?string $salesChannelId = null, string $sourceSystem = 'shopware'): array
    {
        $resolution = $this->baseDateResolver->resolve($payload);

        if ($resolution['baseDate'] === null) {
            return [
                'baseDateType' => $resolution['baseDateType'],
                'missingPaymentDate' => $resolution['missingPaymentDate'],
                'latestShipping' => null,
                'latestDelivery' => null,
            ];
        }

        $settings = $this->settingsProvider->getForChannel($this->resolveSettingsScope($salesChannelId, $sourceSystem));

        return [
            'baseDateType' => $resolution['baseDateType'],
            'missingPaymentDate' => $resolution['missingPaymentDate'],
            'latestShipping' => $this->dateCalculator->calculate($resolution['baseDate'], $settings['shipping']),
            'latestDelivery' => $this->dateCalculator->calculate($resolution['baseDate'], $settings['delivery']),
        ];
    }

    private function resolveSettingsScope(?string $salesChannelId, string $sourceSystem): string
    {
        $trimmedSalesChannelId = trim((string) $salesChannelId);
        if ($trimmedSalesChannelId !== '') {
            return $trimmedSalesChannelId;
        }

        $trimmedSourceSystem = trim($sourceSystem);

        return $trimmedSourceSystem !== '' ? $trimmedSourceSystem : 'shopware';
    }
}
