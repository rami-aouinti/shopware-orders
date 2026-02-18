jest.mock('./lieferzeiten-external-orders.html.twig', () => '', { virtual: true });

describe('lieferzeiten/page/lieferzeiten-external-orders', () => {
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

    it('exposes statistics and order table props for editing flow reuse', () => {
        const defaults = component.props.statisticsMetrics.default();

        expect(component.props.orders.required).toBe(true);
        expect(component.props.onReloadOrder.required).toBe(false);
        expect(defaults).toEqual({
            openOrders: 0,
            overdueShipping: 0,
            overdueDelivery: 0,
        });
    });
});
