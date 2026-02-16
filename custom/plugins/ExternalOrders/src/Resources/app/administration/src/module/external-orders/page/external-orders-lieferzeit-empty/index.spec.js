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
        expect(metaByKey.orderDate).toEqual(expect.objectContaining({ filterable: true, filterType: 'dateRange' }));
        expect(metaByKey.paymentMethod).toEqual(expect.objectContaining({ filterable: true, filterType: 'text' }));
        expect(metaByKey.paymentReceivedDate).toEqual(expect.objectContaining({ filterable: true, filterType: 'dateRange' }));
        expect(metaByKey.orderedQuantity).toEqual(expect.objectContaining({ filterable: true, filterType: 'text' }));
        expect(metaByKey.packageStatus).toEqual(expect.objectContaining({ filterable: true, filterType: 'text' }));
        expect(metaByKey.shippedQuantity).toEqual(expect.objectContaining({ label: 'Versandmenge je Paket (versendet/bestellt)' }));

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
            'orderedQuantity',
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
            'orderDate',
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

    it('derives package status from quantities, package assignment and split logic', () => {
        const derive = componentConfig.methods.normalizePackageStatus;

        expect(derive('', 1, 10, 10, 10, true)).toBe('Gesamt-Versand');
        expect(derive('', 2, 5, 10, 10, true)).toBe('Teillieferung');
        expect(derive('', 2, 3, 10, 7, true)).toBe('Trennung Auftragsposition');
        expect(derive('', 1, 0, 10, 0, true)).toBe('Unklar');
        expect(derive('', 1, 5, 10, 5, false)).toBe('Unklar');
    });

    it('builds table rows on position+package granularity and keeps per-package date values', () => {
        const state = componentConfig.data();
        const context = {
            ...state,
            normalizePackageStatus: componentConfig.methods.normalizePackageStatus,
        };

        const rows = componentConfig.methods.expandOrdersByPosition.call(context, [{
            id: 'order-1',
            shippingDate: '2026-02-01',
            deliveryDate: '2026-02-03',
            positions: [{
                positionId: '10',
                orderedQuantity: 10,
                packages: [
                    {
                        packageId: 'PKG-1',
                        shippedQuantity: 7,
                        trackingNumber: 'TRK-1',
                        shippingDate: '2026-02-05',
                        deliveryDate: '2026-02-07',
                    },
                    {
                        packageId: 'PKG-2',
                        shippedQuantity: 3,
                        trackingNumber: 'TRK-2',
                        shippingDate: '2026-02-06',
                        deliveryDate: '2026-02-08',
                    },
                ],
            }],
        }]);

        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual(expect.objectContaining({
            rowType: 'package',
            positionId: '10',
            packageId: 'PKG-1',
            trackingNumberPerPackage: 'TRK-1',
            shippedQuantity: 7,
            shippedOrderedRatio: '7/10',
            shippingDate: '2026-02-05',
            deliveryDate: '2026-02-07',
            packageStatus: 'Teillieferung',
        }));
        expect(rows[1]).toEqual(expect.objectContaining({
            rowType: 'package',
            positionId: '10',
            packageId: 'PKG-2',
            trackingNumberPerPackage: 'TRK-2',
            shippedQuantity: 3,
            shippedOrderedRatio: '3/10',
            shippingDate: '2026-02-06',
            deliveryDate: '2026-02-08',
            packageStatus: 'Teillieferung',
        }));

        const shippedQuantityValue = componentConfig.methods.getColumnValue(rows[0], 'shippedQuantity');
        expect(shippedQuantityValue).toBe('7/10');
    });

    it('maps normalized filter params to externalOrderService.list', async () => {
        const state = componentConfig.data();
        const list = jest.fn().mockResolvedValue({ orders: [] });

        const context = {
            ...state,
            filters: {
                ...state.filters,
                bestellnummer: ' 10001 ',
                orderedQuantity: ' 5 ',
                orderDateFrom: '2026-01-20T10:20:00+01:00',
                orderDateTo: '2026-01-22',
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
            orderedQuantity: '5',
            orderDateFrom: '2026-01-20',
            orderDateTo: '2026-01-22',
            shippingDateFrom: '2026-02-01',
            shippingDateTo: '2026-02-10',
            status: 'processing',
        }));
        expect(list.mock.calls[0][0]).not.toHaveProperty('san6Auftragsposition');
        expect(list.mock.calls[0][0]).not.toHaveProperty('kommentar');
    });
});
