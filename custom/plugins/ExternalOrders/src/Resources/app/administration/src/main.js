import settingsGroupDe from './snippet/de-DE.json';
import settingsGroupEn from './snippet/en-GB.json';

Shopware.Locale.extend('de-DE', settingsGroupDe);
Shopware.Locale.extend('en-GB', settingsGroupEn);

import './core/service/external-order.service';
import './component/external-orders-testdata-button';
import './component/external-orders-channel-config';
import './module/external-orders';

import './module/external-orders-settings';
