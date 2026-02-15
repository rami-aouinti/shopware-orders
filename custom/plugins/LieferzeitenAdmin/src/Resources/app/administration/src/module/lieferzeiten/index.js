import './page/lieferzeiten-delivery-management';
import './page/lieferzeiten-external-orders';

const { Module } = Shopware;

Module.register('lieferzeiten', {
    type: 'plugin',
    name: 'lieferzeiten',
    title: 'Lieferzeiten',
    description: 'lieferzeiten.general.description',
    color: '#2B8CBF',
    icon: 'regular-clock',

    routes: {
        index: {
            component: 'lieferzeiten-external-orders',
            path: 'index',
            meta: {
                privilege: 'admin',
            },
        },
        deliveryManagement: {
            component: 'lieferzeiten-delivery-management',
            path: 'delivery-management',
            meta: {
                privilege: 'admin',
            },
        },
    },

    navigation: [
        {
            id: 'lieferzeiten',
            label: 'Lieferzeiten',
            color: '#2B8CBF',
            path: 'lieferzeiten.index',
            icon: 'regular-clock',
            parent: 'sw-order',
            position: 46,
            privilege: 'admin',
        },
    ],
});
