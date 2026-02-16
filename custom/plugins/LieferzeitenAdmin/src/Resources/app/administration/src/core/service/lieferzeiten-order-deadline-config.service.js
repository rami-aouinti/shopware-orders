const CONFIG_DOMAIN = 'LieferzeitenAdmin.config';
const DEFAULT_CUTOFF = '12:00';
const DEFAULT_SETTINGS = Object.freeze({
    shipping: Object.freeze({ workingDays: 0, cutoff: DEFAULT_CUTOFF }),
    delivery: Object.freeze({ workingDays: 2, cutoff: DEFAULT_CUTOFF }),
});

const CONFIG_KEYS = Object.freeze({
    shopware: `${CONFIG_DOMAIN}.shopwareDateSettings`,
    gambio: `${CONFIG_DOMAIN}.gambioDateSettings`,
});

function normalizeRuleSettings(rawSettings = {}, fallback = DEFAULT_SETTINGS.delivery) {
    const workingDays = Number(rawSettings?.workingDays);
    const cutoffCandidate = String(rawSettings?.cutoff ?? fallback.cutoff ?? DEFAULT_CUTOFF);

    return {
        workingDays: Number.isFinite(workingDays) && workingDays >= 0
            ? Math.trunc(workingDays)
            : fallback.workingDays,
        cutoff: /^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffCandidate)
            ? cutoffCandidate
            : fallback.cutoff,
    };
}

function normalizeDateSettings(rawValue) {
    if (typeof rawValue !== 'string' || rawValue.trim() === '') {
        return DEFAULT_SETTINGS;
    }

    let decoded;
    try {
        decoded = JSON.parse(rawValue);
    } catch (error) {
        return DEFAULT_SETTINGS;
    }

    if (!decoded || typeof decoded !== 'object') {
        return DEFAULT_SETTINGS;
    }

    const legacySettings = normalizeRuleSettings(decoded, DEFAULT_SETTINGS.delivery);

    return {
        shipping: normalizeRuleSettings(decoded.shipping ?? {}, {
            workingDays: DEFAULT_SETTINGS.shipping.workingDays,
            cutoff: legacySettings.cutoff,
        }),
        delivery: normalizeRuleSettings(decoded.delivery ?? decoded, legacySettings),
    };
}

class LieferzeitenOrderDeadlineConfigService {
    constructor(systemConfigApiService) {
        this.systemConfigApiService = systemConfigApiService;
        this.name = 'lieferzeitenOrderDeadlineConfigService';
        this.cache = null;
    }

    async getDelaySettingsCollection() {
        if (this.cache) {
            return this.cache;
        }

        this.cache = this.loadDelaySettingsCollection();

        try {
            return await this.cache;
        } catch (error) {
            this.cache = null;
            throw error;
        }
    }

    async loadDelaySettingsCollection() {
        const values = await this.systemConfigApiService.getValues(CONFIG_DOMAIN);

        return {
            shopware: normalizeDateSettings(values?.[CONFIG_KEYS.shopware]),
            gambio: normalizeDateSettings(values?.[CONFIG_KEYS.gambio]),
        };
    }

    resolveSettingsForOrder(order, settingsCollection) {
        const normalizedSource = String(order?.sourceSystem ?? order?.domain ?? '').trim().toLowerCase();
        const settingKey = normalizedSource.includes('gambio') ? 'gambio' : 'shopware';

        return settingsCollection?.[settingKey] ?? DEFAULT_SETTINGS;
    }
}

Shopware.Application.addServiceProvider('lieferzeitenOrderDeadlineConfigService', (container) => {
    const systemConfigApiService = container.systemConfigApiService ?? Shopware.Service('systemConfigApiService');

    return new LieferzeitenOrderDeadlineConfigService(systemConfigApiService);
});
