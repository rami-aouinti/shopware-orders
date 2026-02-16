jest.mock('./lieferzeiten-index.html.twig', () => '', { virtual: true });

jest.mock('../../utils/domain-source-mapping', () => ({
    normalizeDomainKey: (value) => value || null,
    resolveDomainKeyForSourceSystem: (value) => value || null,
}));

describe('lieferzeiten/page/lieferzeiten-index', () => {
    let component;

    beforeEach(async () => {
        jest.resetModules();
        global.Shopware = {
            Component: {
                register: jest.fn(),
            },
        };

        await import('./index');
        component = global.Shopware.Component.register.mock.calls[0][1];
    });

    it('returns all orders when no domain is selected', () => {
        const context = {
            orders: [{ id: '1' }, { id: '2' }],
            selectedDomain: null,
        };

        expect(component.computed.filteredOrders.call(context)).toEqual(context.orders);
    });

    it('filters orders when a domain is selected', () => {
        const context = {
            orders: [{ id: '1', domainKey: 'ebay.de' }, { id: '2', domainKey: 'kaufland' }],
            selectedDomain: 'ebay.de',
        };

        expect(component.computed.filteredOrders.call(context)).toEqual([{ id: '1', domainKey: 'ebay.de' }]);
    });

    it('buildFilterParams returns values from default filters on first render', () => {
        const context = {
            filters: component.data().filters,
        };

        context.filters.bestellnummer = '  BN-1001  ';
        context.filters.status = 'offen';

        expect(component.methods.buildFilterParams.call(context)).toEqual({
            bestellnummer: 'BN-1001',
            status: 'offen',
        });
    });

    it('uses paymentReceivedDate as base date for Vorkasse orders', () => {
        const context = {
            parseOrderDate: component.methods.parseOrderDate,
            addBusinessDays: component.methods.addBusinessDays,
            computeDateByRule: component.methods.computeDateByRule,
            resolveCalculationBaseDate: component.methods.resolveCalculationBaseDate,
        };
        const order = {
            paymentMethod: 'Vorkasse',
            orderDate: '2026-01-10T08:00:00.000Z',
            paymentReceivedDate: '2026-01-12T08:00:00.000Z',
        };

        const result = component.methods.computeLatestShippingDate.call(context, order, {
            shipping: { workingDays: 0, cutoff: '12:00' },
        });

        expect(result.toISOString()).toBe('2026-01-12T08:00:00.000Z');
    });

    it('enriches normalized order with computed deadline fields', () => {
        const context = {
            parseOrderDate: component.methods.parseOrderDate,
            addBusinessDays: component.methods.addBusinessDays,
            computeDateByRule: component.methods.computeDateByRule,
            resolveCalculationBaseDate: component.methods.resolveCalculationBaseDate,
            computeLatestShippingDate: component.methods.computeLatestShippingDate,
            computeLatestDeliveryDate: component.methods.computeLatestDeliveryDate,
            delaySettingsCollection: null,
            lieferzeitenOrderDeadlineConfigService: {
                resolveSettingsForOrder: jest.fn(() => ({
                    shipping: { workingDays: 1, cutoff: '12:00' },
                    delivery: { workingDays: 2, cutoff: '12:00' },
                })),
            },
        };

        const normalized = component.methods.enrichOrderWithCalculatedDeadlines.call(context, {
            orderDate: '2026-01-12T08:00:00.000Z',
        });

        expect(normalized.latestShippingDate).toBe('2026-01-13T08:00:00.000Z');
        expect(normalized.latestDeliveryDate).toBe('2026-01-14T08:00:00.000Z');
    });
});
