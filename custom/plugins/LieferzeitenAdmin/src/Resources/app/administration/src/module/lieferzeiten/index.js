import './page/lieferzeiten-delivery-management';

const { Module } = Shopware;

Module.register('lieferzeiten', {
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
            id: 'lieferzeit-parent',
            label: 'lieferzeiten.general.mainMenuItemParent',
            color: '#2B8CBF',
            path: 'lieferzeiten.index',
            icon: 'regular-clock',
            position: 110,
            privilege: 'admin',
        },
        {
            id: 'lieferzeiten-delivery-management',
            label: 'lieferzeiten.general.mainMenuItemDeliveryManagement',
            color: '#2B8CBF',
            path: 'lieferzeiten.deliveryManagement',
            icon: 'regular-clock',
            parent: 'lieferzeit-parent',
            position: 10,
            privilege: 'admin',
        },
    ],
});
