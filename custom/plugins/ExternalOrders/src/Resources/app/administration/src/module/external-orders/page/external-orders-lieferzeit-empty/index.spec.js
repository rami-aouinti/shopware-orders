jest.mock('./external-orders-lieferzeit-empty.html.twig', () => '', { virtual: true });
jest.mock('./external-orders-lieferzeit-empty.scss', () => '', { virtual: true });

describe('external-orders/page/external-orders-lieferzeit-empty', () => {
    let componentConfig;
    let tableColumnsMeta;

    beforeEach(async () => {
        jest.resetModules();

        global.Shopware = {
            Component: {
                register: jest.fn(),
            },
            Mixin: {
                getByName: jest.fn(() => ({})),
            },
            Application: {
                getContainer: jest.fn(() => ({})),
            },
            Service: jest.fn(),
        };

        const module = await import('./index');
        tableColumnsMeta = module.tableColumnsMeta;
        componentConfig = global.Shopware.Component.register.mock.calls[0][1];
    });

    it('declares required filter metadata and keeps NICHTS fields non-filterable', () => {
        const metaByKey = tableColumnsMeta.reduce((acc, column) => {
            acc[column.key] = column;
            return acc;
        }, {});

        expect(metaByKey.bestellnummer).toEqual(expect.objectContaining({ filterable: true, filterType: 'text' }));
        expect(metaByKey.status).toEqual(expect.objectContaining({ filterable: true, filterType: 'select' }));
        expect(metaByKey.shippingDate).toEqual(expect.objectContaining({ filterable: true, filterType: 'dateRange' }));

        expect(metaByKey.san6Auftragsposition).toEqual(expect.objectContaining({ filterable: false, filterType: 'none' }));
        expect(metaByKey.kommentar).toEqual(expect.objectContaining({ filterable: false, filterType: 'none' }));
    });

    it('builds filter UI groups only from filterable metadata', () => {
        const state = componentConfig.data();
        const context = {
            ...state,
        };

        const primaryFilters = componentConfig.computed.primaryFilters.call(context);
        const dateRangeFilters = componentConfig.computed.dateRangeFilters.call(context);

        const primaryKeys = primaryFilters.map((column) => column.key);
        const dateRangeKeys = dateRangeFilters.map((column) => column.key);

        expect(primaryKeys).toEqual(expect.arrayContaining(['bestellnummer', 'san6', 'user', 'sendenummer', 'status']));
        expect(dateRangeKeys).toEqual(expect.arrayContaining([
            'latestShippingDate',
            'shippingDate',
            'latestDeliveryDate',
            'deliveryDate',
            'lieferterminLieferant',
            'neuerLiefertermin',
        ]));

        expect(primaryKeys).not.toContain('san6Auftragsposition');
        expect(primaryKeys).not.toContain('kommentar');
        expect(dateRangeKeys).not.toContain('san6Auftragsposition');
        expect(dateRangeKeys).not.toContain('kommentar');

        expect(state.filters).not.toHaveProperty('san6Auftragsposition');
        expect(state.filters).not.toHaveProperty('kommentar');
    });

    it('maps normalized filter params to externalOrderService.list', async () => {
        const state = componentConfig.data();
        const list = jest.fn().mockResolvedValue({ orders: [] });

        const context = {
            ...state,
            filters: {
                ...state.filters,
                bestellnummer: ' 10001 ',
                shippingDateFrom: '2026-02-01T10:20:00+01:00',
                shippingDateTo: new Date('2026-02-10T00:00:00.000Z'),
                status: 'processing',
            },
            externalOrderService: { list },
            buildFilterParams: componentConfig.methods.buildFilterParams,
            fetchOrdersFallback: jest.fn(),
            extractOrders: componentConfig.methods.extractOrders,
            normalizeOrder: (order) => order,
            expandOrdersByPosition: (orders) => orders,
            channels: [{ id: 'all' }],
            activeChannel: 'all',
            page: 2,
        };

        await componentConfig.methods.loadOrders.call(context);

        expect(list).toHaveBeenCalledWith(expect.objectContaining({
            bestellnummer: '10001',
            shippingDateFrom: '2026-02-01',
            shippingDateTo: '2026-02-10',
            status: 'processing',
        }));
        expect(list.mock.calls[0][0]).not.toHaveProperty('san6Auftragsposition');
        expect(list.mock.calls[0][0]).not.toHaveProperty('kommentar');
    });
});
