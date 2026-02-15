const LEGACY_ROUTE_PREFIXES = ['#/lieferzeiten/', '#/lieferzeiten-settings/'];

if (typeof window !== 'undefined' && typeof window.location?.hash === 'string') {
    const legacyPrefix = LEGACY_ROUTE_PREFIXES.find((prefix) => window.location.hash.startsWith(prefix));

    if (legacyPrefix) {
        window.location.replace(window.location.href.replace('#/', '#/sw/'));
    }
}

import './module/lieferzeiten';
import './module/lieferzeiten-settings';
import './init/translation.init';

import './core/service/lieferzeiten-tracking.service';
import './core/service/lieferzeiten-orders.service';

import './init/store-api-fallback.init';

import './component/lieferzeiten-demo-data-button';
