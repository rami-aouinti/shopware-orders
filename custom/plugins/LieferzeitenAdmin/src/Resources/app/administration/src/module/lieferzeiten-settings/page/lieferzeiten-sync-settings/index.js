import template from './lieferzeiten-sync-settings.html.twig';

const { Component } = Shopware;

const CONFIG_DOMAIN = 'LieferzeitenAdmin.config';

const FIELD_GROUPS = [
    {
        title: 'Sync strategy',
        fields: [
            {
                key: 'syncStrategy',
                label: 'Sync strategy',
                helpText: 'Allowed values: scheduled, on_demand, both',
            },
        ],
    },
    {
        title: 'Shopware/Gambio import',
        fields: [
            { key: 'shopwareApiUrl', label: 'Shopware API URL' },
            { key: 'shopwareApiToken', label: 'Shopware API token', type: 'password' },
            { key: 'gambioApiUrl', label: 'Gambio API URL' },
            { key: 'gambioApiToken', label: 'Gambio API token', type: 'password' },
        ],
    },
    {
        title: 'Status push',
        fields: [
            { key: 'shopwareStatusPushApiUrl', label: 'Shopware status push API URL' },
            { key: 'shopwareStatusPushApiToken', label: 'Shopware status push API token', type: 'password' },
            { key: 'gambioStatusPushApiUrl', label: 'Gambio status push API URL' },
            { key: 'gambioStatusPushApiToken', label: 'Gambio status push API token', type: 'password' },
            {
                key: 'status8CarrierMapping',
                label: 'Status 8 carrier mapping override (JSON)',
                type: 'textarea',
                helpText: 'Versioned override schema: {"version":2,"global":{"state":true},"carriers":{"dhl":{"state":false},"gls":{"state":true}}}',
            },
        ],
    },
    {
        title: 'Date settings JSON',
        fields: [
            {
                key: 'shopwareDateSettings',
                label: 'Shopware date settings (JSON)',
                type: 'textarea',
                helpText: 'Format: {"shipping":{"workingDays":0,"cutoff":"12:00"},"delivery":{"workingDays":2,"cutoff":"12:00"}} (legacy fallback: {"workingDays":2,"cutoff":"12:00"})',
            },
            {
                key: 'gambioDateSettings',
                label: 'Gambio date settings (JSON)',
                type: 'textarea',
                helpText: 'Format: {"shipping":{"workingDays":0,"cutoff":"12:00"},"delivery":{"workingDays":2,"cutoff":"12:00"}} (legacy fallback: {"workingDays":2,"cutoff":"12:00"})',
            },
        ],
    },
    {
        title: 'PDMS',
        fields: [
            { key: 'pdmsApiUrl', label: 'PDMS API URL' },
            { key: 'pdmsApiToken', label: 'PDMS API token', type: 'password' },
            { key: 'pdmsLieferzeitenPath', label: 'PDMS Lieferzeiten path' },
        ],
    },
    {
        title: 'SAN6',
        fields: [
            { key: 'san6ApiUrl', label: 'SAN6 API URL' },
            { key: 'san6ApiToken', label: 'SAN6 API token', type: 'password' },
        ],
    },
    {
        title: 'Default assignee',
        fields: [
            {
                key: 'defaultAssigneeLieferterminAnfrageZusaetzlich',
                label: 'Default assignee for trigger liefertermin.anfrage.zusaetzlich',
                helpText: 'Fallback assignee used when no assignment rule resolves an assignee.',
            },
        ],
    },
];

Component.register('lieferzeiten-sync-settings', {
    template,

    inject: ['systemConfigApiService'],

    mixins: ['notification'],

    data() {
        return {
            isLoading: false,
            isSaving: false,
            configDomain: CONFIG_DOMAIN,
            groups: FIELD_GROUPS,
            configValues: {},
        };
    },

    created() {
        this.loadConfig();
    },

    methods: {
        buildConfigKey(fieldKey) {
            return `${this.configDomain}.${fieldKey}`;
        },

        async loadConfig() {
            this.isLoading = true;

            try {
                const values = await this.systemConfigApiService.getValues(this.configDomain);
                const nextValues = {};

                this.groups.forEach((group) => {
                    group.fields.forEach((field) => {
                        const fullKey = this.buildConfigKey(field.key);
                        nextValues[field.key] = values[fullKey] ?? '';
                    });
                });

                this.configValues = nextValues;
            } catch (error) {
                this.createNotificationError({
                    title: 'Configuration',
                    message: 'Failed to load configuration values.',
                });
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async onSave() {
            this.isSaving = true;

            try {
                const payload = {};

                this.groups.forEach((group) => {
                    group.fields.forEach((field) => {
                        payload[this.buildConfigKey(field.key)] = this.configValues[field.key] ?? '';
                    });
                });

                await this.systemConfigApiService.saveValues(payload);

                this.createNotificationSuccess({
                    title: 'Configuration',
                    message: 'Configuration saved successfully.',
                });
            } catch (error) {
                this.createNotificationError({
                    title: 'Configuration',
                    message: 'Failed to save configuration values.',
                });
                throw error;
            } finally {
                this.isSaving = false;
            }
        },
    },
});
