import template from './external-orders-lieferzeit-empty.html.twig';
import './external-orders-lieferzeit-empty.scss';

const DEFAULT_STATISTICS_METRICS = Object.freeze({
    openOrders: 0,
    overdueShipping: 0,
    overdueDelivery: 0,
});

const CHANNELS = Object.freeze([
    { id: 'all', label: 'Alle Kanäle' },
    { id: 'b2b', label: 'B2B' },
    { id: 'ebay_de', label: 'eBay DE' },
    { id: 'kaufland', label: 'Kaufland' },
    { id: 'ebay_at', label: 'eBay AT' },
    { id: 'zonami', label: 'Zonami' },
    { id: 'peg', label: 'PEG' },
    { id: 'bezb', label: 'BEZB' },
    { id: 'san6', label: 'SAN6' },
]);

const { Component, Mixin } = Shopware;

Component.register('external-orders-lieferzeit-empty', {
    template,

    mixins: [
        Mixin.getByName('notification'),
    ],

    inject: ['lieferzeitenOrdersService'],

    data() {
        return {
            pageTitle: 'Lieferzeiten',
            isLoading: false,
            orders: [],
            statistics: {
                metrics: { ...DEFAULT_STATISTICS_METRICS },
            },
            channels: CHANNELS,
            activeChannel: 'all',
        };
    },

    computed: {
        statisticsMetrics() {
            return {
                ...DEFAULT_STATISTICS_METRICS,
                ...(this.statistics?.metrics || {}),
            };
        },
        activeChannelLabel() {
            return this.channels.find((channel) => channel.id === this.activeChannel)?.label || 'Alle Kanäle';
        },
    },

    created() {
        this.initializePage();
    },

    methods: {
        buildScopePayload() {
            if (this.activeChannel === 'all') {
                return {};
            }

            return { channel: this.activeChannel };
        },

        extractOrders(response) {
            if (Array.isArray(response)) {
                return response;
            }

            if (Array.isArray(response?.orders)) {
                return response.orders;
            }

            if (Array.isArray(response?.data)) {
                return response.data;
            }

            return [];
        },

        async initializePage() {
            this.isLoading = true;

            try {
                await Promise.all([
                    this.loadOrders(),
                    this.loadStatistics(),
                ]);
            } finally {
                this.isLoading = false;
            }
        },

        async onChannelChange(channelId) {
            this.activeChannel = channelId;
            await this.initializePage();
        },

        async loadOrders() {
            const response = await this.lieferzeitenOrdersService.getOrders({
                sort: 'orderDate',
                order: 'DESC',
                limit: 200,
                ...this.buildScopePayload(),
            });

            this.orders = this.extractOrders(response);
        },

        async loadStatistics() {
            const payload = await this.lieferzeitenOrdersService.getStatistics(this.buildScopePayload());

            this.statistics = payload || { metrics: { ...DEFAULT_STATISTICS_METRICS } };
        },

        async handleReloadOrder() {
            await this.initializePage();
        },
    },
});
