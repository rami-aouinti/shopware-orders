import './component/lieferzeiten-domain-selection';
import './component/lieferzeiten-order-table';

import './page/lieferzeiten-index';
import './page/lieferzeiten-all';
import './page/lieferzeiten-open';
import './page/lieferzeiten-statistics';

const { Module } = Shopware;

Module.register('lieferzeiten', {
    type: 'plugin',
    name: 'lieferzeiten',
    title: 'Lieferzeiten',
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
            component: 'lieferzeiten-index',
            path: 'index',
            redirect: {
                name: 'lieferzeiten.index.all',
            },
            children: {
                all: {
                    component: 'lieferzeiten-all',
                    path: 'all',
                    meta: {
                        parentPath: 'lieferzeiten.index',
                        privilege: 'admin',
                    },
                },
                open: {
                    component: 'lieferzeiten-open',
                    path: 'open',
                    meta: {
                        parentPath: 'lieferzeiten.index',
                        privilege: 'admin',
                    },
                },
                statistics: {
                    component: 'lieferzeiten-statistics',
                    path: 'statistics',
                    meta: {
                        parentPath: 'lieferzeiten.index',
                        privilege: 'admin',
                    },
                },
            },
        },
    },

    navigation: [
        {
            id: 'lieferzeiten-menu-entry',
            label: 'Lieferzeiten',
            color: '#2B8CBF',
            path: 'lieferzeiten.index.all',
            icon: 'regular-clock',
            parent: 'sw-order',
            position: 46,
        },
    ],
});
