const INTERCEPTOR_FLAG = '__lieferzeitenDashboardOrderFallbackInterceptorInstalled';
const ORDER_SEARCH_PATH = '/api/search/order';

function getStringValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeOrderCustomer(order) {
    if (!order || typeof order !== 'object') {
        return;
    }

    const existingCustomer = (order.orderCustomer && typeof order.orderCustomer === 'object') ? order.orderCustomer : {};
    const billingAddress = (order.billingAddress && typeof order.billingAddress === 'object') ? order.billingAddress : {};
    const deliveryAddress = order.deliveries?.[0]?.shippingOrderAddress && typeof order.deliveries[0].shippingOrderAddress === 'object'
        ? order.deliveries[0].shippingOrderAddress
        : {};

    const resolvedFirstName = getStringValue(existingCustomer.firstName)
        || getStringValue(billingAddress.firstName)
        || getStringValue(deliveryAddress.firstName);
    const resolvedLastName = getStringValue(existingCustomer.lastName)
        || getStringValue(billingAddress.lastName)
        || getStringValue(deliveryAddress.lastName);

    order.orderCustomer = {
        ...existingCustomer,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
    };
}

function normalizeOrderSearchResponse(response) {
    const url = String(response?.config?.url || '');

    if (!url.includes(ORDER_SEARCH_PATH)) {
        return response;
    }

    const orders = response?.data?.data;
    if (!Array.isArray(orders)) {
        return response;
    }

    orders.forEach(normalizeOrderCustomer);

    return response;
}

function installDashboardOrderFallbackInterceptor() {
    if (window[INTERCEPTOR_FLAG]) {
        return;
    }

    const initContainer = Shopware.Application.getContainer('init');
    const httpClient = initContainer?.httpClient;

    if (!httpClient?.interceptors?.response) {
        return;
    }

    httpClient.interceptors.response.use(
        (response) => normalizeOrderSearchResponse(response),
        (error) => Promise.reject(error),
    );

    window[INTERCEPTOR_FLAG] = true;
}

installDashboardOrderFallbackInterceptor();
