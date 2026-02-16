import template from './external-orders-lieferzeit-empty.html.twig';
import './external-orders-lieferzeit-empty.scss';

const DEFAULT_STATISTICS_METRICS = Object.freeze({
    openOrders: 0,
    overdueShipping: 0,
    overdueDelivery: 0,
});

const COLUMN_KEYS = [
    'bestellnummer',
    'san6',
    'status',
    'user',
    'sendenummer',
    'domain',
    'latestShippingDate',
    'latestDeliveryDate',
];

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

const createDefaultColumnFilters = () => COLUMN_KEYS.reduce((filters, key) => {
    filters[key] = { value: '', operator: 'contains' };
    return filters;
}, {});

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
            pageTitle: 'Lieferzeiten',
            filters: createDefaultFilters(),
            orders: [],
            isLoading: false,
            loadError: null,
            statisticsMetrics: {
                ...DEFAULT_STATISTICS_METRICS,
            },
            channels: [
                { id: 'all', label: 'Alle Kanäle' },
                { id: 'shopware', label: 'Shopware' },
                { id: 'amazon', label: 'Amazon' },
                { id: 'ebay', label: 'eBay' },
            ],
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
            return [
                { key: 'bestellnummer', label: 'Bestellnummer' },
                { key: 'san6', label: 'SAN6' },
                { key: 'status', label: 'Status' },
                { key: 'user', label: 'User' },
                { key: 'sendenummer', label: 'Sendenummer' },
                { key: 'domain', label: 'Domain' },
                { key: 'latestShippingDate', label: 'Spätester Versand' },
                { key: 'latestDeliveryDate', label: 'Späteste Lieferung' },
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
            this.activeChannel = channelId;
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
                status: order?.status,
                user: order?.user,
                sendenummer: order?.sendenummer,
                domain: order?.domain ?? order?.sourceSystem,
                latestShippingDate: order?.latestShippingDate ?? order?.shippingDate,
                latestDeliveryDate: order?.latestDeliveryDate ?? order?.deliveryDate,
            };

            return mapping[column] ?? '';
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

            const channelValue = String(
                order?.domain
                ?? order?.sourceSystem
                ?? order?.channel
                ?? '',
            ).toLowerCase();

            return channelValue.includes(String(this.activeChannel).toLowerCase());
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
