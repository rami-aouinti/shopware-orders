import './page/external-orders-settings';

const { Module } = Shopware;

Module.register('external-orders-settings', {
    type: 'plugin',
    name: 'external-orders-settings',
    title: 'Externe orders',
    description: 'Einstellungen für Externe orders',
    color: '#009ee3',
    icon: 'regular-shopping-cart',

    routes: {
        index: {
            component: 'external-orders-settings',
            path: 'index',
            meta: {
                parentPath: 'sw.settings.index.bestellungLiefezeit',
                privilege: 'admin',
            },
        },
    },

    settingsItem: {
        group: 'bestellungLiefezeit',
        to: 'external.orders.settings.index',
        icon: 'regular-shopping-cart',
        privilege: 'admin',
    },
});
