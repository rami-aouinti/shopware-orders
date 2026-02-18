describe('lieferzeiten-settings/module routing', () => {
    let moduleDefinition;

    beforeEach(async () => {
        jest.resetModules();

        global.Shopware = {
            Module: {
                register: jest.fn((name, definition) => {
                    moduleDefinition = { name, ...definition };
                }),
            },
        };

        jest.doMock('./page/lieferzeiten-channel-settings-list', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-task-assignment-rule-list', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-notification-toggle-list', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-sync-settings', () => ({}), { virtual: true });
        jest.doMock('./page/lieferzeiten-statistics-settings', () => ({}), { virtual: true });
        jest.doMock('../lieferzeiten/page/lieferzeiten-statistics', () => ({}), { virtual: true });

        await import('./index');
    });

    it('allows task assignment rules route for lieferzeiten.editor users', () => {
        expect(moduleDefinition.routes.taskAssignmentRules).toEqual(expect.objectContaining({
            path: 'task-assignment-rules',
            meta: expect.objectContaining({
                privilege: 'lieferzeiten.editor',
            }),
        }));
    });
});
