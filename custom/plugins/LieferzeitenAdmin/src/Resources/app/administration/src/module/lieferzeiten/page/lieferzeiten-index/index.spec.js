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



    it('loadOrders keeps backend latest deadline fields unchanged', async () => {
        const order = {
            id: '1',
            sourceSystem: 'shopware',
            latestShippingDate: '2026-01-13 08:00:00',
            latestDeliveryDate: '2026-01-14 08:00:00',
        };

        const context = {
            isLoading: false,
            loadError: null,
            orders: [],
            selectedDomain: null,
            filters: component.data().filters,
            lieferzeitenOrdersService: {
                getOrders: jest.fn(async () => [order]),
            },
            buildFilterParams: component.methods.buildFilterParams,
        };

        await component.methods.loadOrders.call(context);

        expect(context.orders[0].latestShippingDate).toBe('2026-01-13 08:00:00');
        expect(context.orders[0].latestDeliveryDate).toBe('2026-01-14 08:00:00');
    });

});
