const { Component } = Shopware;

Component.register('external-orders-settings-index', {
    template: `
        <sw-page class="external-orders-settings-index">
            <template #content>
                <external-orders-channel-config />
            </template>
        </sw-page>
    `,
});
