import template from './lieferzeiten-statistics-settings.html.twig';
import './lieferzeiten-statistics-settings.scss';

Shopware.Component.register('lieferzeiten-statistics-settings', {
    template,

    created() {
        document.body.classList.add('lza-settings-no-search');
    },

    beforeDestroy() {
        document.body.classList.remove('lza-settings-no-search');
    },
});
