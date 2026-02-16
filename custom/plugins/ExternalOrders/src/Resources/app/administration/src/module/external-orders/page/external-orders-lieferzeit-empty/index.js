import template from './external-orders-lieferzeit-empty.html.twig';
import './external-orders-lieferzeit-empty.scss';

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

    inject: {
        lieferzeitenOrdersService: {
            from: 'lieferzeitenOrdersService',
            default: null,
        },
    },

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

        extractOrders(result) {
            if (Array.isArray(result)) {
                return result;
            }

            const rows = result?.data;
            if (Array.isArray(rows)) {
                return rows;
            }

            return [];
        },

        async fetchOrdersFallback(params) {
            const initContainer = Shopware.Application.getContainer('init');
            const httpClient = initContainer?.httpClient;
            const loginService = Shopware.Service('loginService');

            if (!httpClient || !loginService) {
                throw new Error('Lieferzeiten service is unavailable.');
            }

            const response = await httpClient.get('_action/lieferzeiten/orders', {
                params,
                headers: {
                    Authorization: `Bearer ${loginService.getToken()}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            });

            return response?.data ?? {};
        },

        async loadOrders() {
            this.isLoading = true;
            this.loadError = null;

            try {
                const params = this.buildFilterParams();
                const result = this.lieferzeitenOrdersService
                    ? await this.lieferzeitenOrdersService.getOrders(params)
                    : await this.fetchOrdersFallback(params);

                this.orders = this.extractOrders(result);
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
