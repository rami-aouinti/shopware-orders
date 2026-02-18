const { ApiService } = Shopware.Classes;

class ExternalOrderTrackingService extends ApiService {
    constructor(httpClient, loginService, apiEndpoint = 'lieferzeiten') {
        super(httpClient, loginService, apiEndpoint);
        this.name = 'externalOrderTrackingService';
    }

    async history(carrier, trackingNumber) {
        const response = await this.httpClient.get(
            `_action/${this.getApiBasePath()}/tracking/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`,
            {
                headers: this.getBasicHeaders(),
            },
        );

        const data = ApiService.handleResponse(response) ?? response?.data;
        return data?.data ?? data;
    }
}

Shopware.Application.addServiceProvider('externalOrderTrackingService', (container) => {
    const initContainer = Shopware.Application.getContainer('init');
    const httpClient = initContainer?.httpClient ?? container.httpClient;
    const loginService = container.loginService ?? Shopware.Service('loginService');

    return new ExternalOrderTrackingService(httpClient, loginService);
});
