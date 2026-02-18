import template from './external-orders-tracking-modal.html.twig';
import './external-orders-tracking-modal.scss';

const INTERNAL_SHIPPING_LABEL = 'versand durch first medical';

Shopware.Component.register('external-orders-tracking-modal', {
    template,

    inject: ['externalOrderTrackingService'],

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
        trackingHistory: {
            type: Array,
            required: false,
            default: () => [],
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
            const carrier = String(this.trackingEntry?.carrier || '').trim().toLowerCase();
            return this.trackingEntry?.isInternal === true || carrier === INTERNAL_SHIPPING_LABEL || carrier === 'internal';
        },

        headerTitle() {
            const carrier = this.readableCarrierLabel;
            const number = String(this.trackingEntry?.number || '').trim();

            return `Tracking ${carrier} / ${number}`;
        },

        readableCarrierLabel() {
            const carrier = String(this.trackingEntry?.carrier || '').trim().toLowerCase();

            if (carrier === '' || carrier === 'unknown') {
                return 'Versanddienstleister unbekannt';
            }

            if (carrier === 'internal') {
                return 'INTERNAL';
            }

            return carrier.toUpperCase();
        },

        isHistoricalTrackingNumber() {
            return this.trackingEntry?.isCurrent === false;
        },

        sortedTrackingHistory() {
            const history = Array.isArray(this.trackingHistory) ? this.trackingHistory : [];

            return history
                .filter((entry) => entry?.number)
                .slice()
                .sort((left, right) => {
                    const leftDate = new Date(left?.lastChangedAt || left?.createdAt || 0).getTime();
                    const rightDate = new Date(right?.lastChangedAt || right?.createdAt || 0).getTime();

                    return rightDate - leftDate;
                });
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
                this.error = 'Interner Versandfall: Versand durch First Medical. Es ist keine externe Tracking-Abfrage verfügbar.';
                this.events = [];
                this.isLoading = false;

                return;
            }

            const number = String(this.trackingEntry?.number || '').trim();
            const carrier = String(this.trackingEntry?.carrier || '').trim();

            if (number === '') {
                this.error = 'Trackingnummer fehlt.';
                this.events = [];
                this.isLoading = false;

                return;
            }

            if (carrier === '' || carrier.toLowerCase() === 'unknown') {
                this.error = 'Versanddienstleister unbekannt';
                this.events = [];
                this.isLoading = false;

                return;
            }

            this.error = '';
            this.events = [];
            this.isLoading = true;

            try {
                const response = await this.externalOrderTrackingService.history(carrier, number);

                if (response?.ok === false) {
                    this.error = response?.message || 'Tracking-Verlauf konnte nicht geladen werden.';
                    return;
                }

                this.events = Array.isArray(response?.events) ? response.events : [];
            } catch (error) {
                this.error = error?.response?.data?.message || error?.message || 'Tracking-Verlauf konnte nicht geladen werden.';
            } finally {
                this.isLoading = false;
            }
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
