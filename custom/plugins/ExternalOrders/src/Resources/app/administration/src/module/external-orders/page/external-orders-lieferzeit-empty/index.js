import template from './external-orders-lieferzeit-empty.html.twig';
import './external-orders-lieferzeit-empty.scss';

const DEFAULT_STATISTICS_METRICS = Object.freeze({
    openOrders: 0,
    overdueShipping: 0,
    overdueDelivery: 0,
});


const DEMO_CHANNELS = Object.freeze([
    'b2b',
    'ebay_de',
    'kaufland',
    'ebay_at',
    'zonami',
    'peg',
    'bezb',
    'san6',
]);

const CHANNEL_LABELS = Object.freeze({
    b2b: 'B2B',
    ebay_de: 'eBay DE',
    kaufland: 'Kaufland',
    ebay_at: 'eBay AT',
    zonami: 'Zonami',
    peg: 'PEG',
    bezb: 'BEZB',
    san6: 'SAN6',
});

const COLUMN_DEFINITIONS = Object.freeze([
    { key: 'bestellnummer', label: 'Bestellnummer', group: 'Bestellung' },
    { key: 'san6', label: 'SAN6-Auftragsnummer', group: 'Bestellung' },
    { key: 'user', label: 'Kunde', group: 'Bestellung' },
    { key: 'domain', label: 'Vertriebskanal', group: 'Bestellung' },
    { key: 'sendenummer', label: 'Sendungsnummer', group: 'Lieferung' },
    { key: 'businessDate', label: 'Lieferstart (Business)', group: 'Lieferung', type: 'date' },
    { key: 'businessDateEnd', label: 'Lieferende (Business)', group: 'Lieferung', type: 'date' },
    { key: 'lieferterminLieferant', label: 'Liefertermin Lieferant', group: 'Lieferung', type: 'date' },
    { key: 'neuerLiefertermin', label: 'Neuer Liefertermin', group: 'Lieferung', type: 'date' },
    { key: 'latestShippingDate', label: 'Spätester Versand', group: 'Status', type: 'date' },
    { key: 'latestDeliveryDate', label: 'Späteste Lieferung', group: 'Status', type: 'date' },
    { key: 'status', label: 'Bestellstatus', group: 'Status' },
]);

const COLUMN_KEYS = COLUMN_DEFINITIONS.map((column) => column.key);
const DATE_COLUMN_KEYS = COLUMN_DEFINITIONS
    .filter((column) => column.type === 'date')
    .map((column) => column.key);

const createDefaultFilters = () => ({
    bestellnummer: '',
    san6: '',
    user: '',
    domain: '',
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

const createDefaultColumnFilters = () => COLUMN_KEYS.reduce((filters, key) => {
    filters[key] = { value: '', operator: 'contains' };
    return filters;
}, {});

Shopware.Component.register('external-orders-lieferzeit-empty', {
    template,

    inject: ['externalOrderService'],

    data() {
        return {
            pageTitle: 'Lieferzeiten',
            filters: createDefaultFilters(),
            orders: [],
            isLoading: false,
            loadError: null,
            statisticsMetrics: {
                ...DEFAULT_STATISTICS_METRICS,
            },
            activeChannel: 'all',
            tableSearchTerm: '',
            activeColumnFilter: null,
            columnFilters: createDefaultColumnFilters(),
            columnFilterOperatorOptions: [
                { value: 'contains', label: 'Contains' },
                { value: 'equals', label: 'Equals' },
                { value: 'startsWith', label: 'Starts with' },
            ],
            sortBy: 'latestShippingDate',
            sortDirection: 'DESC',
            page: 1,
            limit: 10,
            limitOptions: [10, 25, 50, 100],
            selectedOrder: null,
            showDetailModal: false,
        };
    },

    computed: {
        tableColumns() {
            return COLUMN_DEFINITIONS.map((column) => ({
                ...column,
                label: `${column.group} · ${column.label}`,
            }));
        },

        channels() {
            const dynamicChannels = this.orders
                .map((order) => this.getOrderDomain(order))
                .filter((channelId) => channelId !== '');

            const channelIds = [...new Set([...DEMO_CHANNELS, ...dynamicChannels])];

            return [
                { id: 'all', label: 'Alle Kanäle' },
                ...channelIds.map((channelId) => ({
                    id: channelId,
                    label: this.getChannelLabel(channelId),
                })),
            ];
        },

        activeChannelLabel() {
            return this.channels.find((channel) => channel.id === this.activeChannel)?.label || 'Alle Kanäle';
        },

        filteredOrders() {
            const searchTerm = String(this.tableSearchTerm || '').trim().toLowerCase();
            const activeFilters = Object.entries(this.columnFilters)
                .filter(([, filter]) => String(filter?.value || '').trim().length > 0);

            return this.orders.filter((order) => {
                if (!this.matchesActiveChannel(order)) {
                    return false;
                }

                if (searchTerm && !this.matchesSearch(order, searchTerm)) {
                    return false;
                }

                if (!activeFilters.length) {
                    return true;
                }

                return activeFilters.every(([column, filter]) => {
                    const value = this.getColumnValue(order, column);
                    return this.matchesColumnFilter(value, filter);
                });
            });
        },

        sortedOrders() {
            const direction = this.sortDirection === 'DESC' ? -1 : 1;
            return [...this.filteredOrders].sort((left, right) => {
                const leftValue = this.getComparableSortValue(this.getColumnValue(left, this.sortBy));
                const rightValue = this.getComparableSortValue(this.getColumnValue(right, this.sortBy));

                if (leftValue === rightValue) {
                    return 0;
                }

                return leftValue > rightValue ? direction : -direction;
            });
        },

        paginatedOrders() {
            const start = (this.page - 1) * this.limit;
            return this.sortedOrders.slice(start, start + this.limit);
        },

        paginationTotal() {
            return this.sortedOrders.length;
        },

        totalPages() {
            return Math.max(1, Math.ceil(this.paginationTotal / this.limit));
        },

        visiblePages() {
            const maxVisible = 5;
            if (this.totalPages <= maxVisible) {
                return Array.from({ length: this.totalPages }, (_, index) => index + 1);
            }

            const half = Math.floor(maxVisible / 2);
            let start = Math.max(1, this.page - half);
            let end = start + maxVisible - 1;

            if (end > this.totalPages) {
                end = this.totalPages;
                start = end - maxVisible + 1;
            }

            return Array.from({ length: end - start + 1 }, (_, index) => start + index);
        },
    },

    watch: {
        page(value) {
            if (value > this.totalPages) {
                this.page = this.totalPages;
            }
        },
    },

    created() {
        this.loadOrders();
        this.loadStatistics();
    },

    methods: {
        normalizeChannelId(value) {
            return String(value || '').trim().toLowerCase();
        },

        getOrderDomain(order) {
            return this.normalizeChannelId(order?.domain ?? order?.sourceSystem ?? order?.channel ?? '');
        },

        getChannelLabel(channelId) {
            const normalizedChannelId = this.normalizeChannelId(channelId);

            if (CHANNEL_LABELS[normalizedChannelId]) {
                return CHANNEL_LABELS[normalizedChannelId];
            }

            return normalizedChannelId
                .split('_')
                .filter((segment) => segment !== '')
                .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
                .join(' ');
        },

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

            const orders = result?.orders;
            if (Array.isArray(orders)) {
                return orders;
            }

            const rows = result?.data;
            if (Array.isArray(rows)) {
                return rows;
            }

            return [];
        },

        normalizeOrder(order) {
            const trackingNumbers = Array.isArray(order?.trackingNumbers)
                ? order.trackingNumbers.filter((trackingNumber) => String(trackingNumber || '').trim() !== '')
                : [];

            return {
                ...order,
                bestellnummer: order?.bestellnummer ?? order?.orderNumber ?? order?.orderId ?? '',
                san6: order?.san6 ?? order?.san6OrderNumber ?? order?.orderReference ?? order?.auftragNumber ?? '',
                status: order?.status ?? order?.statusLabel ?? order?.ordersStatusName ?? '',
                user: order?.user ?? order?.customerName ?? order?.customersName ?? '',
                sendenummer: order?.sendenummer ?? order?.trackingNumber ?? trackingNumbers.join(', '),
                domain: order?.domain ?? order?.sourceSystem ?? order?.channel ?? '',
                businessDate: order?.businessDate ?? order?.deliveryDateStart ?? order?.lieferstart ?? '',
                businessDateEnd: order?.businessDateEnd ?? order?.deliveryDateEnd ?? order?.lieferende ?? '',
                lieferterminLieferant: order?.lieferterminLieferant ?? order?.supplierDeliveryDate ?? '',
                neuerLiefertermin: order?.neuerLiefertermin ?? order?.newDeliveryDate ?? '',
                latestShippingDate: order?.latestShippingDate ?? order?.shippingDate ?? order?.shippingDateLatest ?? '',
                latestDeliveryDate: order?.latestDeliveryDate ?? order?.deliveryDate ?? order?.lieferterminLieferant ?? '',
            };
        },

        async fetchOrdersFallback(params) {
            const initContainer = Shopware.Application.getContainer('init');
            const httpClient = initContainer?.httpClient;
            const loginService = Shopware.Service('loginService');

            if (!httpClient || !loginService) {
                throw new Error('External orders service is unavailable.');
            }

            const response = await httpClient.get('_action/external-orders/list', {
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
                const result = this.externalOrderService
                    ? await this.externalOrderService.list(params)
                    : await this.fetchOrdersFallback(params);

                this.orders = this.extractOrders(result).map((order) => this.normalizeOrder(order));

                if (!this.channels.some((channel) => channel.id === this.activeChannel)) {
                    this.activeChannel = 'all';
                }

                this.page = 1;
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
            this.tableSearchTerm = '';
            this.columnFilters = createDefaultColumnFilters();
            this.activeColumnFilter = null;
            this.sortBy = 'latestShippingDate';
            this.sortDirection = 'DESC';
            this.page = 1;
            this.loadOrders();
        },

        onSearch() {
            this.page = 1;
        },

        onChannelChange(channelId) {
            this.activeChannel = this.normalizeChannelId(channelId) || 'all';
            this.page = 1;
        },

        onSortColumn(columnKey) {
            if (this.sortBy === columnKey) {
                this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
            } else {
                this.sortBy = columnKey;
                this.sortDirection = 'ASC';
            }
            this.page = 1;
        },

        getSortIndicator(columnKey) {
            if (this.sortBy !== columnKey) {
                return '↕';
            }
            return this.sortDirection === 'ASC' ? '↑' : '↓';
        },

        toggleColumnFilter(columnKey) {
            this.activeColumnFilter = this.activeColumnFilter === columnKey ? null : columnKey;
        },

        applyColumnFilter() {
            this.activeColumnFilter = null;
            this.page = 1;
        },

        clearColumnFilter(columnKey) {
            if (!this.columnFilters[columnKey]) {
                return;
            }

            this.columnFilters[columnKey] = {
                value: '',
                operator: 'contains',
            };

            this.activeColumnFilter = null;
            this.page = 1;
        },

        isColumnFilterActive(columnKey) {
            return Boolean(String(this.columnFilters[columnKey]?.value || '').trim());
        },

        matchesColumnFilter(value, filter) {
            const candidate = String(value ?? '').toLowerCase();
            const needle = String(filter?.value || '').toLowerCase();
            const operator = filter?.operator || 'contains';

            if (!needle) {
                return true;
            }

            if (operator === 'equals') {
                return candidate === needle;
            }

            if (operator === 'startsWith') {
                return candidate.startsWith(needle);
            }

            return candidate.includes(needle);
        },

        getColumnValue(order, column) {
            const mapping = {
                bestellnummer: order?.bestellnummer ?? order?.orderNumber,
                san6: order?.san6 ?? order?.san6OrderNumber,
                user: order?.user,
                domain: order?.domain ?? order?.sourceSystem,
                sendenummer: order?.sendenummer,
                businessDate: order?.businessDate ?? order?.deliveryDateStart,
                businessDateEnd: order?.businessDateEnd ?? order?.deliveryDateEnd,
                lieferterminLieferant: order?.lieferterminLieferant ?? order?.supplierDeliveryDate,
                neuerLiefertermin: order?.neuerLiefertermin ?? order?.newDeliveryDate,
                latestShippingDate: order?.latestShippingDate ?? order?.shippingDate,
                latestDeliveryDate: order?.latestDeliveryDate ?? order?.deliveryDate,
                status: order?.status,
            };

            return mapping[column] ?? '';
        },

        isDateColumn(columnKey) {
            return DATE_COLUMN_KEYS.includes(columnKey);
        },

        getComparableSortValue(value) {
            const normalized = String(value ?? '').trim();
            const timestamp = Date.parse(normalized);

            if (!Number.isNaN(timestamp) && /\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4}/.test(normalized)) {
                return timestamp;
            }

            return normalized.toLowerCase();
        },

        matchesSearch(order, searchTerm) {
            return this.tableColumns.some((column) => {
                const value = this.getColumnValue(order, column.key);
                return String(value ?? '').toLowerCase().includes(searchTerm);
            });
        },

        matchesActiveChannel(order) {
            if (this.activeChannel === 'all') {
                return true;
            }

            const channelValue = this.getOrderDomain(order);
            return channelValue === this.normalizeChannelId(this.activeChannel);
        },

        openDetail(order) {
            this.selectedOrder = order;
            this.showDetailModal = true;
        },

        closeDetail() {
            this.showDetailModal = false;
            this.selectedOrder = null;
        },

        goToFirstPage() {
            this.page = 1;
        },

        goToLastPage() {
            this.page = this.totalPages;
        },

        goToPreviousPage() {
            if (this.page > 1) {
                this.page -= 1;
            }
        },

        goToNextPage() {
            if (this.page < this.totalPages) {
                this.page += 1;
            }
        },

        goToPage(pageNumber) {
            this.page = Math.max(1, Math.min(this.totalPages, Number(pageNumber) || 1));
        },

        onLimitChange(value) {
            const nextLimit = Number(value);
            if (Number.isNaN(nextLimit) || nextLimit <= 0) {
                return;
            }

            this.limit = nextLimit;
            this.page = 1;
        },
    },
});
