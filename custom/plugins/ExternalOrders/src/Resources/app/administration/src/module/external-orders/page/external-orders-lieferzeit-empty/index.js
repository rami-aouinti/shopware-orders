import template from './external-orders-lieferzeit-empty.html.twig';

const DEFAULT_STATISTICS_METRICS = Object.freeze({
    openOrders: 0,
    overdueShipping: 0,
    overdueDelivery: 0,
});

const createDefaultFilters = () => ({
    bestellnummer: '',
    san6: '',
    user: '',
    sendenummer: '',
    status: '',
    shippingDateFrom: null,
    shippingDateTo: null,
    businessDateFrom: null,
    businessDateTo: null,
    deliveryDateFrom: null,
    deliveryDateTo: null,
    businessDateEndFrom: null,
    businessDateEndTo: null,
    lieferterminLieferantFrom: null,
    lieferterminLieferantTo: null,
    neuerLieferterminFrom: null,
    neuerLieferterminTo: null,
});

Shopware.Component.register('external-orders-lieferzeit-empty', {
    template,

    inject: ['lieferzeitenOrdersService'],

    data() {
        return {
            filters: createDefaultFilters(),
            orders: [],
            isLoading: false,
            isStatisticsLoading: false,
            loadError: null,
            statisticsMetrics: {
                ...DEFAULT_STATISTICS_METRICS,
            },
        };
    },

    created() {
        this.loadOrders();
        this.loadStatistics();
    },

    watch: {
        selectedDomain() {
            this.loadOrders();
            this.loadStatistics();
        },
    },

    computed: {
        filteredOrders() {
            const domainKey = normalizeDomainKey(this.selectedDomain);
            if (!domainKey) {
                return this.orders;
            }

            return this.orders.filter((order) => order.domainKey === domainKey);
        },
    },

    methods: {
        async loadStatistics() {
            return DEFAULT_STATISTICS_METRICS;
        },

        displayOrDash(value) {
            if (value === null || value === undefined) {
                return '-';
            }

            const normalizedValue = String(value).trim();
            return normalizedValue === '' ? '-' : normalizedValue;
        },

        formatDate(value) {
            if (!value) {
                return '-';
            }

            return this.displayOrDash(value);
        },

        buildFilterParams() {
            return Object.entries(this.filters).reduce((params, [key, value]) => {
                if (value === null || value === undefined) {
                    return params;
                }

                const normalizedValue = typeof value === 'string' ? value.trim() : value;
                if (normalizedValue === '') {
                    return params;
                }

                params[key] = normalizedValue;

                return params;
            }, {});
        },

        async loadOrders() {
            this.isLoading = true;
            this.loadError = null;

            try {
                const result = await this.lieferzeitenOrdersService.getOrders({
                    ...this.buildFilterParams(),
                });

                this.orders = Array.isArray(result) ? result : [];
            } catch (error) {
                this.orders = [];
                this.loadError = error;
            } finally {
                this.isLoading = false;
            }
        },

        applyFilters() {
            this.loadOrders();
        },

        resetFilters() {
            this.filters = createDefaultFilters();
            this.loadOrders();
        },
    },
});
