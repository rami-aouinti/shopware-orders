import template from './external-orders-lieferzeit-empty.html.twig';

Shopware.Component.register('external-orders-lieferzeit-empty', {
    template,

    inject: ['lieferzeitenOrdersService'],

    data() {
        return {
            orders: [],
            isLoading: false,
            loadError: null,
        };
    },

    created() {
        this.loadOrders();
    },

    methods: {
        async loadOrders() {
            this.isLoading = true;
            this.loadError = null;

            try {
                const result = await this.lieferzeitenOrdersService.getOrders();
                this.orders = Array.isArray(result) ? result : [];
            } catch (error) {
                this.orders = [];
                this.loadError = error;
            } finally {
                this.isLoading = false;
            }
        },
    },
});
