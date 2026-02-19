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
                const san6Probe = await this.externalOrderService.testSan6Read();
                const syncResponse = await this.externalOrderService.runSyncNow();
                const previewResponse = await this.externalOrderService.getSan6RawPreview(5);
                const rows = Array.isArray(previewResponse?.rows) ? previewResponse.rows : [];

                this.san6TestResult = {
                    executedAt: syncResponse?.executedAt || new Date().toISOString(),
                    success: Boolean(syncResponse?.success) && !san6Probe?.error && String(san6Probe?.resultCode || '00') === '00',
                    rowCount: rows.length,
                    rows,
                    ordersCountFromSan6: Number(san6Probe?.ordersCount || 0),
                    san6Function: san6Probe?.function || '',
                    san6Url: san6Probe?.url || '',
                    sampleExternalIds: Array.isArray(san6Probe?.sampleExternalIds) ? san6Probe.sampleExternalIds : [],
                    rawPreview: san6Probe?.rawPreview || '',
                    resultCode: san6Probe?.resultCode || null,
                    resultText: san6Probe?.resultText || null,
                    message: san6Probe?.error || null,
                };

                if (san6Probe?.error || String(san6Probe?.resultCode || '00') !== '00') {
                    this.createNotificationError({
                        title: 'SAN6 Test fehlgeschlagen',
                        message: san6Probe?.error || `SAN6 Code ${san6Probe?.resultCode || '??'}: ${san6Probe?.resultText || 'Unbekannter Fehler'}`,
                    });
                } else {
                    this.createNotificationSuccess({
                        title: 'SAN6 Test erfolgreich',
                        message: `SAN6 geliefert: ${Number(san6Probe?.ordersCount || 0)} | In Shopware sichtbar: ${rows.length}`,
                    });
                }
            } catch (error) {
                this.san6TestResult = {
                    executedAt: new Date().toISOString(),
                    success: false,
                    rowCount: 0,
                    rows: [],
                    ordersCountFromSan6: 0,
                    san6Function: '',
                    san6Url: '',
                    sampleExternalIds: [],
                    rawPreview: '',
                    resultCode: null,
                    resultText: null,
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
