import './page/lieferzeiten-delivery-management';

const { Module } = Shopware;

Module.register('lieferzeiten-delivery-management', {
    type: 'plugin',
    name: 'lieferzeiten',
    title: 'lieferzeiten.general.mainMenuItemParent',
    description: 'lieferzeiten.general.description',
    color: '#2B8CBF',
    icon: 'regular-clock',

    routes: {
        index: {
            component: 'lieferzeiten-delivery-management',
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
            id: 'lieferzeiten-delivery-management',
            label: 'lieferzeiten.general.mainMenuItemGeneral',
            color: '#2B8CBF',
            path: 'lieferzeiten.index',
            icon: 'regular-clock',
            parent: 'sw-order',
            position: 46,
            privilege: 'admin',
        },
    ],
});
