jest.mock('./external-orders-lieferzeit-empty.html.twig', () => '', { virtual: true });
jest.mock('./external-orders-lieferzeit-empty.scss', () => '', { virtual: true });

describe('external-orders/page/external-orders-lieferzeit-empty integration', () => {
    let componentConfig;

    beforeEach(async () => {
        jest.resetModules();

        global.Shopware = {
            Component: {
                register: jest.fn(),
            },
            Mixin: {
                getByName: jest.fn(() => ({})),
            },
        };

        await import('./index');
        componentConfig = global.Shopware.Component.register.mock.calls[0][1];
    });

    it('loads orders and statistics through lieferzeitenOrdersService on initialize and channel switch', async () => {
        const getOrders = jest.fn()
            .mockResolvedValueOnce({ orders: [{ id: 'o1' }] })
            .mockResolvedValueOnce({ orders: [{ id: 'o2' }] });
        const getStatistics = jest.fn()
            .mockResolvedValueOnce({ metrics: { openOrders: 1, overdueShipping: 2, overdueDelivery: 3 } })
            .mockResolvedValueOnce({ metrics: { openOrders: 4, overdueShipping: 5, overdueDelivery: 6 } });

        const context = {
            ...componentConfig.data(),
            lieferzeitenOrdersService: { getOrders, getStatistics },
            buildScopePayload: componentConfig.methods.buildScopePayload,
            extractOrders: componentConfig.methods.extractOrders,
            loadOrders: componentConfig.methods.loadOrders,
            loadStatistics: componentConfig.methods.loadStatistics,
            initializePage: componentConfig.methods.initializePage,
        };

        await componentConfig.methods.initializePage.call(context);

        expect(getOrders).toHaveBeenCalledWith(expect.objectContaining({
            sort: 'orderDate',
            order: 'DESC',
            limit: 200,
        }));
        expect(getOrders).toHaveBeenCalledTimes(1);
        expect(getStatistics).toHaveBeenCalledWith({});
        expect(context.orders).toEqual([{ id: 'o1' }]);

        await componentConfig.methods.onChannelChange.call(context, 'san6');

        expect(context.activeChannel).toBe('san6');
        expect(getOrders).toHaveBeenCalledWith(expect.objectContaining({ channel: 'san6' }));
        expect(getStatistics).toHaveBeenLastCalledWith({ channel: 'san6' });
        expect(context.orders).toEqual([{ id: 'o2' }]);
        expect(context.statistics.metrics).toEqual({ openOrders: 4, overdueShipping: 5, overdueDelivery: 6 });
    });

    it('keeps empty fallback structures for unsupported responses', async () => {
        const context = {
            ...componentConfig.data(),
            lieferzeitenOrdersService: {
                getOrders: jest.fn().mockResolvedValue({ foo: 'bar' }),
                getStatistics: jest.fn().mockResolvedValue(null),
            },
            buildScopePayload: componentConfig.methods.buildScopePayload,
            extractOrders: componentConfig.methods.extractOrders,
        };

        await componentConfig.methods.loadOrders.call(context);
        await componentConfig.methods.loadStatistics.call(context);

        expect(context.orders).toEqual([]);
        expect(context.statistics).toEqual({ metrics: { openOrders: 0, overdueShipping: 0, overdueDelivery: 0 } });
    });
});
