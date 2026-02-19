import './lieferzeiten-notification-toggle-list.scss';
import template from './lieferzeiten-notification-toggle-list.html.twig';

const { Component } = Shopware;
const { Criteria } = Shopware.Data;

Component.register('lieferzeiten-notification-toggle-list', {
    template,

    mixins: ['notification'],

    inject: ['repositoryFactory'],

    data() {
        return {
            repository: null,
            salesChannelRepository: null,
            items: [],
            salesChannels: [],
            isLoading: false,
            triggerOptions: [
                'commande.creee',
                'commande.changement_statut',
                'tracking.mis_a_jour',
                'expedition.confirmee',
                'changements.date_livraison',
                'livraison.date.attribuee',
                'livraison.date.modifiee',
                'douane.requise',
                'commande.storno',
                'livraison.impossible',
            ],
            channelOptions: ['email'],
            invalidEntries: [],
            selectedSalesChannelId: 'all',
        };
    },

    computed: {
        hasEditAccess() {
            const aclService = this.getAclService();

            if (!aclService) {
                return false;
            }

            return aclService.can('lieferzeiten.editor') || aclService.can('admin');
        },

        salesChannelColumns() {
            return [
                {
                    id: 'global',
                    name: this.$t('lieferzeiten.lms.notificationMatrix.globalScope'),
                },
                ...this.salesChannels.map((salesChannel) => ({
                    id: salesChannel.id,
                    name: salesChannel.name || salesChannel.id,
                })),
            ];
        },

        salesChannelFilterOptions() {
            return [
                {
                    label: this.$t('lieferzeiten.lms.notificationMatrix.salesChannelFilterAll'),
                    value: 'all',
                },
                ...this.salesChannelColumns.map((scope) => ({
                    label: scope.name,
                    value: scope.id,
                })),
            ];
        },

        visibleScopes() {
            if (this.selectedSalesChannelId === 'all') {
                return this.salesChannelColumns;
            }

            return this.salesChannelColumns.filter((scope) => scope.id === this.selectedSalesChannelId);
        },
    },

    created() {
        document.body.classList.add('lza-settings-no-search');
        this.repository = this.repositoryFactory.create('lieferzeiten_notification_toggle');
        this.salesChannelRepository = this.repositoryFactory.create('sales_channel');
        this.loadData();
    },

    beforeDestroy() {
        document.body.classList.remove('lza-settings-no-search');
    },

    methods: {
        getAclService() {
            const injectedAcl = this.acl;

            if (typeof injectedAcl?.can === 'function') {
                return injectedAcl;
            }

            const serviceAcl = Shopware.Application.getContainer('service')?.acl;

            if (typeof serviceAcl?.can === 'function') {
                return serviceAcl;
            }

            return null;
        },

        extractErrorMessage(error) {
            return error?.response?.data?.errors?.[0]?.detail
                || error?.response?.data?.message
                || error?.message
                || this.$t('global.default.error');
        },

        notifyRequestError(error, fallbackTitle) {
            this.createNotificationError({
                title: fallbackTitle,
                message: this.extractErrorMessage(error),
            });
        },

        async loadData() {
            this.isLoading = true;

            try {
                const toggleCriteria = new Criteria(1, 500);
                toggleCriteria.addSorting(Criteria.sort('triggerKey', 'ASC'));
                toggleCriteria.addSorting(Criteria.sort('channel', 'ASC'));
                toggleCriteria.addSorting(Criteria.sort('salesChannelId', 'ASC'));

                const salesChannelCriteria = new Criteria(1, 500);
                salesChannelCriteria.addSorting(Criteria.sort('name', 'ASC'));

                const [toggleResult, salesChannelResult] = await Promise.all([
                    this.repository.search(toggleCriteria, Shopware.Context.api),
                    this.salesChannelRepository.search(salesChannelCriteria, Shopware.Context.api),
                ]);

                this.items = [...toggleResult];
                this.salesChannels = [...salesChannelResult];
                this.invalidEntries = this.items.filter((item) => !this.isValidToggle(item));
            } catch (error) {
                this.notifyRequestError(error, this.$t('lieferzeiten.lms.general.mainMenuItem'));
            } finally {
                this.isLoading = false;
            }
        },

        getScopeLabel(scopeId) {
            return this.salesChannelColumns.find((scope) => scope.id === scopeId)?.name || scopeId;
        },

        getToggleEntity(triggerKey, channel, salesChannelId) {
            const scopeId = salesChannelId || null;

            return this.items.find((item) => item.triggerKey === triggerKey
                && item.channel === channel
                && (item.salesChannelId || null) === scopeId);
        },

        getToggleValue(triggerKey, channel, salesChannelId) {
            return Boolean(this.getToggleEntity(triggerKey, channel, salesChannelId)?.enabled);
        },

        getTriggerLabel(triggerKey) {
            const fallbackLocales = this.$root?.$i18n?.fallbackLocale;
            const localeOrder = [
                this.$i18n?.locale,
                ...(Array.isArray(fallbackLocales) ? fallbackLocales : [fallbackLocales]),
                'en-GB',
                'de-DE',
            ].filter((locale, index, locales) => typeof locale === 'string' && locales.indexOf(locale) === index);

            for (const locale of localeOrder) {
                const triggerTranslations = this.$tm('lieferzeiten.lms.notificationMatrix.triggers', locale);
                const translatedLabel = triggerTranslations?.[triggerKey];

                if (translatedLabel) {
                    return translatedLabel;
                }
            }

            return triggerKey;
        },

        isValidToggle(item) {
            const expectedCode = `${item.triggerKey}:${item.channel}`;

            return this.triggerOptions.includes(item.triggerKey)
                && this.channelOptions.includes(item.channel)
                && item.code === expectedCode;
        },

        isCellDisabled(triggerKey, channel, salesChannelId) {
            const existingEntity = this.getToggleEntity(triggerKey, channel, salesChannelId);

            if (!existingEntity) {
                return false;
            }

            return !this.isValidToggle(existingEntity);
        },

        async saveToggle(triggerKey, channel, salesChannelId, enabled) {
            if (!this.hasEditAccess) {
                return false;
            }

            if (!this.triggerOptions.includes(triggerKey)) {
                this.createNotificationError({
                    title: 'Validation',
                    message: `Ungültiger Trigger: ${triggerKey}`,
                });

                return false;
            }

            if (!this.channelOptions.includes(channel)) {
                this.createNotificationError({
                    title: 'Validation',
                    message: `Ungültiger Kanal: ${channel}`,
                });

                return false;
            }

            const normalizedSalesChannelId = salesChannelId || null;
            let entity = this.getToggleEntity(triggerKey, channel, normalizedSalesChannelId);

            if (entity && !this.isValidToggle(entity)) {
                this.createNotificationError({
                    title: 'Validation',
                    message: 'Inkonsistenter Eintrag kann nicht geändert werden. Bitte triggerKey/channel/code per API korrigieren oder den Eintrag löschen.',
                });

                return false;
            }

            if (!entity) {
                entity = this.repository.create(Shopware.Context.api);
                entity.triggerKey = triggerKey;
                entity.channel = channel;
                entity.salesChannelId = normalizedSalesChannelId;
            }

            entity.code = `${triggerKey}:${channel}`;
            entity.enabled = Boolean(enabled);

            await this.repository.save(entity, Shopware.Context.api);

            return true;
        },

        async onToggleChanged(triggerKey, channel, salesChannelId, enabled) {
            this.isLoading = true;

            try {
                const hasChanged = await this.saveToggle(triggerKey, channel, salesChannelId, enabled);

                if (!hasChanged) {
                    return;
                }

                await this.loadData();
                this.createNotificationSuccess({
                    title: this.$t('lieferzeiten.lms.notificationMatrix.saveSuccessTitle'),
                    message: this.$t('lieferzeiten.lms.notificationMatrix.saveSuccessMessage', {
                        scope: this.getScopeLabel(salesChannelId || 'global'),
                    }),
                });
            } catch (error) {
                this.notifyRequestError(error, this.$t('lieferzeiten.lms.notificationMatrix.saveErrorTitle'));
            } finally {
                this.isLoading = false;
            }
        },

        async setScopeState(scopeId, enabled) {
            if (!this.hasEditAccess) {
                return;
            }

            this.isLoading = true;
            const normalizedScopeId = scopeId === 'global' ? null : scopeId;

            try {
                for (const triggerKey of this.triggerOptions) {
                    // eslint-disable-next-line no-await-in-loop
                    await this.saveToggle(triggerKey, this.channelOptions[0], normalizedScopeId, enabled);
                }

                await this.loadData();
                this.createNotificationSuccess({
                    title: this.$t('lieferzeiten.lms.notificationMatrix.bulkSuccessTitle'),
                    message: this.$t('lieferzeiten.lms.notificationMatrix.bulkSuccessMessage', {
                        state: enabled
                            ? this.$t('lieferzeiten.lms.notificationMatrix.stateEnabled')
                            : this.$t('lieferzeiten.lms.notificationMatrix.stateDisabled'),
                        scope: this.getScopeLabel(scopeId),
                    }),
                });
            } catch (error) {
                this.notifyRequestError(error, this.$t('lieferzeiten.lms.notificationMatrix.saveErrorTitle'));
            } finally {
                this.isLoading = false;
            }
        },

        async onReload() {
            this.isLoading = true;

            try {
                await this.loadData();
                this.createNotificationSuccess({
                    title: this.$t('lieferzeiten.lms.notificationMatrix.reloadSuccessTitle'),
                    message: this.$t('lieferzeiten.lms.notificationMatrix.reloadSuccessMessage'),
                });
            } catch (error) {
                this.notifyRequestError(error, this.$t('lieferzeiten.lms.notificationMatrix.reloadErrorTitle'));
            } finally {
                this.isLoading = false;
            }
        },
    },
});
