import './page/external-orders-settings';

const { Module } = Shopware;

Module.register('external-orders-settings', {
    type: 'plugin',
    name: 'external-orders-settings',
    title: 'Externe Bestellung',
    description: 'Einstellungen für Externe Bestellung',
    color: '#009ee3',
    icon: 'regular-shopping-cart',

    routes: {
        index: {
            component: 'external-orders-settings',
            path: 'index',
            meta: {
                privilege: 'admin',
            },
        },
    },

    navigation: [
        {
            id: 'external-orders-settings',
            label: 'Externe Bestellung',
            color: '#009ee3',
            path: 'external.orders.settings.index',
            icon: 'regular-shopping-cart',
            parent: 'sw-settings',
            position: 90,
            privilege: 'admin',
        },
    ],
});
