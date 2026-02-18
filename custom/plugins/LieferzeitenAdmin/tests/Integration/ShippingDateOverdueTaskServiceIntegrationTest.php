<?php declare(strict_types=1);

namespace LieferzeitenAdmin\Tests\Integration;

use LieferzeitenAdmin\Entity\PaketEntity;
use LieferzeitenAdmin\Entity\PositionEntity;
use LieferzeitenAdmin\Service\ChannelPdmsThresholdResolver;
use LieferzeitenAdmin\Service\Notification\ShippingDateOverdueTaskService;
use LieferzeitenAdmin\Service\Notification\TaskAssignmentRuleResolver;
use PHPUnit\Framework\TestCase;
use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\EntitySearchResult;

class ShippingDateOverdueTaskServiceIntegrationTest extends TestCase
{
    public function testRunCreatesTaskWhenShippingDateIsNullCutoffPassedAndBusinessDateToIsToday(): void
    {
        $context = Context::createDefaultContext();
        $position = $this->buildPosition(
            shippingDate: null,
            businessDateTo: new \DateTimeImmutable('today 09:00:00')
        );

        $positionRepository = $this->createMock(EntityRepository::class);
        $positionRepository->expects($this->once())
            ->method('search')
            ->willReturn($this->createSearchResult('lieferzeiten_position', [$position], $context));

        $taskRepository = $this->createMock(EntityRepository::class);
        $taskRepository->expects($this->once())
            ->method('search')
            ->willReturn($this->createSearchResult('lieferzeiten_task', [], $context));
        $taskRepository->expects($this->once())
            ->method('create')
            ->with($this->callback(static function (array $payload): bool {
                $task = $payload[0] ?? [];
                $taskPayload = $task['payload'] ?? [];

                return ($task['status'] ?? null) === 'open'
                    && ($taskPayload['taskType'] ?? null) === 'shipping-date-overdue'
                    && ($taskPayload['trigger'] ?? null) === 'shipping-date-overdue';
            }), $context);

        $assignmentResolver = $this->createMock(TaskAssignmentRuleResolver::class);
        $assignmentResolver->method('resolve')->willReturn(['assigneeIdentifier' => 'ops@example.test']);

        $thresholdResolver = $this->createMock(ChannelPdmsThresholdResolver::class);
        $thresholdResolver->method('resolveForOrder')->willReturn([
            'shipping' => ['workingDays' => 0, 'cutoff' => '12:00'],
            'delivery' => ['workingDays' => 0, 'cutoff' => '12:00'],
        ]);

        $service = new ShippingDateOverdueTaskService(
            $positionRepository,
            $assignmentResolver,
            $taskRepository,
            $thresholdResolver,
            static fn (): \DateTimeImmutable => new \DateTimeImmutable('today 12:30:00'),
        );

        $service->run($context);
    }

    public function testRunDoesNotCreateTaskBeforeCutoff(): void
    {
        $context = Context::createDefaultContext();
        $position = $this->buildPosition(
            shippingDate: null,
            businessDateTo: new \DateTimeImmutable('today 09:00:00')
        );

        $positionRepository = $this->createMock(EntityRepository::class);
        $positionRepository->expects($this->once())
            ->method('search')
            ->willReturn($this->createSearchResult('lieferzeiten_position', [$position], $context));

        $taskRepository = $this->createMock(EntityRepository::class);
        $taskRepository->expects($this->never())->method('search');
        $taskRepository->expects($this->never())->method('create');

        $assignmentResolver = $this->createMock(TaskAssignmentRuleResolver::class);
        $thresholdResolver = $this->createMock(ChannelPdmsThresholdResolver::class);
        $thresholdResolver->method('resolveForOrder')->willReturn([
            'shipping' => ['workingDays' => 0, 'cutoff' => '12:00'],
            'delivery' => ['workingDays' => 0, 'cutoff' => '12:00'],
        ]);

        $service = new ShippingDateOverdueTaskService(
            $positionRepository,
            $assignmentResolver,
            $taskRepository,
            $thresholdResolver,
            static fn (): \DateTimeImmutable => new \DateTimeImmutable('today 11:59:00'),
        );

        $service->run($context);
    }

    public function testRunDoesNotCreateTaskWhenShippingDateAlreadySet(): void
    {
        $context = Context::createDefaultContext();
        $position = $this->buildPosition(
            shippingDate: new \DateTimeImmutable('today 08:00:00'),
            businessDateTo: new \DateTimeImmutable('today 09:00:00')
        );

        $positionRepository = $this->createMock(EntityRepository::class);
        $positionRepository->expects($this->once())
            ->method('search')
            ->willReturn($this->createSearchResult('lieferzeiten_position', [$position], $context));

        $taskRepository = $this->createMock(EntityRepository::class);
        $taskRepository->expects($this->never())->method('search');
        $taskRepository->expects($this->never())->method('create');

        $assignmentResolver = $this->createMock(TaskAssignmentRuleResolver::class);
        $thresholdResolver = $this->createMock(ChannelPdmsThresholdResolver::class);

        $service = new ShippingDateOverdueTaskService(
            $positionRepository,
            $assignmentResolver,
            $taskRepository,
            $thresholdResolver,
            static fn (): \DateTimeImmutable => new \DateTimeImmutable('today 12:30:00'),
        );

        $service->run($context);
    }

    private function buildPosition(?\DateTimeImmutable $shippingDate, ?\DateTimeImmutable $businessDateTo): PositionEntity
    {
        $paket = new PaketEntity();
        $paket->setUniqueIdentifier('paket-1');
        $paket->setExternalOrderId('EXT-100');
        $paket->setSourceSystem('shopware');
        $paket->setShippingDate($shippingDate);
        $paket->setBusinessDateTo($businessDateTo);

        $position = new PositionEntity();
        $position->setUniqueIdentifier('position-1');
        $position->setPositionNumber('1');
        $position->setPaket($paket);

        return $position;
    }

    /**
     * @param list<object> $entities
     */
    private function createSearchResult(string $entityName, array $entities, Context $context): EntitySearchResult
    {
        return new EntitySearchResult(
            $entityName,
            count($entities),
            new EntityCollection($entities),
            null,
            new Criteria(),
            $context,
        );
    }
}
