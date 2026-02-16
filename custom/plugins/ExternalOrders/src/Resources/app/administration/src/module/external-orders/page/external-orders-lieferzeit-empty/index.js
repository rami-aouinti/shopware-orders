import template from './external-orders-lieferzeit-empty.html.twig';

Shopware.Component.register('external-orders-lieferzeit-empty', {
    template,

    created() {
        this.$nextTick(() => {
            this.$router.replace({ name: 'lieferzeiten.index.lieferzeit' });
        });
    },
});
