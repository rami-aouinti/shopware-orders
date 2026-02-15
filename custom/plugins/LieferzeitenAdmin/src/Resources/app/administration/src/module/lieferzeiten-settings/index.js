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
            label: 'lieferzeiten.settingsNavigation.deliveryTime',
            color: '#009ee3',
            path: 'lieferzeiten.settings.index',
            icon: 'regular-cog',
            parent: 'bestellungen-lieferzeiten-settings',
            position: 90,
        },
        {
            id: 'lieferzeiten-settings-main-list',
            label: 'lieferzeiten.general.mainMenuItemGeneral',
            color: '#009ee3',
            path: 'lieferzeiten.index',
            parent: 'lieferzeiten-settings',
            position: 5,
        },
        {
            id: 'lieferzeiten-settings-sync-config',
            label: 'Sync configuration',
            color: '#009ee3',
            path: 'lieferzeiten.settings.syncConfiguration',
            parent: 'lieferzeiten-settings',
            position: 10,
        },
        {
            id: 'lieferzeiten-settings-channel',
            label: 'lieferzeiten.lms.navigation.thresholdsByChannel',
            color: '#009ee3',
            path: 'lieferzeiten.settings.channelSettings',
            parent: 'lieferzeiten-settings',
            position: 20,
        },
        {
            id: 'lieferzeiten-settings-task',
            label: 'lieferzeiten.lms.navigation.taskAssignmentRules',
            color: '#009ee3',
            path: 'lieferzeiten.settings.taskAssignmentRules',
            parent: 'lieferzeiten-settings',
            position: 30,
        },
        {
            id: 'lieferzeiten-settings-notifications',
            label: 'lieferzeiten.lms.navigation.notificationToggles',
            color: '#009ee3',
            path: 'lieferzeiten.settings.notificationToggles',
            parent: 'lieferzeiten-settings',
            position: 40,
        },
    ],
});
