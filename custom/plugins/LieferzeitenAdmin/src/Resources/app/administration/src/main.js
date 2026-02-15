const LEGACY_ROUTE_REDIRECTS = {
    '#/lieferzeiten/': '#/sw/lieferzeiten/',
    '#/lieferzeiten-settings/': '#/sw/lieferzeiten-settings/',
    '#/lieferzeiten-delivery-management/': '#/sw/lieferzeiten/',
};

if (typeof window !== 'undefined' && typeof window.location?.hash === 'string') {
    const matchedPrefix = Object.keys(LEGACY_ROUTE_REDIRECTS)
        .find((prefix) => window.location.hash.startsWith(prefix));

    if (matchedPrefix) {
        const targetPrefix = LEGACY_ROUTE_REDIRECTS[matchedPrefix];
        const redirectedHash = window.location.hash.replace(matchedPrefix, targetPrefix);

        if (redirectedHash !== window.location.hash) {
            window.location.replace(window.location.href.replace(window.location.hash, redirectedHash));
        }
    }
}

import './module/lieferzeiten';
import './module/lieferzeiten-settings';
import './init/translation.init';

import './core/service/lieferzeiten-tracking.service';
import './core/service/lieferzeiten-orders.service';

import './init/store-api-fallback.init';

import './component/lieferzeiten-demo-data-button';
