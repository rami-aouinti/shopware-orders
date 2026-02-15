import './page/lieferzeiten-index';
import './page/lieferzeiten-all';
import './page/lieferzeiten-open';
import './page/lieferzeiten-statistics';
import './page/lieferzeiten-delivery-management';
import './component/lieferzeiten-domain-selection';
import './component/lieferzeiten-order-table';

const { Module } = Shopware;

Module.register('lieferzeiten', {
    type: 'plugin',
    name: 'lieferzeiten',
    title: 'lieferzeiten.general.mainMenuItemGeneral',
    description: 'lieferzeiten.general.description',
    color: '#2B8CBF',
    icon: 'regular-clock',

    privileges: {
        viewer: {
            permissions: ['admin'],
            dependencies: [],
        },
        editor: {
            permissions: ['admin'],
            dependencies: ['viewer'],
        },
    },

    routes: {
        index: {
            component: 'lieferzeiten-delivery-management',
            path: 'index',
            meta: {
                privilege: 'admin',
            },
        },
    },

    navigation: [
        {
            id: 'lieferzeiten',
            label: 'lieferzeiten.general.mainMenuItemDeliveryManagement',
            color: '#2B8CBF',
            path: 'lieferzeiten.index',
            icon: 'regular-clock',
            parent: 'sw-order',
            position: 46,
        },
    ],
});
