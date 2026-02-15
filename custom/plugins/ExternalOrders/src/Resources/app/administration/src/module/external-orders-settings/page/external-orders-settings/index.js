import template from './external-orders-settings.html.twig';

const { Component, Mixin } = Shopware;

Component.register('external-orders-settings', {
    template,

    inject: ['systemConfigApiService'],

    mixins: [
        Mixin.getByName('notification'),
    ],

    data() {
        return {
            isLoading: false,
            isSaving: false,
            config: {
                externalOrdersTimeout: 2.5,
                externalOrdersSan6BaseUrl: '',
                externalOrdersSan6Authentifizierung: '',
                externalOrdersSan6SendStrategy: 'filetransferurl',
                externalOrdersSan6ReadFunction: '',
                externalOrdersSan6WriteFunction: '',
                externalOrdersSan6Company: '',
                externalOrdersSan6Product: '',
                externalOrdersSan6Mandant: '',
                externalOrdersSan6Sys: '',
            },
            san6SendStrategyOptions: [
                { value: 'filetransferurl', label: 'filetransferurl' },
                { value: 'legacy', label: 'legacy' },
            ],
        };
    },

    created() {
        this.loadConfig();
    },

    methods: {
        key(key) {
            return `ExternalOrders.config.${key}`;
        },

        async loadConfig() {
            this.isLoading = true;

            try {
                const values = await this.systemConfigApiService.getValues('ExternalOrders.config');

                Object.keys(this.config).forEach((field) => {
                    const value = values[this.key(field)];
                    if (value !== undefined && value !== null) {
                        this.config[field] = value;
                    }
                });
            } catch (error) {
                this.createNotificationError({
                    title: 'Laden fehlgeschlagen',
                    message: error?.message || 'Die Einstellungen konnten nicht geladen werden.',
                });
            } finally {
                this.isLoading = false;
            }
        },

        async onSave() {
            this.isSaving = true;

            try {
                const payload = {};
                Object.keys(this.config).forEach((field) => {
                    payload[this.key(field)] = this.config[field];
                });

                await this.systemConfigApiService.saveValues(payload);

                this.createNotificationSuccess({
                    title: 'Gespeichert',
                    message: 'Die Einstellungen wurden gespeichert.',
                });
            } catch (error) {
                this.createNotificationError({
                    title: 'Speichern fehlgeschlagen',
                    message: error?.message || 'Die Einstellungen konnten nicht gespeichert werden.',
                });
            } finally {
                this.isSaving = false;
            }
        },
    },
});
