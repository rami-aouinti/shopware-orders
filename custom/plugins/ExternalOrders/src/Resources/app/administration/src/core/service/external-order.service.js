const { ApiService } = Shopware.Classes;

class ExternalOrderService extends ApiService {
    constructor(httpClient, loginService, apiEndpoint = 'external-orders') {
        super(httpClient, loginService, apiEndpoint);
        this.name = 'externalOrderService';
    }

    static DEMO_DATA_TIMEOUT_MS = 120000;

    async list(params = {}) {
        const normalizedParams = Object.entries(params).reduce((accumulator, [key, value]) => {
            if (value === null || value === undefined || value === '') {
                return accumulator;
            }

            accumulator[key] = value;

            return accumulator;
        }, {});

        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/list`, {
            headers: this.getBasicHeaders(),
            params: normalizedParams,
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async summary(params = {}) {
        const normalizedParams = Object.entries(params).reduce((accumulator, [key, value]) => {
            if (value === null || value === undefined || value === '') {
                return accumulator;
            }

            accumulator[key] = value;

            return accumulator;
        }, {});

        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/summary`, {
            headers: this.getBasicHeaders(),
            params: normalizedParams,
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async detail(orderId) {
        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/detail/${orderId}`, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async status(orderId) {
        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/status/${orderId}`, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async updateStatus(orderId, status) {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/status/${orderId}`, {
            status,
        }, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }



    async markOrdersAsTest(orderIds) {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/mark-test`, {
            orderIds,
        }, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async runSyncNow() {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/sync-now`, {}, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async getSyncStatus() {
        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/sync-status`, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }


    async getTestDataStatus() {
        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/test-data/status`, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async toggleTestData() {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/test-data/toggle`, {}, {
            headers: this.getBasicHeaders(),
            timeout: ExternalOrderService.DEMO_DATA_TIMEOUT_MS,
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async seedTestData() {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/test-data`, {}, {
            headers: this.getBasicHeaders(),
            timeout: ExternalOrderService.DEMO_DATA_TIMEOUT_MS,
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }



    async getDeliveryDateEditorState(orderId, positionId) {
        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/delivery-date-editor/${orderId}/${positionId}`, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async saveDeliveryDateEditorState(payload) {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/delivery-date-editor/save`, payload, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async getCompletedSupplierRequestTasks(params = {}) {
        const response = await this.httpClient.get(`_action/${this.getApiBasePath()}/completed-supplier-request-tasks`, {
            headers: this.getBasicHeaders(),
            params,
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }

    async createSupplierRequestTask(payload) {
        const response = await this.httpClient.post(`_action/${this.getApiBasePath()}/create-supplier-request-task`, payload, {
            headers: this.getBasicHeaders(),
        });

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }
}

Shopware.Application.addServiceProvider('externalOrderService', (container) => {
    const initContainer = Shopware.Application.getContainer('init');
    const httpClient = initContainer?.httpClient ?? container.httpClient;
    const loginService = container.loginService ?? Shopware.Service('loginService');

    return new ExternalOrderService(httpClient, loginService);
});
