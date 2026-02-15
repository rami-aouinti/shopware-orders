const { Component, Mixin } = Shopware;

Component.register('external-orders-settings-index', {
    template: `
        <sw-page class="external-orders-settings-index">
            <template #smart-bar-header>
                <h2>External Orders Einstellungen</h2>
            </template>

            <template #smart-bar-actions>
                <sw-button-process
                    variant="primary"
                    :is-loading="isSaving"
                    :process-success="saveSuccessful"
                    @click="saveSettings"
                >
                    Speichern
                </sw-button-process>
            </template>

            <template #content>
                <sw-card-view>
                    <sw-card title="Übersicht">
                        <sw-text-field
                            v-model="settings.pageNameDe"
                            label="Seitenname (Deutsch)"
                        />
                        <sw-text-field
                            v-model="settings.pageNameEn"
                            label="Seitenname (Englisch)"
                        />
                        <sw-number-field
                            v-model="settings.defaultColumnsPerPage"
                            label="Standardspalten pro Seite"
                            :min="1"
                        />
                    </sw-card>

                    <sw-card title="Kanal-Zugangsdaten & Sync">
                        <external-orders-channel-config />
                    </sw-card>

                    <sw-card title="SAN6 Konfiguration">
                        <sw-text-field v-model="settings.externalOrdersSan6BaseUrl" label="SAN6 Basis-URL" placeholder="https://example.com:4443" />
                        <sw-text-field v-model="settings.externalOrdersSan6Company" label="SAN6 Company" />
                        <sw-text-field v-model="settings.externalOrdersSan6Product" label="SAN6 Product" />
                        <sw-single-select
                            v-model="settings.externalOrdersSan6Mandant"
                            label="SAN6 Mandant"
                            :options="mandantOptions"
                        />
                        <sw-text-field v-model="settings.externalOrdersSan6Sys" label="SAN6 Sys" />
                        <sw-text-field v-model="settings.externalOrdersSan6Authentifizierung" label="SAN6 Authentifizierung" />
                        <sw-text-field v-model="settings.externalOrdersSan6ReadFunction" label="SAN6 Lese-Funktion" />
                        <sw-text-field v-model="settings.externalOrdersSan6WriteFunction" label="SAN6 Schreib-Funktion" />
                        <sw-single-select
                            v-model="settings.externalOrdersSan6SendStrategy"
                            label="SAN6 Versandstrategie"
                            :options="sendStrategyOptions"
                        />
                    </sw-card>
                </sw-card-view>
            </template>
        </sw-page>
    `,

    inject: ['systemConfigApiService'],

    mixins: [Mixin.getByName('notification')],

    data() {
        return {
            isLoading: false,
            isSaving: false,
            saveSuccessful: false,
            settings: {
                pageNameDe: '',
                pageNameEn: '',
                defaultColumnsPerPage: 25,
                externalOrdersSan6BaseUrl: '',
                externalOrdersSan6Company: '',
                externalOrdersSan6Product: '',
                externalOrdersSan6Mandant: 'Schule',
                externalOrdersSan6Sys: '',
                externalOrdersSan6Authentifizierung: '',
                externalOrdersSan6ReadFunction: 'API-AUFTRAEGE',
                externalOrdersSan6WriteFunction: 'API-AUFTRAGNEU2',
                externalOrdersSan6SendStrategy: 'filetransferurl',
            },
            mandantOptions: [
                { value: 'Schule', label: 'Schule' },
                { value: 'Zentrale', label: 'Zentrale' },
            ],
            sendStrategyOptions: [
                { value: 'filetransferurl', label: 'filetransferurl' },
                { value: 'post-xml', label: 'post-xml' },
            ],
        };
    },

    created() {
        this.loadSettings();
    },

    methods: {
        getConfigKey(key) {
            return `ExternalOrders.config.${key}`;
        },

        async loadSettings() {
            this.isLoading = true;

            try {
                const values = await this.systemConfigApiService.getValues('ExternalOrders.config');

                Object.keys(this.settings).forEach((key) => {
                    const value = values[this.getConfigKey(key)];
                    if (value !== undefined && value !== null) {
                        this.settings[key] = value;
                    }
                });
            } catch (error) {
                this.createNotificationError({
                    title: 'Konfiguration konnte nicht geladen werden',
                    message: error?.message || 'Die Einstellungen konnten nicht geladen werden.',
                });
            } finally {
                this.isLoading = false;
            }
        },

        async saveSettings() {
            if (this.isSaving) {
                return;
            }

            this.isSaving = true;
            this.saveSuccessful = false;

            try {
                const payload = Object.entries(this.settings).reduce((accumulator, [key, value]) => {
                    accumulator[this.getConfigKey(key)] = value;
                    return accumulator;
                }, {});

                await this.systemConfigApiService.saveValues(payload);

                this.saveSuccessful = true;
                this.createNotificationSuccess({
                    title: 'Gespeichert',
                    message: 'Die External Orders Einstellungen wurden aktualisiert.',
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
