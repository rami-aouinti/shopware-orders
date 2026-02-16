import template from './external-orders-list.html.twig';
import './external-orders-list.scss';

const { Component, Mixin } = Shopware;

function createInlineChannelLogo(shortLabel, backgroundColor) {
    const escapedLabel = String(shortLabel ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedColor = String(backgroundColor ?? '#166b73').replace(/"/g, '');

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${escapedLabel}">
            <rect x="0" y="0" width="64" height="64" rx="12" fill="${escapedColor}" />
            <text
                x="32"
                y="37"
                text-anchor="middle"
                font-family="Arial, Helvetica, sans-serif"
                font-size="20"
                font-weight="700"
                fill="#ffffff"
            >${escapedLabel}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

Component.register('external-orders-list', {
    template,

    inject: ['externalOrderService', 'systemConfigApiService'],

    mixins: [
        Mixin.getByName('notification'),
    ],

    data() {
        return {
            isLoading: false,
            isSeedingTestData: false,
            pageTitle: 'Bestellübersichten',
            orders: [],
            summary: {
                orderCount: 0,
                totalRevenue: 0,
                totalItems: 0,
                openOrdersTotal: 0,
                overdueShippingTotal: 0,
                overdueDeliveriesCompletedTotal: 0,
            },
            selectedArea: null,
            selectedMainView: 'allOrders',
            areaOptions: [
                { value: 'first-medical-ecommerce', label: 'first-medical-ecommerce' },
                { value: 'medical-solutions', label: 'medical-solutions' },
            ],
            mainViewOptions: [
                { value: 'allOrders', label: 'alle Bestellungen' },
                { value: 'openOrders', label: 'offene Bestellungen (noch nicht beim Kunde angekommen)' },
            ],
            channelSources: {},
            channels: [
                {
                    id: 'all',
                    label: 'All',
                    logo: createInlineChannelLogo('ALL', '#525F7F'),
                },
                {
                    id: 'b2b',
                    label: 'First-medical-shop.de',
                    logo: createInlineChannelLogo('B2B', '#0B7F8A'),
                },
                {
                    id: 'ebay_de',
                    label: 'Ebay.DE',
                    logo: createInlineChannelLogo('EB', '#2F4F8F'),
                },
                {
                    id: 'kaufland',
                    label: 'KaufLand',
                    logo: createInlineChannelLogo('KL', '#D04444'),
                },
                {
                    id: 'ebay_at',
                    label: 'Ebay.AT',
                    logo: createInlineChannelLogo('AT', '#6B4FD3'),
                },
                {
                    id: 'zonami',
                    label: 'Zonami',
                    logo: createInlineChannelLogo('ZO', '#21936B'),
                },
                {
                    id: 'peg',
                    label: 'PEG',
                    logo: createInlineChannelLogo('PG', '#2B6EA0'),
                },
                {
                    id: 'bezb',
                    label: 'BEZB',
                    logo: createInlineChannelLogo('BZ', '#6A7A1F'),
                },
            ],
            activeChannel: 'all',
            tableSearchTerm: '',
            columnFilterMatchMode: 'all',
            columnFilterMatchOptions: [
                { value: 'all', label: 'Match All' },
            ],
            columnFilterOperatorOptions: [
                { value: 'startsWith', label: 'Starts with' },
                { value: 'contains', label: 'Contains' },
                { value: 'equals', label: 'Equals' },
            ],
            columnFilters: {
                orderNumber: { value: '', operator: 'startsWith' },
                customerName: { value: '', operator: 'startsWith' },
                orderReference: { value: '', operator: 'startsWith' },
                email: { value: '', operator: 'startsWith' },
                date: { value: '', operator: 'startsWith' },
                statusLabel: { value: '', operator: 'startsWith' },
            },
            activeColumnFilter: null,
            selectedOrder: null,
            selectedOrders: [],
            showDetailModal: false,
            showTestMarkingModal: false,
            dateFilters: {
                start: null,
                end: null,
            },
            page: 1,
            limit: 10,
            limitOptions: [10, 25, 50, 100],
            sortBy: 'date',
            sortDirection: 'DESC',
        };
    },

    computed: {
        columns() {
            return [
                {
                    property: 'order-number',
                    dataIndex: 'orderNumber',
                    sortBy: 'orderNumber',
                    label: 'BestellNr',
                    sortable: true,
                    primary: true,
                    allowResize: true,
                },
                {
                    property: 'customer-name',
                    dataIndex: 'customerName',
                    sortBy: 'customerName',
                    label: 'Kundenname',
                    sortable: true,
                    allowResize: true,
                },
                {
                    property: 'order-reference',
                    dataIndex: 'orderReference',
                    sortBy: 'orderReference',
                    label: 'AuftragsNr',
                    sortable: true,
                    allowResize: true,
                },
                {
                    property: 'email',
                    dataIndex: 'email',
                    sortBy: 'email',
                    label: 'Email',
                    sortable: true,
                    allowResize: true,
                },
                {
                    property: 'date',
                    dataIndex: 'date',
                    sortBy: 'date',
                    label: 'Datum',
                    sortable: true,
                    allowResize: true,
                },
                {
                    property: 'status-label',
                    dataIndex: 'statusLabel',
                    sortBy: 'statusLabel',
                    label: 'Bestellstatus',
                    sortable: true,
                    allowResize: true,
                },
                { property: 'actions', label: 'Ansicht', sortable: false, width: '90px' },
            ];
        },
        activeChannelLabel() {
            return this.channels.find((channel) => channel.id === this.activeChannel)?.label || '';
        },
        activeChannelSource() {
            return this.channelSources[this.activeChannel] || '';
        },
        filteredOrders() {
            const searchTerm = this.tableSearchTerm.trim().toLowerCase();
            const channelOrders = this.orders.filter((order) => {
                if (!order.channel) {
                    return true;
                }
                return order.channel === this.activeChannel;
            });

            const channelFilter = this.activeChannel === 'all' ? null : this.activeChannel;
            const filtered = this.orders.filter((order) => {
                if (!channelFilter) {
                    return true;
                }

                const channelValue = order.channel
                    ?? order.channelId
                    ?? order.salesChannelId
                    ?? order.salesChannel;

                return String(channelValue ?? '').toLowerCase() === channelFilter;
            });

            const columnFiltered = this.applyColumnFilters(filtered);
            const dateFiltered = this.applyDateFilters(columnFiltered);

            if (!searchTerm) {
                return dateFiltered;
            }

            return dateFiltered.filter((order) => {
                const values = [
                    order.orderNumber,
                    order.customerName,
                    order.orderReference,
                    order.email,
                    order.statusLabel,
                    order.date,
                ];

                return values.some((value) => String(value ?? '').toLowerCase().includes(searchTerm));
            });
        },
        sortedOrders() {
            const sortBy = this.sortBy;
            const direction = this.sortDirection === 'DESC' ? -1 : 1;

            return [...this.filteredOrders].sort((left, right) => {
                const leftValue = this.getSortValue(left, sortBy);
                const rightValue = this.getSortValue(right, sortBy);

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
            if (this.limit <= 0) {
                return 1;
            }
            return Math.max(1, Math.ceil(this.paginationTotal / this.limit));
        },
        visiblePages() {
            const maxVisible = 5;
            const total = this.totalPages;
            const current = this.page;

            if (total <= maxVisible) {
                return Array.from({ length: total }, (_, index) => index + 1);
            }

            const half = Math.floor(maxVisible / 2);
            let start = Math.max(1, current - half);
            let end = start + maxVisible - 1;

            if (end > total) {
                end = total;
                start = end - maxVisible + 1;
            }

            return Array.from({ length: end - start + 1 }, (_, index) => start + index);
        },
        isAllSelected() {
            if (this.paginatedOrders.length === 0) {
                return false;
            }
            return this.paginatedOrders.every((order) => this.isOrderSelected(order));
        },
        hasSelectedOrders() {
            return this.selectedOrders.length > 0;
        },
        testMarkingOrders() {
            return this.selectedOrders;
        },
        existingTestOrders() {
            const selectedKeys = new Set(this.selectedOrders.map((order) => this.getOrderKey(order)));
            return this.filteredOrders.filter((order) => this.isTestOrder(order) && !selectedKeys.has(this.getOrderKey(order)));
        },
        deliveryRows() {
            const order = this.selectedOrder ?? {};
            const orderId = order?.id ?? order?.orderNumber ?? 'order';

            return this.buildDeliveryRows(order?.items ?? [], orderId);
        },
    },

    watch: {
        tableSearchTerm() {
            this.page = 1;
        },
        activeChannel() {
            this.page = 1;
        },
        columnFilterMatchMode() {
            this.page = 1;
        },
        columnFilters: {
            handler() {
                this.page = 1;
            },
            deep: true,
        },
        selectedArea() {
            this.loadOrders();
        },
        selectedMainView() {
            this.loadOrders();
        },
    },

    created() {
        this.initializePage();
    },

    methods: {
        async initializePage() {
            await this.loadOverviewConfiguration();
            if (this.selectedArea) {
                await this.loadOrders();
            }
        },
        async loadOverviewConfiguration() {
            try {
                const config = await this.systemConfigApiService.getValues('ExternalOrders');
                const getConfigValue = (key) => config?.[`ExternalOrders.config.${key}`] ?? '';

                const configuredTitle = String(getConfigValue('externalOrdersPageTitle') || '').trim();
                if (configuredTitle) {
                    this.pageTitle = configuredTitle;
                }

                const configuredPerPage = Number(getConfigValue('externalOrdersPerPage'));
                const resolvedPerPage = !Number.isNaN(configuredPerPage) && configuredPerPage > 0
                    ? configuredPerPage
                    : 10;

                this.limit = resolvedPerPage;
                this.limitOptions = Array.from(new Set([...this.limitOptions, resolvedPerPage])).sort((left, right) => left - right);

                this.channelSources = {
                    all: 'Alle External Orders',
                    b2b: getConfigValue('externalOrdersApiUrlB2b'),
                    ebay_de: getConfigValue('externalOrdersApiUrlEbayDe'),
                    kaufland: getConfigValue('externalOrdersApiUrlKaufland'),
                    ebay_at: getConfigValue('externalOrdersApiUrlEbayAt'),
                    zonami: getConfigValue('externalOrdersApiUrlZonami'),
                    peg: getConfigValue('externalOrdersApiUrlPeg'),
                    bezb: getConfigValue('externalOrdersApiUrlBezb'),
                };

            } catch (error) {
                this.channelSources = {};
                this.createNotificationWarning({
                    title: 'Konfiguration konnte nicht geladen werden',
                    message: error?.message || 'Die Quellen der Übersichten konnten nicht geladen werden.',
                });
            }
        },
        async loadOrders() {
            if (!this.selectedArea) {
                this.orders = [];
                this.summary = this.getEmptySummary();
                return;
            }

            this.isLoading = true;
            this.page = 1;

            try {
                const channelsForAllOverview = this.channels
                    .map((channel) => channel.id)
                    .filter((channelId) => channelId !== 'all');

                let apiOrders = [];

                if (this.activeChannel === 'all') {
                    const responses = await Promise.all(
                        channelsForAllOverview.map((channelId) => this.externalOrderService.list({
                            channel: channelId,
                            selectedArea: this.selectedArea,
                            selectedMainView: this.selectedMainView,
                        })),
                    );

                    const mergedOrders = responses.flatMap((response) => {
                        const payload = response?.data?.data ?? response?.data ?? response;
                        return Array.isArray(payload?.orders) ? payload.orders : [];
                    });

                    apiOrders = Array.from(new Map(
                        mergedOrders.map((order) => [this.getOrderKey(order), order]),
                    ).values());
                } else {
                    const response = await this.externalOrderService.list({
                        channel: this.activeChannel,
                        selectedArea: this.selectedArea,
                        selectedMainView: this.selectedMainView,
                    });
                    const payload = response?.data?.data ?? response?.data ?? response;
                    apiOrders = Array.isArray(payload?.orders) ? payload.orders : [];

                    this.summary = this.resolveSummaryFromPayload(payload, apiOrders);
                }

                this.orders = apiOrders;
                this.page = 1;
                if (this.activeChannel === 'all') {
                    this.summary = this.buildSummaryFromOrders(apiOrders);
                }
            } catch (error) {
                this.orders = [];
                this.summary = this.getEmptySummary();
                this.createNotificationError({
                    title: 'Bestellungen konnten nicht geladen werden',
                    message: error?.message || 'Bitte prüfen Sie die Verbindung zu den externen APIs.',
                });
            } finally {
                this.isLoading = false;
            }
        },
        onPageChange(payload) {
            if (typeof payload === 'number') {
                this.page = payload;
                return;
            }

            const { page, limit } = payload ?? {};
            const nextPage = typeof page === 'number' ? page : this.page;
            const nextLimit = typeof limit === 'number' ? limit : this.limit;

            this.page = nextPage;
            this.limit = nextLimit;
        },
        goToPreviousPage() {
            if (this.page <= 1) {
                return;
            }
            this.page -= 1;
        },
        goToFirstPage() {
            this.page = 1;
        },
        goToLastPage() {
            this.page = this.totalPages;
        },
        goToPage(pageNumber) {
            if (typeof pageNumber !== 'number') {
                return;
            }
            const nextPage = Math.max(1, Math.min(this.totalPages, pageNumber));
            this.page = nextPage;
        },
        goToNextPage() {
            if (this.page >= this.totalPages) {
                return;
            }
            this.page += 1;
        },
        onLimitChange(value) {
            const nextLimit = Number(this.normalizeSelectValue(value));
            if (Number.isNaN(nextLimit) || nextLimit <= 0) {
                return;
            }
            this.limit = nextLimit;
            this.page = 1;
        },
        onSearch() {
            this.page = 1;
        },
        applyDateFilter() {
            this.page = 1;
        },
        setDateFilter(key, value) {
            if (!Object.prototype.hasOwnProperty.call(this.dateFilters, key)) {
                return;
            }
            this.dateFilters[key] = value;
        },
        setColumnFilterMatchMode(value) {
            this.columnFilterMatchMode = this.normalizeSelectValue(value) ?? 'all';
        },
        setColumnFilterOperator(columnKey, value) {
            if (!this.columnFilters[columnKey]) {
                return;
            }
            this.columnFilters[columnKey].operator = this.normalizeSelectValue(value) ?? 'startsWith';
        },
        resetFilters() {
            this.tableSearchTerm = '';
            this.columnFilterMatchMode = 'all';
            this.dateFilters = {
                start: null,
                end: null,
            };
            Object.keys(this.columnFilters).forEach((key) => {
                this.columnFilters[key].value = '';
                this.columnFilters[key].operator = 'startsWith';
            });
            this.page = 1;
        },
        toggleColumnFilter(columnKey) {
            if (this.activeColumnFilter === columnKey) {
                this.activeColumnFilter = null;
                return;
            }
            this.activeColumnFilter = columnKey;
        },
        applyColumnFilter() {
            this.page = 1;
            this.activeColumnFilter = null;
        },
        clearColumnFilter(columnKey) {
            if (!this.columnFilters[columnKey]) {
                return;
            }
            this.columnFilters[columnKey].value = '';
            this.columnFilters[columnKey].operator = 'startsWith';
            this.activeColumnFilter = null;
        },
        isColumnFilterActive(columnKey) {
            const filter = this.columnFilters[columnKey];
            return Boolean(filter && String(filter.value ?? '').trim());
        },
        applyColumnFilters(orders) {
            const activeFilters = Object.entries(this.columnFilters)
                .filter(([, filter]) => String(filter.value ?? '').trim().length > 0);

            if (!activeFilters.length) {
                return orders;
            }

            return orders.filter((order) => activeFilters.every(([columnKey, filter]) => {
                const value = this.getColumnFilterValue(order, columnKey);
                return this.matchesColumnFilter(value, filter);
            }));
        },
        getColumnFilterValue(order, columnKey) {
            return order?.[columnKey] ?? '';
        },
        matchesColumnFilter(value, filter) {
            const candidate = String(value ?? '').toLowerCase();
            const needle = String(filter.value ?? '').toLowerCase();
            const operator = this.normalizeSelectValue(filter.operator) ?? 'startsWith';

            if (!needle) {
                return true;
            }

            if (operator === 'equals') {
                return candidate === needle;
            }

            if (operator === 'contains') {
                return candidate.includes(needle);
            }

            return candidate.startsWith(needle);
        },
        normalizeSelectValue(value) {
            if (value && typeof value === 'object') {
                return value.value ?? value.id ?? value.name ?? '';
            }
            return value;
        },
        applyDateFilters(orders) {
            const startTimestamp = this.getDateFilterTimestamp(this.dateFilters.start, 'start');
            const endTimestamp = this.getDateFilterTimestamp(this.dateFilters.end, 'end');

            if (!startTimestamp && !endTimestamp) {
                return orders;
            }

            return orders.filter((order) => {
                const orderTimestamp = this.parseOrderDate(order?.date);
                if (!Number.isFinite(orderTimestamp)) {
                    return false;
                }
                if (startTimestamp && orderTimestamp < startTimestamp) {
                    return false;
                }
                if (endTimestamp && orderTimestamp > endTimestamp) {
                    return false;
                }
                return true;
            });
        },
        getDateFilterTimestamp(value, boundary) {
            if (!value) {
                return null;
            }

            const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
            if (Number.isNaN(date.getTime())) {
                return null;
            }

            if (boundary === 'start') {
                date.setHours(0, 0, 0, 0);
            } else {
                date.setHours(23, 59, 59, 999);
            }

            return date.getTime();
        },
        normalizeSortValue(value, sortBy = this.sortBy) {
            if (value === null || value === undefined) {
                return '';
            }
            if (String(sortBy).toLowerCase().includes('date')) {
                const parsedDate = this.parseOrderDate(value);
                return Number.isNaN(parsedDate) ? String(value) : parsedDate;
            }
            if (typeof value === 'number') {
                return value;
            }
            const normalized = String(value).trim();
            if (/^-?\d+(\.\d+)?$/.test(normalized)) {
                return Number(normalized);
            }
            return normalized.toLowerCase();
        },

        onSortColumn(column) {
            const nextSortBy = column?.sortBy
                ?? column?.dataIndex
                ?? column?.property
                ?? column;

            if (!nextSortBy) {
                return;
            }

            const nextDirection = column?.sortDirection ?? column?.direction;

            if (this.sortBy === nextSortBy && !nextDirection) {
                this.sortDirection = this.sortDirection === 'ASC' ? 'DESC' : 'ASC';
            } else {
                this.sortBy = nextSortBy;
                this.sortDirection = nextDirection ?? 'ASC';
            }

            this.page = 1;
        },
        onSelectionChange(selection) {
            if (Array.isArray(selection)) {
                this.selectedOrders = selection;
                return;
            }

            if (selection && typeof selection === 'object') {
                this.selectedOrders = Object.values(selection);
                return;
            }

            this.selectedOrders = [];
        },
        toggleSelectAll(event) {
            const isChecked = event?.target?.checked;
            if (!isChecked) {
                const currentKeys = new Set(this.paginatedOrders.map((order) => this.getOrderKey(order)));
                this.selectedOrders = this.selectedOrders.filter((order) => !currentKeys.has(this.getOrderKey(order)));
                return;
            }

            const merged = new Map(this.selectedOrders.map((order) => [this.getOrderKey(order), order]));
            this.paginatedOrders.forEach((order) => {
                merged.set(this.getOrderKey(order), order);
            });
            this.selectedOrders = Array.from(merged.values());
        },
        toggleOrderSelection(order, event) {
            const isChecked = event?.target?.checked;
            const key = this.getOrderKey(order);
            if (!key) {
                return;
            }

            if (isChecked) {
                const merged = new Map(this.selectedOrders.map((item) => [this.getOrderKey(item), item]));
                merged.set(key, order);
                this.selectedOrders = Array.from(merged.values());
                return;
            }

            this.selectedOrders = this.selectedOrders.filter((item) => this.getOrderKey(item) !== key);
        },
        isOrderSelected(order) {
            const key = this.getOrderKey(order);
            return this.selectedOrders.some((item) => this.getOrderKey(item) === key);
        },
        getSortIndicator(sortBy) {
            if (this.sortBy !== sortBy) {
                return '↕';
            }
            return this.sortDirection === 'ASC' ? '↑' : '↓';
        },

        async openDetail(order) {
            this.isLoading = true;
            try {
                if (this.isFakeOrder(order)) {
                    this.selectedOrder = this.normalizeOrderDetail(this.buildFakeOrderDetail(order));
                } else {
                    const detail = await this.externalOrderService.detail(order.id);
                    this.selectedOrder = this.normalizeOrderDetail(detail);
                }
                this.showDetailModal = true;
            } catch (error) {
                this.createNotificationError({
                    title: 'Bestelldetails konnten nicht geladen werden',
                    message: error?.message || 'Bitte prüfen Sie die Verbindung zu den externen APIs.',
                });
            } finally {
                this.isLoading = false;
            }
        },

        closeDetail() {
            this.showDetailModal = false;
            this.selectedOrder = null;
        },
        normalizeOrderDetail(order) {
            const base = order ?? {};
            const billing = base.billing ?? {};
            const delivery = base.delivery ?? {};
            const totals = Array.isArray(base.totals)
                ? {
                    items: Number(base.totals[0]?.value ?? 0),
                    shipping: Number(base.totals[1]?.value ?? 0),
                    sum: Number(base.totals[2]?.value ?? 0),
                    tax: Number(base.totals[3]?.value ?? 0),
                    net: Number(base.totals[4]?.value ?? 0),
                }
                : (base.totals ?? {});
            const statusHistory = Array.isArray(base.statusHistory)
                ? base.statusHistory.map((entry) => ({
                    status: entry?.status ?? entry?.statusName ?? '',
                    date: entry?.date ?? entry?.dateAdded ?? '',
                    comment: entry?.comment ?? entry?.comments ?? '',
                }))
                : [];
            const items = Array.isArray(base.items)
                ? base.items.map((item) => {
                    const orderedQuantity = Number(item?.orderedQuantity ?? item?.quantity ?? 0);
                    const shippedQuantity = Number(item?.shippedQuantity ?? orderedQuantity);

                    return {
                        id: item?.id ?? item?.positionId ?? item?.positionID ?? item?.lineItemId ?? '',
                        positionId: item?.positionId ?? item?.positionID ?? item?.id ?? item?.lineItemId ?? '',
                        name: item?.name ?? item?.productName ?? '',
                        quantity: orderedQuantity,
                        orderedQuantity,
                        shippedQuantity,
                        packageId: item?.packageId ?? item?.packageID ?? '',
                        packageLabel: item?.packageLabel ?? item?.packageName ?? item?.parcelNumber ?? '',
                        packages: this.normalizeItemPackages(item),
                        sku: item?.sku ?? item?.productNumber ?? '',
                        netPrice: Number(item?.netPrice ?? item?.productPrice ?? 0),
                        taxRate: Number(item?.taxRate ?? 19),
                        grossPrice: Number(item?.grossPrice ?? item?.finalPrice ?? 0),
                        totalPrice: Number(item?.totalPrice ?? item?.finalPrice ?? 0),
                    };
                })
                : [];

            return {
                ...base,
                customer: {
                    number: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    group: '',
                    ...(base.customer ?? {}),
                    number: base.customer?.number ?? String(base.customer?.id ?? ''),
                    email: base.customer?.email ?? base.customer?.emailAddress ?? '',
                    group: base.customer?.group ?? base.customer?.statusName ?? '',
                },
                payment: {
                    method: base.paymentMethod ?? '',
                    code: '',
                    dueDate: base.datePurchased ?? '',
                    outstanding: '',
                    settled: '',
                    extra: '',
                    ...(base.payment ?? {}),
                },
                billingAddress: {
                    street: '',
                    zip: '',
                    city: '',
                    country: '',
                    ...(base.billingAddress ?? {}),
                    street: base.billingAddress?.street ?? billing.streetAddress ?? '',
                    zip: base.billingAddress?.zip ?? billing.postcode ?? '',
                    city: base.billingAddress?.city ?? billing.city ?? '',
                    country: base.billingAddress?.country ?? billing.country ?? '',
                },
                shippingAddress: {
                    name: '',
                    street: '',
                    zipCity: '',
                    country: '',
                    ...(base.shippingAddress ?? {}),
                    name: base.shippingAddress?.name ?? delivery.name ?? '',
                    street: base.shippingAddress?.street ?? delivery.streetAddress ?? '',
                    zipCity: base.shippingAddress?.zipCity ?? `${delivery.postcode ?? ''} ${delivery.city ?? ''}`.trim(),
                    country: base.shippingAddress?.country ?? delivery.country ?? '',
                },
                additional: {
                    orderDate: base.datePurchased ?? '',
                    status: base.orderStatus ?? '',
                    orderType: '',
                    notes: '',
                    consultant: '',
                    tenant: '',
                    san6OrderNumber: '',
                    orgaEntries: [],
                    documents: [],
                    pdmsId: '',
                    pdmsVariant: '',
                    topmArticleNumber: '',
                    topmExecution: '',
                    statusHistorySource: '',
                    ...(base.additional ?? {}),
                },
                shipping: {
                    carrier: '',
                    trackingNumbers: [],
                    ...(base.shipping ?? {}),
                },
                items,
                statusHistory,
                totals: {
                    items: totals.items ?? 0,
                    shipping: totals.shipping ?? 0,
                    sum: totals.sum ?? 0,
                    tax: totals.tax ?? 0,
                    net: totals.net ?? 0,
                },
            };
        },
        openTestMarkingModal() {
            if (!this.hasSelectedOrders) {
                return;
            }
            this.showTestMarkingModal = true;
        },
        closeTestMarkingModal() {
            this.showTestMarkingModal = false;
        },
        async applyTestMarking() {
            if (!this.selectedOrders.length) {
                this.showTestMarkingModal = false;
                return;
            }

            const orderIds = this.selectedOrders
                .map((order) => order?.id)
                .filter((id) => typeof id === 'string' && id.length > 0);

            if (!orderIds.length) {
                this.showTestMarkingModal = false;
                return;
            }

            this.isLoading = true;
            try {
                const result = await this.externalOrderService.markOrdersAsTest(orderIds);
                const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

                this.orders = this.orders.map((order) => {
                    if (!orderIds.includes(order?.id)) {
                        return order;
                    }

                    return {
                        ...order,
                        isTestOrder: true,
                        status: 'test',
                        statusLabel: 'Test',
                        ordersStatusName: 'Test',
                        orderStatusColor: '9e9e9e',
                        date: order?.date || nowIso,
                    };
                });

                this.createNotificationSuccess({
                    title: 'Testmarkierung gespeichert',
                    message: `${result?.updated ?? orderIds.length} Bestellung(en) als Test markiert.`,
                });
            } catch (error) {
                this.createNotificationError({
                    title: 'Testmarkierung fehlgeschlagen',
                    message: error?.message || 'Die ausgewählten Bestellungen konnten nicht als Test markiert werden.',
                });
            } finally {
                this.showTestMarkingModal = false;
                this.selectedOrders = [];
                this.isLoading = false;
            }
        },
        getOrderKey(order) {
            return order?.id ?? order?.orderNumber ?? '';
        },
        getOrderDisplayLabel(order) {
            const number = order?.orderNumber ? `#${order.orderNumber}` : '';
            const customer = order?.customerName ?? '';
            if (number && customer) {
                return `Order ${number} - ${customer}`;
            }
            if (number) {
                return `Order ${number}`;
            }
            return customer || 'Order';
        },

        formatCurrency(value) {
            return new Intl.NumberFormat('de-DE', {
                style: 'currency',
                currency: 'EUR',
            }).format(value);
        },
        selectArea(area) {
            this.selectedArea = area;
        },
        getEmptySummary() {
            return {
                orderCount: 0,
                totalRevenue: 0,
                totalItems: 0,
                openOrdersTotal: 0,
                overdueShippingTotal: 0,
                overdueDeliveriesCompletedTotal: 0,
            };
        },
        buildSummaryFromOrders(orders) {
            const fallbackSummary = this.getEmptySummary();

            return {
                ...fallbackSummary,
                orderCount: orders.length,
                totalRevenue: orders.reduce((sum, order) => sum + Number(order?.totalRevenue || 0), 0),
                totalItems: orders.reduce((sum, order) => sum + Number(order?.totalItems || 0), 0),
                openOrdersTotal: orders.reduce((sum, order) => sum + (this.isOpenOrder(order) ? 1 : 0), 0),
                overdueShippingTotal: orders.reduce((sum, order) => sum + (this.isOverdueShipping(order) ? 1 : 0), 0),
                overdueDeliveriesCompletedTotal: orders.reduce((sum, order) => sum + (this.isOverdueCompletedDelivery(order) ? 1 : 0), 0),
            };
        },
        resolveSummaryFromPayload(payload, orders) {
            const summary = payload?.summary ?? {};
            const fallbackSummary = this.buildSummaryFromOrders(orders);

            return {
                ...fallbackSummary,
                orderCount: Number(summary.orderCount ?? summary.totalOrders ?? fallbackSummary.orderCount),
                totalRevenue: Number(summary.totalRevenue ?? fallbackSummary.totalRevenue),
                totalItems: Number(summary.totalItems ?? summary.totalQuantity ?? fallbackSummary.totalItems),
                openOrdersTotal: Number(
                    summary.openOrdersTotal
                    ?? summary.totalOpenOrders
                    ?? summary.currentOpenOrdersTotal
                    ?? fallbackSummary.openOrdersTotal,
                ),
                overdueShippingTotal: Number(
                    summary.overdueShippingTotal
                    ?? summary.currentOverdueShipping
                    ?? fallbackSummary.overdueShippingTotal,
                ),
                overdueDeliveriesCompletedTotal: Number(
                    summary.overdueDeliveriesCompletedTotal
                    ?? summary.currentOverdueDeliveriesCompleted
                    ?? fallbackSummary.overdueDeliveriesCompletedTotal,
                ),
            };
        },
        isOpenOrder(order) {
            const status = String(order?.statusLabel ?? order?.status ?? '').toLowerCase();
            return status.includes('offen') || status.includes('open');
        },
        isOverdueShipping(order) {
            return this.resolveBooleanMetric(order, [
                'isOverdueShipping',
                'overdueShipping',
                'shippingOverdue',
            ]);
        },
        isOverdueCompletedDelivery(order) {
            return this.resolveBooleanMetric(order, [
                'isOverdueCompletedDelivery',
                'overdueCompletedDelivery',
                'overdueDeliveryCompleted',
            ]);
        },
        resolveBooleanMetric(entity, keys) {
            for (const key of keys) {
                const value = entity?.[key];

                if (typeof value === 'boolean') {
                    return value;
                }

                if (typeof value === 'number') {
                    return value > 0;
                }

                if (typeof value === 'string') {
                    const normalized = value.trim().toLowerCase();
                    if (['1', 'true', 'yes', 'ja'].includes(normalized)) {
                        return true;
                    }

                    if (['0', 'false', 'no', 'nein'].includes(normalized)) {
                        return false;
                    }
                }
            }

            return false;
        },

        getItemSplitKey(item) {
            return `${item?.sku ?? ''}::${item?.name ?? ''}`;
        },
        hasSplitOrderPosition(item, items = this.selectedOrder?.items ?? []) {
            const splitKey = this.getItemSplitKey(item);

            return items.filter((candidate) => this.getItemSplitKey(candidate) === splitKey).length > 1;
        },
        itemDisplayStatus(item, items = this.selectedOrder?.items ?? []) {
            const ordered = Number(item?.orderedQuantity ?? item?.quantity ?? 0);
            const shipped = Number(item?.shippedQuantity ?? ordered);

            if (ordered <= 0) {
                return 'Nicht versendet';
            }

            if (shipped <= 0) {
                return 'Nicht versendet';
            }

            if (shipped < ordered) {
                return 'Teillieferung';
            }

            if (this.hasSplitOrderPosition(item, items)) {
                return 'Trennung Auftragsposition';
            }

            return 'Komplett geliefert';
        },
        itemShipmentRatio(item) {
            const ordered = Number(item?.orderedQuantity ?? item?.quantity ?? 0);
            const shipped = Number(item?.shippedQuantity ?? ordered);
            const status = this.itemDisplayStatus(item);

            if (!['Teillieferung', 'Trennung Auftragsposition'].includes(status) || ordered <= 0) {
                return '';
            }

            return `${shipped}/${ordered} Stück`;
        },
        normalizeItemPackages(item) {
            const packageCandidates = item?.packages
                ?? item?.packageItems
                ?? item?.shipmentPackages
                ?? item?.deliveries;

            if (!Array.isArray(packageCandidates)) {
                return [];
            }

            return packageCandidates.map((pkg, packageIndex) => ({
                packageId: pkg?.packageId
                    ?? pkg?.id
                    ?? pkg?.packageNumber
                    ?? pkg?.trackingNumber
                    ?? `pkg-${packageIndex + 1}`,
                packageLabel: pkg?.label
                    ?? pkg?.packageLabel
                    ?? pkg?.packageNumber
                    ?? pkg?.trackingNumber
                    ?? `Paket ${packageIndex + 1}`,
                shippedQuantity: Number(pkg?.shippedQuantity ?? pkg?.quantity ?? 0),
                orderedQuantity: Number(pkg?.orderedQuantity ?? item?.orderedQuantity ?? item?.quantity ?? 0),
            }));
        },
        buildDeliveryRows(items, orderId) {
            const splitRows = [];

            items.forEach((item, itemIndex) => {
                const positionId = this.resolvePositionId(item, itemIndex);
                const packages = Array.isArray(item?.packages) ? item.packages : [];

                if (packages.length === 0) {
                    splitRows.push(this.createPositionDeliveryRow(item, orderId, positionId));
                    return;
                }

                packages.forEach((pkg, packageIndex) => {
                    splitRows.push(this.createPackageDeliveryRow(item, pkg, orderId, positionId, packageIndex));
                });
            });

            return splitRows;
        },
        resolvePositionId(item, itemIndex) {
            return String(
                item?.positionId
                ?? item?.id
                ?? item?.lineItemId
                ?? item?.sku
                ?? `position-${itemIndex + 1}`,
            );
        },
        createPositionDeliveryRow(item, orderId, positionId) {
            const orderedQuantity = Number(item?.orderedQuantity ?? item?.quantity ?? 0);
            const shippedQuantity = Number(item?.shippedQuantity ?? orderedQuantity);

            return {
                rowKey: `${orderId}-${positionId}-position`,
                rowType: 'position',
                positionId,
                packageId: 'position',
                packageLabel: '-',
                name: item?.name ?? '',
                sku: item?.sku ?? '',
                rowQuantity: orderedQuantity,
                orderedQuantity,
                shippedQuantity,
                netPrice: Number(item?.netPrice ?? 0),
                taxRate: Number(item?.taxRate ?? 0),
                grossPrice: Number(item?.grossPrice ?? 0),
                totalPrice: Number(item?.totalPrice ?? 0),
            };
        },
        createPackageDeliveryRow(item, pkg, orderId, positionId, packageIndex) {
            const fallbackOrdered = Number(item?.orderedQuantity ?? item?.quantity ?? 0);
            const shippedQuantity = Number(pkg?.shippedQuantity ?? pkg?.quantity ?? 0);
            const orderedQuantity = Number(pkg?.orderedQuantity ?? fallbackOrdered);
            const packageId = String(pkg?.packageId ?? pkg?.id ?? `package-${packageIndex + 1}`);
            const packageLabel = pkg?.packageLabel ?? pkg?.label ?? packageId;

            return {
                rowKey: `${orderId}-${positionId}-${packageId}`,
                rowType: 'package',
                positionId,
                packageId,
                packageLabel,
                name: item?.name ?? '',
                sku: item?.sku ?? '',
                rowQuantity: shippedQuantity,
                orderedQuantity,
                shippedQuantity,
                netPrice: Number(item?.netPrice ?? 0),
                taxRate: Number(item?.taxRate ?? 0),
                grossPrice: Number(item?.grossPrice ?? 0),
                totalPrice: Number(item?.totalPrice ?? 0),
            };
        },
        deliveryRowStatus(row) {
            if (row?.rowType === 'package') {
                return 'Paketlieferung';
            }

            return this.itemDisplayStatus(row, this.selectedOrder?.items ?? []);
        },
        deliveryRowShipmentRatio(row) {
            const ordered = Number(row?.orderedQuantity ?? 0);
            const shipped = Number(row?.shippedQuantity ?? 0);

            if (ordered <= 0) {
                return '';
            }

            return `${shipped}/${ordered} Stück`;
        },

        statusClass(order) {
            return this.statusClassFromLabel(order?.statusLabel);
        },
        statusClassFromLabel(statusLabel) {
            const normalizedStatusLabel = String(statusLabel ?? '').trim().toLowerCase();

            if ([
                'bezahlt / in bearbeitung',
                'nicht bezahlt / in bearbeitung',
            ].includes(normalizedStatusLabel)) {
                return 'external-orders__status-pill--blue';
            }

            if (normalizedStatusLabel === 'vorkasse: bezahlung offen') {
                return 'external-orders__status-pill--yellow';
            }

            if (normalizedStatusLabel === 'versendet') {
                return 'external-orders__status-pill--green';
            }

            if (normalizedStatusLabel === 'bestellung abgeschlossen') {
                return 'external-orders__status-pill--black';
            }

            if (normalizedStatusLabel === 'stornierung abgeschlossen') {
                return 'external-orders__status-pill--gray';
            }

            return '';
        },
        isFakeOrder(order) {
            const id = order?.id ?? '';
            return typeof id === 'string' && id.startsWith('order-');
        },
        buildFakeOrderDetail(order) {
            const nameParts = String(order?.customerName ?? 'Max Mustermann').split(' ');
            const firstName = nameParts[0] || 'Max';
            const lastName = nameParts.slice(1).join(' ') || 'Mustermann';
            const orderNumber = order?.orderNumber ?? '0000000';
            const totalItems = order?.totalItems ?? 1;
            const grossPricePerItem = 79.5;
            const netPricePerItem = Number((grossPricePerItem / 1.19).toFixed(2));
            const taxRate = 19;
            const items = Array.from({ length: Math.min(totalItems, 6) }, (_, index) => ({
                name: `Medizinisches Produkt ${index + 1}`,
                quantity: 1,
                netPrice: netPricePerItem,
                taxRate,
                grossPrice: grossPricePerItem,
                totalPrice: grossPricePerItem,
            }));
            const itemsTotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

            return {
                ...order,
                customer: {
                    number: `KND-${orderNumber}`,
                    firstName,
                    lastName,
                    email: order?.email ?? 'kunde@example.com',
                    group: 'Standard',
                },
                payment: {
                    method: 'Kreditkarte',
                    code: `PAY-${orderNumber}`,
                    dueDate: order?.date ?? '2025-12-31',
                    outstanding: this.formatCurrency(0),
                    settled: this.formatCurrency(itemsTotal),
                    extra: 'Transaktion bestätigt',
                },
                billingAddress: {
                    street: 'Hauptstraße 12',
                    zip: '20354',
                    city: 'Hamburg',
                    country: 'Deutschland',
                },
                shippingAddress: {
                    name: order?.customerName ?? 'Max Mustermann',
                    street: 'Hauptstraße 12',
                    zipCity: '20354 Hamburg',
                    country: 'Deutschland',
                },
                additional: {
                    orderDate: order?.date ?? '2025-12-30 09:31',
                    status: order?.statusLabel ?? 'Bezahlt / in Bearbeitung',
                    orderType: 'Standard',
                    notes: 'Testbestellung aus externer Übersicht',
                    consultant: 'Lisa Berger',
                    tenant: 'FM Shop',
                    san6OrderNumber: `SAN6-${orderNumber}`,
                    orgaEntries: ['ORG-394', 'ORG-402'],
                    documents: ['Archiv 2025-12', 'Scan 444'],
                    pdmsId: 'PDMS-7742',
                    pdmsVariant: 'V2',
                    topmArticleNumber: 'TOPM-331',
                    topmExecution: 'Standard',
                    statusHistorySource: 'System',
                },
                shipping: {
                    carrier: 'DHL',
                    trackingNumbers: [`00340434${orderNumber}`],
                },
                items,
                statusHistory: [
                    { status: 'Bestellung angelegt', date: order?.date ?? '2025-12-30 09:31', comment: 'Automatisch' },
                    { status: order?.statusLabel ?? 'Bezahlt / in Bearbeitung', date: order?.date ?? '2025-12-30 10:15', comment: 'Zahlung bestätigt' },
                    { status: 'Versand vorbereitet', date: '2025-12-31 08:10', comment: 'Kommissionierung gestartet' },
                ],
            };
        },
        exportSelectedOrdersPdf() {
            const orders = this.getOrdersForExport();
            if (!orders.length) {
                this.createNotificationWarning({
                    title: 'Keine Bestellungen gefunden',
                    message: 'Für den aktuellen Filter sind keine Bestellungen verfügbar.',
                });
                return;
            }

            const pdfData = this.buildTablePdf(orders);
            this.downloadBlob('external-orders.pdf', 'application/pdf', pdfData);
        },
        exportSelectedOrdersExcel() {
            const orders = this.getOrdersForExport();
            if (!orders.length) {
                this.createNotificationWarning({
                    title: 'Keine Bestellungen gefunden',
                    message: 'Für den aktuellen Filter sind keine Bestellungen verfügbar.',
                });
                return;
            }

            const rows = this.buildExportRows(orders);
            const csv = this.buildCsv(rows);
            this.downloadBlob('external-orders.csv', 'text/csv;charset=utf-8;', csv);
        },
        async seedTestData() {
            if (this.isSeedingTestData) {
                return;
            }

            this.isSeedingTestData = true;

            try {
                const response = await this.externalOrderService.seedTestData();
                const inserted = response?.inserted ?? 0;
                this.createNotificationSuccess({
                    title: 'Testdaten gespeichert',
                    message: inserted > 0
                        ? `Es wurden ${inserted} Testbestellungen gespeichert.`
                        : 'Keine neuen Testbestellungen wurden gespeichert.',
                });
                await this.loadOrders();
            } catch (error) {
                this.createNotificationError({
                    title: 'Testdaten konnten nicht gespeichert werden',
                    message: error?.message || 'Bitte prüfen Sie die Konfiguration der externen APIs.',
                });
            } finally {
                this.isSeedingTestData = false;
            }
        },
        getOrdersForExport() {
            return this.filteredOrders.filter((order) => !this.isTestOrder(order));
        },
        isTestOrder(order) {
            const statusLabel = String(order?.statusLabel ?? '').trim().toLowerCase();
            const status = String(order?.status ?? '').trim().toLowerCase();
            return Boolean(order?.isTestOrder) || statusLabel === 'test' || status === 'test';
        },
        buildExportRows(orders) {
            const header = [
                'Bestellnummer',
                'Kundenname',
                'Land',
                'Zahlungsmethode',
                'Datum',
                'Bestellstatus',
                'Stück',
                'Summe',
            ];

            const rows = orders.map((order) => ([
                order.orderNumber ?? '',
                order.customerName ?? '',
                this.getOrderCountry(order),
                this.getOrderPaymentMethod(order),
                this.formatDateForExport(order.date),
                order.statusLabel ?? '',
                this.getOrderItemCount(order),
                this.formatNumberForExport(this.getOrderTotal(order)),
            ]));

            return [header, ...rows];
        },
        buildExportLines(orders) {
            const rows = this.buildExportRows(orders);
            const formattedRows = rows.map((row) => row.map((value) => String(value ?? '')));
            const columnWidths = formattedRows[0].map((_, index) => {
                const longest = Math.max(...formattedRows.map((row) => row[index].length));
                return Math.min(Math.max(longest, 6), 24);
            });

            const paddedRows = formattedRows.map((row) => row.map((value, index) => {
                const trimmed = value.length > columnWidths[index]
                    ? `${value.slice(0, columnWidths[index] - 1)}…`
                    : value;
                return trimmed.padEnd(columnWidths[index]);
            }));

            const headerLine = paddedRows[0].join(' | ');
            const separatorLine = columnWidths.map((width) => '-'.repeat(width)).join('-|-');
            const bodyLines = paddedRows.slice(1).map((row) => row.join(' | '));

            return [
                this.buildExportSummaryLine(orders),
                headerLine,
                separatorLine,
                ...bodyLines,
            ];
        },
        buildCsv(rows) {
            const delimiter = ';';
            const escapeValue = (value) => {
                const stringValue = String(value ?? '');
                const escapedValue = stringValue.replace(/"/g, '""');
                const needsEscaping = stringValue.includes(delimiter)
                    || stringValue.includes('\n')
                    || stringValue.includes('\r')
                    || stringValue.includes('"');
                return needsEscaping ? `"${escapedValue}"` : escapedValue;
            };

            const content = rows
                .map((row) => row.map(escapeValue).join(delimiter))
                .join('\r\n');

            return `\ufeff${content}`;
        },
        buildExportSummaryLine(orders) {
            const totalItems = orders.reduce((sum, order) => sum + this.getOrderItemCount(order), 0);
            const totalRevenue = orders.reduce((sum, order) => sum + this.getOrderTotal(order), 0);
            const dateRange = this.getExportDateRange(orders);
            const revenueLabel = this.formatCurrency(totalRevenue);

            return [
                'Shopbestellungen',
                dateRange ? `${dateRange}` : null,
                `${orders.length} Bestellungen`,
                `${revenueLabel} Gesamtumsatz`,
                `${totalItems} Stück`,
            ].filter(Boolean).join(' | ');
        },
        getExportDateRange(orders) {
            const timestamps = orders
                .map((order) => this.parseOrderDate(order.date))
                .filter((value) => Number.isFinite(value));

            if (!timestamps.length) {
                return '';
            }

            const min = new Date(Math.min(...timestamps));
            const max = new Date(Math.max(...timestamps));

            return `${this.formatDateForExport(min)} - ${this.formatDateForExport(max)}`;
        },
        parseOrderDate(value) {
            if (!value) {
                return NaN;
            }
            const normalized = String(value).replace(' ', 'T');
            const parsed = Date.parse(normalized);
            return Number.isNaN(parsed) ? NaN : parsed;
        },
        formatDateForExport(value) {
            if (!value) {
                return '';
            }
            if (value instanceof Date) {
                return value.toLocaleDateString('de-DE');
            }
            const parsed = this.parseOrderDate(value);
            if (Number.isNaN(parsed)) {
                return String(value);
            }
            return new Date(parsed).toISOString().slice(0, 10);
        },

        formatDateForTable(value) {
            if (!value) {
                return '';
            }

            const parsed = this.parseOrderDate(value);
            if (Number.isNaN(parsed)) {
                return String(value);
            }

            return new Date(parsed).toISOString().slice(0, 16);
        },

        formatNumberForExport(value) {
            const numeric = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(numeric)) {
                return '';
            }
            return new Intl.NumberFormat('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(numeric);
        },
        getOrderCountry(order) {
            return order?.billingAddress?.country
                ?? order?.shippingAddress?.country
                ?? order?.country
                ?? '';
        },
        getOrderPaymentMethod(order) {
            return order?.payment?.method
                ?? order?.paymentMethod
                ?? order?.payment
                ?? '';
        },
        getOrderItemCount(order) {
            return order?.totalItems ?? order?.itemsCount ?? order?.items?.length ?? 0;
        },
        getOrderTotal(order) {
            return order?.totalPrice
                ?? order?.totalRevenue
                ?? order?.amountTotal
                ?? order?.priceTotal
                ?? 0;
        },
        buildTablePdf(orders) {
            const rows = this.buildExportRows(orders);
            const summaryLine = this.buildExportSummaryLine(orders);
            const pageWidth = 842;
            const pageHeight = 595;
            const marginX = 28;
            const marginTop = 36;
            const startY = pageHeight - marginTop;
            const availableWidth = pageWidth - marginX * 2;
            const { columnWidths, scale } = this.getPdfColumnWidths(rows, availableWidth);
            const fontSize = Math.max(8, Math.floor(10 * scale));
            const lineHeight = Math.max(14, Math.round(fontSize * 1.8));
            const tableTop = startY - (lineHeight * 2);
            const totalTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
            const xPositions = columnWidths.reduce((positions, width) => {
                const last = positions[positions.length - 1];
                positions.push(last + width);
                return positions;
            }, [marginX]);

            const tableHeight = rows.length * lineHeight;
            const tableBottom = tableTop - tableHeight;

            const contentParts = [];
            contentParts.push('BT');
            contentParts.push(`/F1 ${fontSize} Tf`);
            contentParts.push(`1 0 0 1 ${marginX} ${startY} Tm`);
            contentParts.push(`(${this.escapePdfText(summaryLine)}) Tj`);
            contentParts.push('ET');

            contentParts.push('0.5 w');
            xPositions.forEach((x) => {
                contentParts.push(`${x} ${tableTop} m ${x} ${tableBottom} l S`);
            });
            for (let rowIndex = 0; rowIndex <= rows.length; rowIndex += 1) {
                const y = tableTop - (rowIndex * lineHeight);
                contentParts.push(`${marginX} ${y} m ${marginX + totalTableWidth} ${y} l S`);
            }

            const maxCharsForWidth = (width) => Math.floor((width - 6) / (fontSize * 0.55));
            rows.forEach((row, rowIndex) => {
                const textY = tableTop - ((rowIndex + 1) * lineHeight) + Math.round(fontSize * 0.6);
                row.forEach((value, columnIndex) => {
                    const cellX = xPositions[columnIndex] + 3;
                    const width = columnWidths[columnIndex];
                    const rawText = String(value ?? '');
                    const trimmed = this.trimPdfText(rawText, maxCharsForWidth(width));
                    contentParts.push('BT');
                    contentParts.push(`/F1 ${fontSize} Tf`);
                    contentParts.push(`1 0 0 1 ${cellX} ${textY} Tm`);
                    contentParts.push(`(${this.escapePdfText(trimmed)}) Tj`);
                    contentParts.push('ET');
                });
            });

            const stream = contentParts.join('\n');
            const objects = [];
            objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
            objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
            objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n');
            objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
            objects.push(`5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);

            let pdf = '%PDF-1.4\n';
            const offsets = [];
            const encoder = new TextEncoder();

            objects.forEach((object) => {
                offsets.push(encoder.encode(pdf).length);
                pdf += object;
            });

            const xrefStart = encoder.encode(pdf).length;
            pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
            offsets.forEach((offset) => {
                pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
            });
            pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

            return encoder.encode(pdf);
        },
        getPdfColumnWidths(rows, availableWidth) {
            const maxLengths = rows[0].map((_, index) => Math.max(...rows.map((row) => String(row[index] ?? '').length)));
            const minWidths = [76, 165, 72, 125, 80, 150, 60, 90];
            const baseWidths = maxLengths.map((length, index) => Math.max(minWidths[index], length * 6));
            const totalWidth = baseWidths.reduce((sum, width) => sum + width, 0);
            const scale = totalWidth > availableWidth ? (availableWidth / totalWidth) : 1;
            return {
                columnWidths: baseWidths.map((width) => Math.floor(width * scale)),
                scale,
            };
        },
        trimPdfText(text, maxChars) {
            if (maxChars <= 0) {
                return '';
            }
            if (text.length <= maxChars) {
                return text;
            }
            if (maxChars === 1) {
                return '…';
            }
            return `${text.slice(0, maxChars - 1)}…`;
        },
        escapePdfText(text) {
            return String(text)
                .replace(/\\/g, '\\\\')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)');
        },
        downloadBlob(filename, mimeType, content) {
            const blob = content instanceof Uint8Array
                ? new Blob([content], { type: mimeType })
                : new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        },

        getSortValue(order, sortBy) {
            if (!sortBy) {
                return '';
            }

            const value = order?.[sortBy];
            return this.normalizeSortValue(value, sortBy);
        },

    },
});
