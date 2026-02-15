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
