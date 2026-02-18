describe('lieferzeiten/module route integration', () => {
    let moduleDefinition;

    beforeEach(async () => {
        jest.resetModules();

        global.Shopware = {
            Component: {
                register: jest.fn(),
            },
            Module: {
                register: jest.fn((name, definition) => {
                    moduleDefinition = { name, ...definition };
                }),
            },
        };

        jest.doMock('./component/lieferzeiten-domain-selection', () => ({}), { virtual: true });
        jest.doMock('./component/lieferzeiten-order-table', () => ({}), { virtual: true });
        jest.doMock('./component/lieferzeiten-tracking-modal', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-index', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-all', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-open', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-statistics', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-external-orders', () => ({}), { virtual: true });

        await import('./index');
    });

    it('binds lieferzeit route to external orders page as primary UI wrapper', () => {
        const routeComponent = moduleDefinition.routes.index.children.lieferzeit.component;

        expect(routeComponent).toBe('lieferzeiten-external-orders');
    });
});
