import './page/lieferzeiten-channel-settings-list';
import './page/lieferzeiten-task-assignment-rule-list';
import './page/lieferzeiten-notification-toggle-list';
import './page/lieferzeiten-sync-settings';

const { Module } = Shopware;

Module.register('lieferzeiten-settings', {
    type: 'plugin',
    name: 'lieferzeiten-settings',
    title: 'Lieferzeit',
    description: 'Einstellungen für Lieferzeit',
    color: '#009ee3',
    icon: 'regular-cog',

    routes: {
        index: {
            component: 'lieferzeiten-channel-settings-list',
            path: '',
            meta: {
                parentPath: 'sw.settings.index.bestellungLiefezeit',
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

    settingsItem: {
        group: 'bestellungLiefezeit',
        to: 'lieferzeiten.settings.index',
        icon: 'regular-clock',
        privilege: 'admin',
    },
});
