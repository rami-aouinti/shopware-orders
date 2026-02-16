import './page/external-orders-list';
import './page/external-orders-lieferzeit-empty';

const { Module } = Shopware;

Module.register('external-orders', {
    type: 'plugin',
    name: 'external-orders',
    title: 'Bestellübersichten',
    description: 'Zentrale Übersicht für externe Bestellungen',
    color: '#009ee3',
    icon: 'regular-shopping-cart',

    routes: {
        index: {
            component: 'external-orders-list',
            path: 'index',
            meta: {
                privilege: 'admin',
            },
        },
        lieferzeit: {
            component: 'external-orders-lieferzeit-empty',
            path: '/external/orders/lieferzeit',
            meta: {
                privilege: 'admin',
            },
        },
        lieferzeitLegacy: {
            path: '/external/orders/lieferzeit',
            redirect: {
                name: 'external.orders.lieferzeit',
            },
            meta: {
                privilege: 'admin',
            },
        },
    },

    navigation: [
        {
            id: 'external-orders',
            label: 'Bestellübersichten',
            color: '#009ee3',
            path: 'external.orders.index',
            icon: 'regular-shopping-cart',
            parent: 'sw-order',
            position: 45,
        },
        {
            id: 'external-orders-lieferzeit',
            label: 'Lieferzeit',
            color: '#009ee3',
            path: 'external.orders.lieferzeit',
            icon: 'regular-clock',
            parent: 'sw-order',
            position: 46,
        },
    ],
});
