import './page/lieferzeiten-channel-settings-list';
import './page/lieferzeiten-task-assignment-rule-list';
import './page/lieferzeiten-notification-toggle-list';
import './page/lieferzeiten-sync-settings';

const { Module } = Shopware;

Module.register('lieferzeiten-settings', {
    type: 'plugin',
    name: 'lieferzeiten-settings',
    title: 'lieferzeiten.lms.general.mainMenuItem',
    description: 'lieferzeiten.lms.general.description',
    color: '#009ee3',
    icon: 'regular-cog',

    routes: {
        index: {
            component: 'lieferzeiten-sync-settings',
            path: '',
            meta: {
                privilege: 'admin',
            },
        },
        syncConfiguration: {
            component: 'lieferzeiten-sync-settings',
            path: 'sync-configuration',
            meta: {
                privilege: 'admin',
            },
        },
        channelSettings: {
            component: 'lieferzeiten-channel-settings-list',
            path: 'channel-settings',
            meta: {
                privilege: 'admin',
            },
        },
        taskAssignmentRules: {
            component: 'lieferzeiten-task-assignment-rule-list',
            path: 'task-assignment-rules',
            meta: {
                privilege: 'admin',
            },
        },
        notificationToggles: {
            component: 'lieferzeiten-notification-toggle-list',
            path: 'notification-toggles',
            meta: {
                privilege: 'admin',
            },
        },
    },

    navigation: [
        {
            id: 'lieferzeiten-settings',
            label: 'Liefezeit',
            color: '#009ee3',
            path: 'lieferzeiten.settings.index',
            icon: 'regular-clock',
            parent: 'sw-settings',
            position: 91,
            privilege: 'admin',
        },
    ],
});
