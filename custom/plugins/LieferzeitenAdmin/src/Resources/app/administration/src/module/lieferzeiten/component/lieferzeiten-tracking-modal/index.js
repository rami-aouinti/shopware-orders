import template from './lieferzeiten-tracking-modal.html.twig';
import './lieferzeiten-tracking-modal.scss';

Shopware.Component.register('lieferzeiten-tracking-modal', {
    template,

    inject: ['lieferzeitenTrackingService'],

    props: {
        visible: {
            type: Boolean,
            required: true,
        },
        trackingEntry: {
            type: Object,
            required: false,
            default: null,
        },
    },

    emits: ['close'],

    data() {
        return {
            isLoading: false,
            error: '',
            events: [],
        };
    },

    computed: {
        isInternalShipment() {
            return this.trackingEntry?.isInternal === true;
        },

        headerTitle() {
            const carrier = String(this.trackingEntry?.carrier || '').trim().toUpperCase();
            const number = String(this.trackingEntry?.number || '').trim();

            return `Tracking ${carrier} / ${number}`;
        },

        isHistoricalTrackingNumber() {
            return this.trackingEntry?.isCurrent === false;
        },

        historicalMetaText() {
            if (!this.isHistoricalTrackingNumber) {
                return '';
            }

            const changedAt = this.formatDateTime(
                this.trackingEntry?.lastChangedAt || this.trackingEntry?.createdAt || null,
            );
            const changedBy = String(this.trackingEntry?.lastChangedBy || '').trim();

            if (changedBy && changedAt) {
                return this.$t('lieferzeiten.tracking.historicalMetaWithActor', { actor: changedBy, changedAt });
            }

            if (changedAt) {
                return this.$t('lieferzeiten.tracking.historicalMeta', { changedAt });
            }

            return this.$t('lieferzeiten.tracking.historical');
        },
    },

    watch: {
        visible: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.loadTrackingHistory();
                } else {
                    this.resetState();
                }
            },
        },

        trackingEntry: {
            deep: true,
            handler() {
                if (this.visible) {
                    this.loadTrackingHistory();
                }
            },
        },
    },

    methods: {
        async loadTrackingHistory() {
            if (!this.visible) {
                return;
            }

            if (this.isInternalShipment) {
                this.error = this.$t('lieferzeiten.tracking.internalShipmentInfo');
                this.events = [];
                this.isLoading = false;

                return;
            }

            const number = String(this.trackingEntry?.number || '').trim();
            const carrier = String(this.trackingEntry?.carrier || '').trim();

            if (number === '' || carrier === '') {
                this.error = this.$t('lieferzeiten.tracking.missingCarrier');
                this.events = [];
                this.isLoading = false;

                return;
            }

            this.error = '';
            this.events = [];
            this.isLoading = true;

            try {
                const response = await this.lieferzeitenTrackingService.history(carrier, number);

                if (response?.ok === false) {
                    this.error = response?.message || this.$t('lieferzeiten.tracking.loadError');
                    return;
                }

                this.events = Array.isArray(response?.events) ? response.events : [];
            } catch (error) {
                this.error = error?.response?.data?.message || error?.message || this.$t('lieferzeiten.tracking.loadError');
            } finally {
                this.isLoading = false;
            }
        },

        formatDateTime(value) {
            if (!value) {
                return null;
            }

            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return null;
            }

            return date.toLocaleString('de-DE', {
                timeZone: 'Europe/Berlin',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        },

        resetState() {
            this.isLoading = false;
            this.error = '';
            this.events = [];
        },

        close() {
            this.$emit('close');
        },
    },
});
