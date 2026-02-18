<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Service;

use LieferzeitenAdmin\Service\Notification\NotificationToggleResolver;
use LieferzeitenAdmin\Service\Notification\NotificationTriggerCatalog;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\Entity;
use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\EntitySearchResult;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;

class NotificationToggleResolverTest extends TestCase
{
    public function testResolvesSalesChannelScopeBeforeGlobalFallback(): void
    {
        $repository = $this->createMock(EntityRepository::class);

        $repository->expects($this->exactly(2))
            ->method('search')
            ->willReturnOnConsecutiveCalls(
                new EntitySearchResult('lieferzeiten_notification_toggle', 0, new EntityCollection(), null, new Criteria(), Context::createDefaultContext()),
                new EntitySearchResult('lieferzeiten_notification_toggle', 1, new EntityCollection([
                    $this->createToggleEntity(false),
                ]), null, new Criteria(), Context::createDefaultContext()),
            );

        $resolver = new NotificationToggleResolver($repository);

        static::assertFalse($resolver->isEnabled(
            NotificationTriggerCatalog::DELIVERY_DATE_ASSIGNED,
            'email',
            Context::createDefaultContext(),
            'sales-channel-1',
        ));
    }

    public function testCanonicalizesLegacyTriggerBeforeLookup(): void
    {
        $repository = $this->createMock(EntityRepository::class);

        $repository->expects($this->once())
            ->method('search')
            ->with($this->callback(static function (Criteria $criteria): bool {
                $fields = array_map(static fn ($filter): string => (string) $filter->getField(), $criteria->getFilters());
                $values = array_map(static fn ($filter): mixed => $filter->getValue(), $criteria->getFilters());

                return in_array('triggerKey', $fields, true)
                    && in_array(NotificationTriggerCatalog::DELIVERY_DATE_ASSIGNED, $values, true);
            }), $this->isInstanceOf(Context::class))
            ->willReturn(new EntitySearchResult('lieferzeiten_notification_toggle', 1, new EntityCollection([
                $this->createToggleEntity(true),
            ]), null, new Criteria(), Context::createDefaultContext()));

        $resolver = new NotificationToggleResolver($repository);

        static::assertTrue($resolver->isEnabled(
            'date_livraison.attribuee',
            'email',
            Context::createDefaultContext(),
            null,
        ));
    }

    private function createToggleEntity(bool $enabled): Entity
    {
        $entity = $this->createMock(Entity::class);
        $entity->method('get')->with('enabled')->willReturn($enabled);

        return $entity;
    }
}
