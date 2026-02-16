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
        expect(metaByKey.paymentMethod).toEqual(expect.objectContaining({ filterable: true, filterType: 'text' }));
        expect(metaByKey.paymentReceivedDate).toEqual(expect.objectContaining({ filterable: true, filterType: 'dateRange' }));
        expect(metaByKey.packageStatus).toEqual(expect.objectContaining({ filterable: true, filterType: 'text' }));

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

        expect(primaryKeys).toEqual(expect.arrayContaining([
            'bestellnummer',
            'san6',
            'paymentMethod',
            'customerFirstName',
            'customerLastName',
            'customerAdditionalNames',
            'user',
            'sendenummer',
            'packageId',
            'trackingNumberPerPackage',
            'shippedQuantity',
            'packageStatus',
            'status',
        ]));
        expect(dateRangeKeys).toEqual(expect.arrayContaining([
            'shippingDate',
            'latestDeliveryDate',
            'deliveryDate',
            'lieferterminLieferant',
            'neuerLiefertermin',
        ]));
        expect(dateRangeKeys).not.toEqual(expect.arrayContaining([
            'paymentReceivedDate',
            'latestShippingDate',
        ]));

        expect(primaryKeys).not.toContain('san6Auftragsposition');
        expect(primaryKeys).not.toContain('kommentar');
        expect(dateRangeKeys).not.toContain('san6Auftragsposition');
        expect(dateRangeKeys).not.toContain('kommentar');

        expect(state.filters).not.toHaveProperty('san6Auftragsposition');
        expect(state.filters).not.toHaveProperty('kommentar');
    });



    it('expands package rows and applies field priority for position/package/order scopes', () => {
        const state = componentConfig.data();
        const context = {
            ...state,
            normalizePackageStatus: componentConfig.methods.normalizePackageStatus,
        };

        const [expanded] = componentConfig.methods.expandOrdersByPosition.call(context, [{
            id: 'order-1',
            bestellnummer: '10001',
            latestShippingDate: '2026-02-20',
            positions: [{
                positionId: '10',
                positionNumber: '1',
                label: 'Artikel A',
                shippingDate: '2026-02-11',
                deliveryDate: '2026-02-14',
                orderedQuantity: 5,
                packages: [{
                    packageId: 'PKG-1',
                    shippedQuantity: 2,
                    trackingNumber: 'TRK-1',
                    shippingDate: '2026-02-12',
                    deliveryDate: '2026-02-15',
                }],
            }],
        }]);

        expect(expanded.rowType).toBe('position');

        const rows = componentConfig.methods.expandOrdersByPosition.call(context, [{
            id: 'order-1',
            positions: [{
                positionId: '10',
                orderedQuantity: 5,
                packages: [{ packageId: 'PKG-1', shippedQuantity: 2, trackingNumber: 'TRK-1' }],
            }],
        }]);

        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual(expect.objectContaining({
            rowType: 'position',
            positionId: '10',
            packageId: '',
            trackingNumberPerPackage: '',
        }));
        expect(rows[1]).toEqual(expect.objectContaining({
            rowType: 'package',
            positionId: '10',
            packageId: 'PKG-1',
            trackingNumberPerPackage: 'TRK-1',
            shippedQuantity: 2,
            packageStatus: 'Teillieferung',
        }));
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
