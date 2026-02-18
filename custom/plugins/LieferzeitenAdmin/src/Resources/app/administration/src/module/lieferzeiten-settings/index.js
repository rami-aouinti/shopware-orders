import './page/lieferzeiten-channel-settings-list';
import './page/lieferzeiten-task-assignment-rule-list';
import './page/lieferzeiten-notification-toggle-list';
import './page/lieferzeiten-sync-settings';
import './page/lieferzeiten-statistics-settings';
import '../lieferzeiten/page/lieferzeiten-statistics';

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
            path: '',
            redirect: { name: 'lieferzeiten.settings.channelSettings' },
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
                privilege: 'lieferzeiten.editor',
            },
        },
        notificationToggles: {
            component: 'lieferzeiten-notification-toggle-list',
            path: 'notification-toggles',
            meta: {
                privilege: 'admin',
            },
        },
        statistics: {
            component: 'lieferzeiten-statistics-settings',
            path: 'statistics',
            meta: {
                privilege: 'admin',
            },
        },
    },

    settingsItem: {
        group: 'bestellungLiefezeit',
        to: 'lieferzeiten.settings.channelSettings',
        icon: 'regular-clock',
        privilege: 'admin',
    },
});
