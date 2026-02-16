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
    { key: 'user', label: 'Änderung durch User', group: 'Bestellung' },
    { key: 'sendenummer', label: 'Sendungsnummer', group: 'Lieferung' },
    { key: 'shippingDate', label: 'Versand-Datum', group: 'Lieferung', type: 'date' },
    { key: 'deliveryDate', label: 'Liefer-Datum', group: 'Lieferung', type: 'date' },
    { key: 'lieferterminLieferant', label: 'Liefertermin Lieferant', group: 'Lieferung', type: 'date' },
    { key: 'neuerLiefertermin', label: 'Liefertermin Auftragsbearbeitung', group: 'Lieferung', type: 'date' },
    { key: 'latestShippingDate', label: 'Spätester Versandzeitpunkt', group: 'Status', type: 'date' },
    { key: 'latestDeliveryDate', label: 'Spätester Lieferzeitpunkt', group: 'Status', type: 'date' },
    { key: 'status', label: 'Status', group: 'Status' },
]);

const COLUMN_KEYS = COLUMN_DEFINITIONS.map((column) => column.key);
const DATE_COLUMN_KEYS = COLUMN_DEFINITIONS
    .filter((column) => column.type === 'date')
    .map((column) => column.key);

const BUSINESS_STATUS_LABELS = Object.freeze({
    processing: 'Bezahlt / in Bearbeitung',
    shipped: 'Versendet',
    completed: 'Bestellung abgeschlossen',
    cancelled: 'Stornierung abgeschlossen',
    test: 'Test',
});

const STATUS_SOURCE_TO_BUSINESS_STATUS = Object.freeze({
    open: 'processing',
    in_progress: 'processing',
    paid: 'processing',
    partially_shipped: 'shipped',
    shipped: 'shipped',
    completed: 'completed',
    done: 'completed',
    cancelled: 'cancelled',
    versendet: 'shipped',
    versandbereit: 'processing',
    bestellung_abgeschlossen: 'completed',
    bezahlt: 'processing',
    in_transit: 'shipped',
    out_for_delivery: 'shipped',
    delivered: 'completed',
    test: 'test',
});

function normalizeBusinessStatus(statusValue) {
    const normalizedSourceStatus = String(statusValue ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

    if (!normalizedSourceStatus) {
        return { code: 'processing', label: BUSINESS_STATUS_LABELS.processing };
    }

    const businessStatus = STATUS_SOURCE_TO_BUSINESS_STATUS[normalizedSourceStatus] ?? null;

    if (!businessStatus) {
        return { code: 'processing', label: BUSINESS_STATUS_LABELS.processing };
    }

    return {
        code: businessStatus,
        label: BUSINESS_STATUS_LABELS[businessStatus] ?? BUSINESS_STATUS_LABELS.processing,
    };
}

const createDefaultFilters = () => ({
    bestellnummer: '',
    san6OrderNumber: '',
    changedByUser: '',
    domain: '',
    sendenummer: '',
    status: '',
    latestShippingDateFrom: null,
    latestShippingDateTo: null,
    shippingDateFrom: null,
    shippingDateTo: null,
    latestDeliveryDateFrom: null,
    latestDeliveryDateTo: null,
    deliveryDateFrom: null,
    deliveryDateTo: null,
    lieferterminLieferantFrom: null,
    lieferterminLieferantTo: null,
    lieferterminAuftragsbearbeitungFrom: null,
    lieferterminAuftragsbearbeitungTo: null,
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
            statusFilterOptions: [
                { value: '', label: 'Alle Status' },
                { value: 'processing', label: BUSINESS_STATUS_LABELS.processing },
                { value: 'shipped', label: BUSINESS_STATUS_LABELS.shipped },
                { value: 'completed', label: BUSINESS_STATUS_LABELS.completed },
                { value: 'cancelled', label: BUSINESS_STATUS_LABELS.cancelled },
                { value: 'test', label: BUSINESS_STATUS_LABELS.test },
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
            const normalizeDateValue = (value) => {
                if (!value) {
                    return null;
                }

                if (value instanceof Date) {
                    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
                }

                const normalizedDate = new Date(value);
                if (!Number.isNaN(normalizedDate.getTime())) {
                    return normalizedDate.toISOString().slice(0, 10);
                }

                const rawValue = String(value).trim();
                if (!rawValue) {
                    return null;
                }

                const match = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
                return match ? match[1] : rawValue;
            };

            const dateFilterKeys = new Set([
                'latestShippingDateFrom',
                'latestShippingDateTo',
                'shippingDateFrom',
                'shippingDateTo',
                'latestDeliveryDateFrom',
                'latestDeliveryDateTo',
                'deliveryDateFrom',
                'deliveryDateTo',
                'lieferterminLieferantFrom',
                'lieferterminLieferantTo',
                'lieferterminAuftragsbearbeitungFrom',
                'lieferterminAuftragsbearbeitungTo',
            ]);

            return Object.entries(this.filters).reduce((params, [key, value]) => {
                if (value === null || value === undefined) {
                    return params;
                }

                const normalizedValue = dateFilterKeys.has(key)
                    ? normalizeDateValue(value)
                    : (typeof value === 'string' ? value.trim() : value);

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
            const normalizedBusinessStatus = normalizeBusinessStatus(
                order?.status
                ?? order?.statusLabel
                ?? order?.ordersStatusName
                ?? order?.aggregatedStatus
            );

            return {
                ...order,
                bestellnummer: order?.bestellnummer ?? order?.orderNumber ?? order?.orderId ?? '',
                san6OrderNumber: order?.san6OrderNumber ?? order?.san6 ?? order?.orderReference ?? order?.auftragNumber ?? '',
                san6: order?.san6 ?? order?.san6OrderNumber ?? order?.orderReference ?? order?.auftragNumber ?? '',
                status: normalizedBusinessStatus.label,
                statusCode: normalizedBusinessStatus.code,
                changedByUser: order?.changedByUser ?? order?.user ?? order?.customerName ?? order?.customersName ?? '',
                user: order?.user ?? order?.customerName ?? order?.customersName ?? '',
                sendenummer: order?.sendenummer ?? order?.trackingNumber ?? trackingNumbers.join(', '),
                domain: order?.domain ?? order?.sourceSystem ?? order?.channel ?? '',
                shippingDate: order?.shippingDate ?? order?.versandDatum ?? order?.shippingAt ?? '',
                deliveryDate: order?.deliveryDate ?? order?.lieferDatum ?? order?.deliveredAt ?? '',
                lieferterminLieferant: order?.lieferterminLieferant ?? order?.supplierDeliveryDate ?? '',
                lieferterminAuftragsbearbeitung: order?.lieferterminAuftragsbearbeitung ?? order?.neuerLiefertermin ?? order?.newDeliveryDate ?? '',
                neuerLiefertermin: order?.neuerLiefertermin ?? order?.newDeliveryDate ?? order?.lieferterminAuftragsbearbeitung ?? '',
                latestShippingDate: order?.latestShippingDate ?? order?.shippingDateLatest ?? '',
                latestDeliveryDate: order?.latestDeliveryDate ?? order?.lieferzeitpunktLatest ?? order?.lieferterminLieferant ?? '',
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
                sendenummer: order?.sendenummer,
                shippingDate: order?.shippingDate,
                deliveryDate: order?.deliveryDate,
                lieferterminLieferant: order?.lieferterminLieferant ?? order?.supplierDeliveryDate,
                neuerLiefertermin: order?.neuerLiefertermin ?? order?.newDeliveryDate,
                latestShippingDate: order?.latestShippingDate,
                latestDeliveryDate: order?.latestDeliveryDate,
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
