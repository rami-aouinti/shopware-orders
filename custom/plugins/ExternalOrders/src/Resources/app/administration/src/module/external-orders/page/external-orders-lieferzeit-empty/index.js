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

const AREA_OPTIONS = Object.freeze([
    { value: 'order-monitoring', label: 'Auftragsmonitoring' },
    { value: 'delivery-monitoring', label: 'Liefermonitoring' },
]);

const MAIN_VIEW_OPTIONS = Object.freeze([
    { value: 'overview', label: 'Übersicht' },
    { value: 'details', label: 'Detailansicht' },
]);

export const tableColumnsMeta = Object.freeze([
    {
        key: 'bestellnummer',
        label: 'Bestellnummer',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'bestellnummer',
    },
    {
        key: 'san6',
        label: 'SAN6-Auftragsnummer',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'san6OrderNumber',
    },
    {
        key: 'san6Auftragsposition',
        label: 'San6 Auftragsposition',
        group: 'Bestellung',
        filterable: false,
        filterType: 'none',
    },
    {
        key: 'paymentMethod',
        label: 'Zahlungsart',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'paymentMethod',
    },
    {
        key: 'paymentReceivedDate',
        label: 'Datum Zahlungseingang',
        group: 'Bestellung',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'paymentReceivedDateFrom',
        filterToKey: 'paymentReceivedDateTo',
    },
    {
        key: 'customerFirstName',
        label: 'Vorname',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'customerFirstName',
    },
    {
        key: 'customerLastName',
        label: 'Nachname',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'customerLastName',
    },
    {
        key: 'customerAdditionalNames',
        label: 'Weitere Namen',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'customerAdditionalNames',
    },
    {
        key: 'user',
        label: 'Änderung durch User',
        group: 'Bestellung',
        filterable: true,
        filterType: 'text',
        filterKey: 'changedByUser',
    },
    {
        key: 'sendenummer',
        label: 'Sendungsnummer',
        group: 'Lieferung',
        filterable: true,
        filterType: 'text',
        filterKey: 'sendenummer',
    },
    {
        key: 'packageId',
        label: 'Paket-ID',
        group: 'Lieferung',
        filterable: true,
        filterType: 'text',
        filterKey: 'packageId',
    },
    {
        key: 'trackingNumberPerPackage',
        label: 'Trackingnummer pro Paket',
        group: 'Lieferung',
        filterable: true,
        filterType: 'text',
        filterKey: 'trackingNumberPerPackage',
    },
    {
        key: 'shippedQuantity',
        label: 'Versandmenge je Paket',
        group: 'Lieferung',
        filterable: true,
        filterType: 'text',
        filterKey: 'shippedQuantity',
    },
    {
        key: 'shippingDate',
        label: 'Versand-Datum',
        group: 'Lieferung',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'shippingDateFrom',
        filterToKey: 'shippingDateTo',
    },
    {
        key: 'deliveryDate',
        label: 'Liefer-Datum',
        group: 'Lieferung',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'deliveryDateFrom',
        filterToKey: 'deliveryDateTo',
    },
    {
        key: 'packageStatus',
        label: 'Paket-Status',
        group: 'Lieferung',
        filterable: true,
        filterType: 'text',
        filterKey: 'packageStatus',
    },
    {
        key: 'lieferterminLieferant',
        label: 'Liefertermin Lieferant',
        group: 'Lieferung',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'lieferterminLieferantFrom',
        filterToKey: 'lieferterminLieferantTo',
    },
    {
        key: 'neuerLiefertermin',
        label: 'Liefertermin Auftragsbearbeitung',
        group: 'Lieferung',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'lieferterminAuftragsbearbeitungFrom',
        filterToKey: 'lieferterminAuftragsbearbeitungTo',
    },
    {
        key: 'latestShippingDate',
        label: 'Spätester Versandzeitpunkt',
        group: 'Status',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'latestShippingDateFrom',
        filterToKey: 'latestShippingDateTo',
    },
    {
        key: 'latestDeliveryDate',
        label: 'Spätester Lieferzeitpunkt',
        group: 'Status',
        type: 'date',
        filterable: true,
        filterType: 'dateRange',
        filterFromKey: 'latestDeliveryDateFrom',
        filterToKey: 'latestDeliveryDateTo',
    },
    {
        key: 'status',
        label: 'Status',
        group: 'Status',
        filterable: true,
        filterType: 'select',
        filterKey: 'status',
    },
    {
        key: 'kommentar',
        label: 'Kommentar',
        group: 'Status',
        filterable: false,
        filterType: 'none',
    },
]);

const COLUMN_KEYS = tableColumnsMeta.map((column) => column.key);
const DATE_COLUMN_KEYS = tableColumnsMeta
    .filter((column) => column.type === 'date')
    .map((column) => column.key);

const FILTERABLE_COLUMNS = tableColumnsMeta.filter((column) => column.filterable);
const TOP_BAR_DATE_FILTER_KEYS = Object.freeze([
    'shippingDate',
    'latestDeliveryDate',
    'deliveryDate',
    'lieferterminLieferant',
    'neuerLiefertermin',
]);
const SUPPLIER_TASK_POLL_INTERVAL_MS = 15000;

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

const createDefaultFilters = () => FILTERABLE_COLUMNS.reduce((filters, column) => {
    if (column.filterType === 'dateRange') {
        filters[column.filterFromKey] = null;
        filters[column.filterToKey] = null;
        return filters;
    }

    if (column.filterType === 'text' || column.filterType === 'select') {
        filters[column.filterKey] = '';
    }

    return filters;
}, {});

const createDefaultColumnFilters = () => FILTERABLE_COLUMNS.reduce((filters, column) => {
    filters[column.key] = { value: '', operator: 'contains' };
    return filters;
}, {});

Shopware.Component.register('external-orders-lieferzeit-empty', {
    template,

    inject: ['externalOrderService'],
    mixins: [Shopware.Mixin.getByName('notification')],

    data() {
        return {
            pageTitle: 'Lieferzeiten',
            selectedArea: null,
            selectedMainView: null,
            areaOptions: AREA_OPTIONS,
            mainViewOptions: MAIN_VIEW_OPTIONS,
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
            pendingSupplierRequestKeys: {},
            supplierTaskPollingTimer: null,
            supplierTaskLastCompletedAt: null,
            notifiedSupplierTaskIds: {},
        };
    },

    computed: {
        tableColumns() {
            return tableColumnsMeta.map((column) => ({
                ...column,
                label: `${column.group} · ${column.label}`,
            }));
        },

        primaryFilters() {
            return FILTERABLE_COLUMNS.filter((column) => ['text', 'select'].includes(column.filterType));
        },

        dateRangeFilters() {
            return FILTERABLE_COLUMNS.filter((column) => (
                column.filterType === 'dateRange'
                && TOP_BAR_DATE_FILTER_KEYS.includes(column.key)
            ));
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

        hasRequiredSelections() {
            return Boolean(this.selectedArea && this.selectedMainView);
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
        this.startSupplierTaskCompletionPolling();
    },

    beforeDestroy() {
        this.stopSupplierTaskCompletionPolling();
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
            if (!this.hasRequiredSelections) {
                this.statisticsMetrics = { ...DEFAULT_STATISTICS_METRICS };
                return this.statisticsMetrics;
            }

            this.statisticsMetrics = { ...DEFAULT_STATISTICS_METRICS };

            return this.statisticsMetrics;
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

            const dateFilterKeys = new Set(
                FILTERABLE_COLUMNS
                    .filter((column) => column.filterType === 'dateRange')
                    .flatMap((column) => [column.filterFromKey, column.filterToKey]),
            );

            const params = Object.entries(this.filters).reduce((result, [key, value]) => {
                if (value === null || value === undefined) {
                    return result;
                }

                const normalizedValue = dateFilterKeys.has(key)
                    ? normalizeDateValue(value)
                    : (typeof value === 'string' ? value.trim() : value);

                if (normalizedValue === '') {
                    return result;
                }

                result[key] = normalizedValue;

                return result;
            }, {});

            if (this.selectedArea) {
                params.selectedArea = this.selectedArea;
            }

            if (this.selectedMainView) {
                params.selectedMainView = this.selectedMainView;
            }

            return params;
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

        normalizePackageStatus(rawStatus, packageCount, shippedQuantity, orderedQuantity) {
            const normalizedRawStatus = String(rawStatus || '').trim().toLowerCase();
            const statusByRawValue = {
                unklar: 'Unklar',
                unknown: 'Unklar',
                gesamt_versand: 'Gesamt-Versand',
                gesamtversand: 'Gesamt-Versand',
                full_shipment: 'Gesamt-Versand',
                teillieferung: 'Teillieferung',
                partial_shipment: 'Teillieferung',
                trennung_auftragsposition: 'Trennung Auftragsposition',
                split_position: 'Trennung Auftragsposition',
            };

            if (statusByRawValue[normalizedRawStatus]) {
                return statusByRawValue[normalizedRawStatus];
            }

            if (packageCount > 1) {
                return 'Trennung Auftragsposition';
            }

            if (orderedQuantity > 0 && shippedQuantity >= orderedQuantity) {
                return 'Gesamt-Versand';
            }

            if (shippedQuantity > 0) {
                return 'Teillieferung';
            }

            return 'Unklar';
        },

        expandOrdersByPosition(orders) {
            return orders.flatMap((order) => {
                const orderId = order?.id || order?.orderId || order?.orderNumber || 'order';
                const positions = Array.isArray(order?.positions)
                    ? order.positions
                    : (Array.isArray(order?.items) ? order.items : []);

                if (!positions.length) {
                    return [{
                        ...order,
                        rowId: `${orderId}-order`,
                        rowType: 'order',
                        positionId: '',
                        positionNumber: '',
                        packageId: '',
                        trackingNumberPerPackage: '',
                        shippedQuantity: '',
                        packageStatus: '',
                    }];
                }

                return positions.flatMap((position, positionIndex) => {
                    const positionId = position?.positionId ?? position?.id ?? `${positionIndex + 1}`;
                    const positionPackages = Array.isArray(position?.packages)
                        ? position.packages
                        : (Array.isArray(position?.packageItems) ? position.packageItems : []);
                    const orderedQuantity = Number(position?.orderedQuantity ?? position?.quantity ?? 0);

                    const positionRow = {
                        ...order,
                        rowId: `${orderId}-${positionId}-position`,
                        rowType: 'position',
                        positionId,
                        positionNumber: position?.positionNumber ?? `${positionIndex + 1}`,
                        productLabel: position?.productLabel ?? position?.label ?? position?.name ?? '',
                        lieferterminLieferant: position?.lieferterminLieferant ?? order?.lieferterminLieferant,
                        shippingDate: position?.shippingDate ?? order?.shippingDate ?? '',
                        deliveryDate: position?.deliveryDate ?? order?.deliveryDate ?? '',
                        packageId: '',
                        trackingNumberPerPackage: '',
                        shippedQuantity: '',
                        packageStatus: '',
                    };

                    if (!positionPackages.length) {
                        return [positionRow];
                    }

                    const packageRows = positionPackages.map((pkg, packageIndex) => {
                        const packageId = pkg?.packageId ?? pkg?.id ?? pkg?.packageNumber ?? `PKG-${packageIndex + 1}`;
                        const shippedQuantity = Number(pkg?.shippedQuantity ?? pkg?.quantity ?? 0);
                        const packageTrackingNumber = pkg?.trackingNumberPerPackage
                            ?? pkg?.trackingNumber
                            ?? pkg?.trackingCode
                            ?? '';

                        return {
                            ...order,
                            rowId: `${orderId}-${positionId}-${packageId}`,
                            rowType: 'package',
                            positionId,
                            positionNumber: position?.positionNumber ?? `${positionIndex + 1}`,
                            productLabel: position?.productLabel ?? position?.label ?? position?.name ?? '',
                            lieferterminLieferant: position?.lieferterminLieferant ?? order?.lieferterminLieferant,
                            packageId,
                            trackingNumberPerPackage: packageTrackingNumber,
                            shippedQuantity,
                            packageStatus: this.normalizePackageStatus(
                                pkg?.packageStatus ?? pkg?.status,
                                positionPackages.length,
                                shippedQuantity,
                                orderedQuantity,
                            ),
                            shippingDate: pkg?.shippingDate ?? pkg?.versandDatum ?? position?.shippingDate ?? order?.shippingDate ?? '',
                            deliveryDate: pkg?.deliveryDate ?? pkg?.lieferDatum ?? position?.deliveryDate ?? order?.deliveryDate ?? '',
                        };
                    });

                    return [positionRow, ...packageRows];
                });
            });
        },

        normalizeOrder(order) {
            const trackingNumbers = Array.isArray(order?.trackingNumbers)
                ? order.trackingNumbers.filter((trackingNumber) => String(trackingNumber || '').trim() !== '')
                : [];

            const canonicalSan6OrderNumber = String(
                order?.san6OrderNumber
                ?? order?.san6
                ?? order?.orderReference
                ?? order?.auftragNumber
                ?? '',
            ).trim();

            const normalizedBusinessStatus = normalizeBusinessStatus(
                order?.statusCode
                ?? order?.status
                ?? order?.statusLabel
                ?? order?.ordersStatusName
                ?? order?.aggregatedStatus
            );
            const customer = order?.customer ?? {};
            const payment = order?.payment ?? {};

            return {
                ...order,
                bestellnummer: order?.bestellnummer ?? order?.orderNumber ?? order?.orderId ?? '',
                san6: canonicalSan6OrderNumber,
                san6OrderNumber: canonicalSan6OrderNumber,
                status: normalizedBusinessStatus.label,
                statusCode: normalizedBusinessStatus.code,
                changedByUser: order?.changedByUser ?? order?.user ?? order?.customerName ?? order?.customersName ?? '',
                user: order?.user ?? order?.customerName ?? order?.customersName ?? '',
                sendenummer: order?.sendenummer ?? order?.trackingNumber ?? trackingNumbers.join(', '),
                domain: order?.domain ?? order?.sourceSystem ?? order?.channel ?? '',
                paymentMethod: order?.paymentMethod ?? payment?.method ?? payment?.name ?? '',
                paymentReceivedDate: order?.paymentReceivedDate ?? order?.zahlungseingangDate ?? payment?.receivedDate ?? payment?.paidAt ?? '',
                customerFirstName: order?.customerFirstName ?? customer?.firstName ?? order?.firstname ?? '',
                customerLastName: order?.customerLastName ?? customer?.lastName ?? order?.lastname ?? '',
                customerAdditionalNames: order?.customerAdditionalNames ?? customer?.additionalName ?? customer?.middleName ?? '',
                shippingDate: order?.shippingDate ?? order?.versandDatum ?? order?.shippingAt ?? '',
                deliveryDate: order?.deliveryDate ?? order?.lieferDatum ?? order?.deliveredAt ?? '',
                lieferterminLieferant: order?.lieferterminLieferant ?? order?.supplierDeliveryDate ?? '',
                lieferterminAuftragsbearbeitung: order?.lieferterminAuftragsbearbeitung ?? order?.neuerLiefertermin ?? order?.newDeliveryDate ?? '',
                neuerLiefertermin: order?.neuerLiefertermin ?? order?.newDeliveryDate ?? order?.lieferterminAuftragsbearbeitung ?? '',
                latestShippingDate: order?.latestShippingDate ?? order?.shippingDateLatest ?? '',
                latestDeliveryDate: order?.latestDeliveryDate ?? order?.lieferzeitpunktLatest ?? order?.lieferterminLieferant ?? '',
                packageId: order?.packageId ?? '',
                packageStatus: order?.packageStatus ?? '',
                shippedQuantity: order?.shippedQuantity ?? '',
                trackingNumberPerPackage: order?.trackingNumberPerPackage ?? '',
                positionId: order?.positionId ?? order?.orderLineItemId ?? order?.lineItemId ?? '',
                positionNumber: order?.positionNumber ?? order?.lineItemNumber ?? '',
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
            if (!this.hasRequiredSelections) {
                this.orders = [];
                this.statisticsMetrics = { ...DEFAULT_STATISTICS_METRICS };
                this.loadError = null;
                this.isLoading = false;
                return;
            }

            this.isLoading = true;
            this.loadError = null;

            try {
                const params = {
                    ...this.buildFilterParams(),
                    selectedArea: this.selectedArea,
                    selectedMainView: this.selectedMainView,
                };
                const result = this.externalOrderService
                    ? await this.externalOrderService.list(params)
                    : await this.fetchOrdersFallback(params);

                const normalizedOrders = this.extractOrders(result).map((order) => this.normalizeOrder(order));
                this.orders = this.expandOrdersByPosition(normalizedOrders);

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

        applyEntrySelection() {
            this.page = 1;
            this.loadOrders();
            this.loadStatistics();
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
            const column = this.tableColumns.find((candidate) => candidate.key === columnKey);
            if (!column?.filterable) {
                return;
            }
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
                san6Auftragsposition: order?.san6Auftragsposition ?? order?.positionNumber ?? order?.positionId,
                paymentMethod: order?.paymentMethod,
                paymentReceivedDate: order?.paymentReceivedDate,
                customerFirstName: order?.customerFirstName,
                customerLastName: order?.customerLastName,
                customerAdditionalNames: order?.customerAdditionalNames,
                user: order?.user,
                sendenummer: order?.sendenummer,
                packageId: order?.packageId,
                trackingNumberPerPackage: order?.trackingNumberPerPackage,
                shippedQuantity: order?.shippedQuantity,
                shippingDate: order?.shippingDate,
                deliveryDate: order?.deliveryDate,
                packageStatus: order?.packageStatus,
                lieferterminLieferant: order?.lieferterminLieferant ?? order?.supplierDeliveryDate,
                neuerLiefertermin: order?.neuerLiefertermin ?? order?.newDeliveryDate,
                latestShippingDate: order?.latestShippingDate,
                latestDeliveryDate: order?.latestDeliveryDate,
                status: order?.status,
                kommentar: order?.kommentar ?? order?.comment,
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

        getRowKey(order) {
            return order?.rowId || order?.id || order?.orderNumber;
        },

        isSupplierRequestPending(order) {
            return Boolean(this.pendingSupplierRequestKeys[this.getRowKey(order)]);
        },

        resolveInitiatorUserId() {
            return Shopware.State.get('session')?.currentUser?.id || null;
        },

        async requestAdditionalSupplierDeliveryDate(order) {
            const key = this.getRowKey(order);

            if (!order?.id || !order?.positionId || this.pendingSupplierRequestKeys[key]) {
                this.createNotificationError({
                    title: 'Zusätzliche Liefertermin-Anfrage',
                    message: 'Auftrag oder Auftragsposition fehlen für die Anfrage.',
                });
                return;
            }

            this.pendingSupplierRequestKeys = {
                ...this.pendingSupplierRequestKeys,
                [key]: true,
            };

            try {
                await this.externalOrderService.createSupplierRequestTask({
                    orderId: order.id,
                    positionId: order.positionId,
                    initiatorUserId: this.resolveInitiatorUserId(),
                    correlationId: this.createSupplierTaskCorrelationId(order),
                });

                this.createNotificationSuccess({
                    title: 'Zusätzliche Liefertermin-Anfrage',
                    message: 'Die Anfrage wurde erfolgreich erstellt.',
                });
            } catch (error) {
                this.createNotificationError({
                    title: 'Zusätzliche Liefertermin-Anfrage',
                    message: error?.response?.data?.message || error?.message || 'Die Anfrage konnte nicht erstellt werden.',
                });
            } finally {
                const pendingSupplierRequestKeys = { ...this.pendingSupplierRequestKeys };
                delete pendingSupplierRequestKeys[key];
                this.pendingSupplierRequestKeys = pendingSupplierRequestKeys;
            }
        },



        createSupplierTaskCorrelationId(order) {
            const orderId = String(order?.id ?? order?.orderId ?? 'unknown-order');
            const positionId = String(order?.positionId ?? 'unknown-position');

            return `${orderId}:${positionId}:${Date.now()}`;
        },

        startSupplierTaskCompletionPolling() {
            if (this.supplierTaskPollingTimer) {
                return;
            }

            this.pollSupplierTaskCompletions();
            this.supplierTaskPollingTimer = window.setInterval(() => {
                this.pollSupplierTaskCompletions();
            }, SUPPLIER_TASK_POLL_INTERVAL_MS);
        },

        stopSupplierTaskCompletionPolling() {
            if (!this.supplierTaskPollingTimer) {
                return;
            }

            window.clearInterval(this.supplierTaskPollingTimer);
            this.supplierTaskPollingTimer = null;
        },

        async pollSupplierTaskCompletions() {
            const initiatorUserId = this.resolveInitiatorUserId();

            if (!initiatorUserId || !this.externalOrderService) {
                return;
            }

            try {
                const response = await this.externalOrderService.getCompletedSupplierRequestTasks({
                    initiatorUserId,
                    completedSince: this.supplierTaskLastCompletedAt,
                    limit: 20,
                });

                const tasks = Array.isArray(response?.tasks) ? response.tasks : [];

                tasks.forEach((task) => {
                    const taskId = String(task?.taskId || '');

                    if (!taskId || this.notifiedSupplierTaskIds[taskId]) {
                        return;
                    }

                    this.notifySupplierTaskCompletion(task);
                    this.notifiedSupplierTaskIds = {
                        ...this.notifiedSupplierTaskIds,
                        [taskId]: true,
                    };
                });

                const lastTask = tasks[tasks.length - 1] ?? null;
                const lastCompletedAt = String(lastTask?.completedAt || '');

                if (lastCompletedAt) {
                    this.supplierTaskLastCompletedAt = lastCompletedAt;
                }
            } catch (error) {
                // polling intentionally tolerant to temporary failures
            }
        },

        buildSupplierPositionLink(task) {
            const orderId = String(task?.orderId || '');
            const positionId = String(task?.positionId || '');

            if (!orderId || !positionId) {
                return '/admin#/external/orders/lieferzeit';
            }

            return `/admin#/external/orders/lieferzeit?orderId=${encodeURIComponent(orderId)}&positionId=${encodeURIComponent(positionId)}`;
        },

        notifySupplierTaskCompletion(task) {
            const orderId = String(task?.orderId || '-');
            const positionId = String(task?.positionId || '-');
            const directLink = this.buildSupplierPositionLink(task);

            this.createNotificationSuccess({
                title: 'Zusätzliche Liefertermin-Anfrage abgeschlossen',
                message: `Auftrag ${orderId}, Position ${positionId} wurde abgeschlossen. Öffnen: ${directLink}`,
            });
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
