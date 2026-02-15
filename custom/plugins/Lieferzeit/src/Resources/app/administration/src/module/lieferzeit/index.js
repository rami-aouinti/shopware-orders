import './page/lieferzeit-index';

const { Module } = Shopware;

Module.register('lieferzeit', {
    type: 'plugin',
    name: 'lieferzeit',
    title: 'Lieferzeit',
    description: 'Lieferzeit',
    color: '#2B8CBF',
    icon: 'regular-clock',

    routes: {
        index: {
            component: 'lieferzeit-index',
            path: 'index',
            meta: {
                parentPath: 'sw.order.index',
                privilege: 'admin',
            },
        },
    },

    privileges: {
        viewer: {
            permissions: ['admin'],
            dependencies: [],
        },
    },

    navigation: [
        {
            id: 'lieferzeit-menu-entry',
            label: 'Lieferzeit',
            color: '#2B8CBF',
            path: 'lieferzeit.index',
            icon: 'regular-clock',
            parent: 'sw-order',
            position: 47,
            privilege: 'admin',
        },
    ],
});
