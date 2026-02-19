import template from './external-orders-settings.html.twig';

const { Component, Mixin } = Shopware;

Component.register('external-orders-settings', {
    template,

    inject: ['systemConfigApiService', 'externalOrderService'],

    mixins: [
        Mixin.getByName('notification'),
    ],

    data() {
        return {
            isLoading: false,
            isSaving: false,
            isTestingSan6: false,
            san6TestResult: null,
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
                externalOrdersSan6ReadKopf: '',
                externalOrdersSan6ReadKundennummer: '',
                externalOrdersSan6ReadFromDate: '',
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


        async onTestSan6Api() {
            this.isTestingSan6 = true;

            try {
                const syncResponse = await this.externalOrderService.runSyncNow();
                const previewResponse = await this.externalOrderService.getSan6RawPreview(5);
                const rows = Array.isArray(previewResponse?.rows) ? previewResponse.rows : [];

                this.san6TestResult = {
                    executedAt: syncResponse?.executedAt || new Date().toISOString(),
                    success: Boolean(syncResponse?.success),
                    rowCount: rows.length,
                    rows,
                };

                this.createNotificationSuccess({
                    title: 'SAN6 Test erfolgreich',
                    message: `Sync ausgeführt. ${rows.length} SAN6 Datensätze gefunden.`,
                });
            } catch (error) {
                this.san6TestResult = {
                    executedAt: new Date().toISOString(),
                    success: false,
                    rowCount: 0,
                    rows: [],
                    message: error?.message || 'Der SAN6 Testaufruf ist fehlgeschlagen.',
                };

                this.createNotificationError({
                    title: 'SAN6 Test fehlgeschlagen',
                    message: error?.message || 'Der SAN6 Testaufruf konnte nicht ausgeführt werden.',
                });
            } finally {
                this.isTestingSan6 = false;
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
