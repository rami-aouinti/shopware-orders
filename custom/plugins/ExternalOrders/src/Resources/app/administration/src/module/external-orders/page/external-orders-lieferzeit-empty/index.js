import template from './external-orders-lieferzeit-empty.html.twig';

const DOMAIN_SOURCE_MAP = {
    'first-medical-shop.de': ['first-medical-shop.de', 'first medical', 'e-commerce', 'shopware', 'gambio', 'first-medical-e-commerce'],
    'ebay.de': ['ebay.de', 'ebay de'],
    'ebay.at': ['ebay.at', 'ebay at'],
    kaufland: ['kaufland'],
    peg: ['peg'],
    zonami: ['zonami'],
    'medical-solutions-germany.de': ['medical-solutions-germany.de', 'medical solutions', 'medical-solutions', 'medical_solutions'],
};

const LEGACY_DOMAIN_KEY_MAPPING = {
    'first medical': 'first-medical-shop.de',
    'e-commerce': 'first-medical-shop.de',
    'first medical - e-commerce': 'first-medical-shop.de',
    'first-medical-e-commerce': 'first-medical-shop.de',
    'medical solutions': 'medical-solutions-germany.de',
    'medical-solutions': 'medical-solutions-germany.de',
};

const DEFAULT_STATISTICS_METRICS = {
    openOrders: 0,
    overdueShipping: 0,
    overdueDelivery: 0,
};

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

const normalizeDomainKey = (domain) => {
    const normalized = String(domain || '').trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    if (LEGACY_DOMAIN_KEY_MAPPING[normalized]) {
        return LEGACY_DOMAIN_KEY_MAPPING[normalized];
    }

    if (DOMAIN_SOURCE_MAP[normalized]) {
        return normalized;
    }

    return null;
};

const resolveDomainKeyForSourceSystem = (sourceSystem) => {
    const normalizedSource = String(sourceSystem || '').trim().toLowerCase();
    if (!normalizedSource) {
        return null;
    }

    const mappedDomain = Object.entries(DOMAIN_SOURCE_MAP)
        .find(([, sources]) => sources.includes(normalizedSource));

    return mappedDomain ? mappedDomain[0] : normalizeDomainKey(normalizedSource);
};

Shopware.Component.register('external-orders-lieferzeit-empty', {
    template,

    inject: ['lieferzeitenOrdersService'],

    data() {
        return {
            selectedDomain: null,
            selectedBereich: null,
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

        applyFilters() {
            this.loadOrders();
        },

        resetFilters() {
            this.filters = createDefaultFilters();
            this.loadOrders();
        },

        async reloadData() {
            await Promise.all([
                this.loadOrders(),
                this.loadStatistics(),
            ]);
        },

        onBereichChange(bereich) {
            this.selectedBereich = bereich;
            this.loadOrders();
            this.loadStatistics();
        },

        async loadStatistics() {
            this.isStatisticsLoading = true;

            try {
                if (typeof this.lieferzeitenOrdersService.getStatistics !== 'function') {
                    this.statisticsMetrics = {
                        ...DEFAULT_STATISTICS_METRICS,
                    };
                    return;
                }

                const domainKey = normalizeDomainKey(this.selectedDomain);
                const payload = await this.lieferzeitenOrdersService.getStatistics({
                    period: 30,
                    ...(domainKey ? { domain: domainKey } : {}),
                    channel: 'all',
                });

                this.statisticsMetrics = {
                    openOrders: payload?.metrics?.openOrders ?? 0,
                    overdueShipping: payload?.metrics?.overdueShipping ?? 0,
                    overdueDelivery: payload?.metrics?.overdueDelivery ?? 0,
                };
            } catch (error) {
                this.statisticsMetrics = {
                    ...DEFAULT_STATISTICS_METRICS,
                };
            } finally {
                this.isStatisticsLoading = false;
            }
        },

        async loadOrders() {
            this.isLoading = true;
            this.loadError = null;

            try {
                const domainKey = normalizeDomainKey(this.selectedDomain);
                const result = await this.lieferzeitenOrdersService.getOrders({
                    ...this.buildFilterParams(),
                    ...(domainKey ? { domain: domainKey } : {}),
                });
                const orders = Array.isArray(result) ? result : [];

                this.orders = orders.map((order) => ({
                    ...order,
                    domainKey: resolveDomainKeyForSourceSystem(order.sourceSystem || order.domain),
                }));
            } catch (error) {
                this.orders = [];
                this.loadError = error;
            } finally {
                this.isLoading = false;
            }
        },
    },
});
