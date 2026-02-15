import './page/external-orders-settings-index';

import deDE from './snippet/de-DE.json';
import enGB from './snippet/en-GB.json';

const { Module } = Shopware;

Module.register('external-orders-settings', {
    type: 'plugin',
    name: 'external-orders-settings',
    title: 'external-orders-settings.navigation.section',
    description: 'external-orders-settings.navigation.section',
    color: '#009ee3',
    icon: 'regular-cog',

    snippets: {
        'de-DE': deDE,
        'en-GB': enGB,
    },

    routes: {
        index: {
            component: 'external-orders-settings-index',
            path: '',
            meta: {
                privilege: 'admin',
            },
        },
    },

    navigation: [
        {
            id: 'external-orders-settings',
            label: 'external-orders-settings.navigation.section',
            color: '#009ee3',
            path: 'external.orders.settings.index',
            icon: 'regular-cog',
            parent: 'sw-settings',
            position: 85,
        },
    ],
});
