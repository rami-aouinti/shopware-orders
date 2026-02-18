const fs = require('fs');
const path = require('path');

jest.mock('./lieferzeiten-order-table.html.twig', () => '', { virtual: true });
jest.mock('./lieferzeiten-order-table.scss', () => '', { virtual: true });

describe('lieferzeiten/component/lieferzeiten-order-table', () => {
    let methods;

    beforeEach(async () => {
        jest.resetModules();
        global.Shopware = {
            Component: {
                register: jest.fn(),
            },
        };

        await import('./index');
        methods = global.Shopware.Component.register.mock.calls[0][1].methods;
    });

    function createContext() {
        return {
            pickFirstDefined: methods.pickFirstDefined,
            displayOrDash: methods.displayOrDash,
        };
    }

    it('uses order level san6 fallback when no detailed positions exist', () => {
        const context = createContext();
        const order = { san6Position: '10', san6Pos: '11' };

        const value = methods.resolveSan6Position.call(context, order, []);

        expect(value).toBe('10');
    });

    it('uses san6Pos when san6Position is not available and no detailed positions exist', () => {
        const context = createContext();
        const order = { san6Pos: '11' };

        const value = methods.resolveSan6Position.call(context, order, []);

        expect(value).toBe('11');
    });

    it('uses order level quantity fallback when no detailed positions exist', () => {
        const context = createContext();
        const order = { quantity: 7 };

        const value = methods.resolveQuantity.call(context, order, []);

        expect(value).toBe('7');
    });

    it('uses positionsCount when quantity is not available and no detailed positions exist', () => {
        const context = createContext();
        const order = { positionsCount: 4 };

        const value = methods.resolveQuantity.call(context, order, []);

        expect(value).toBe('4');
    });

    it('prefers detailed positions over fallback values when available', () => {
        const context = createContext();
        const order = { san6Position: 'order-level', quantity: 99 };
        const positions = [
            { positionNumber: '1', quantity: 2 },
            { number: '2', orderedQuantity: 3 },
        ];

        const san6Position = methods.resolveSan6Position.call(context, order, positions);
        const quantity = methods.resolveQuantity.call(context, order, positions);

        expect(san6Position).toBe('1, 2');
        expect(quantity).toBe('5');
    });



    it('marks latest tracking number as current and keeps old numbers for re-shipment history', () => {
        const context = {};
        const order = { trackingCarrier: 'dhl' };
        const position = {
            trackingEntries: [
                { number: 'NEW-001', carrier: 'dhl', createdAt: '2026-01-10 10:00:00' },
                { number: 'OLD-001', carrier: 'dhl', createdAt: '2026-01-09 10:00:00' },
            ],
        };

        const entries = methods.resolveTrackingEntries.call(context, order, position);

        expect(entries).toHaveLength(2);
        expect(entries[0]).toEqual(expect.objectContaining({ number: 'NEW-001', isCurrent: true, isActive: true }));
        expect(entries[1]).toEqual(expect.objectContaining({ number: 'OLD-001', isCurrent: false, isActive: false }));
    });

    it('disables comment save when order has no positions', () => {
        const context = {
            hasEditAccess: () => true,
            getValidCommentTargetPositionId: methods.getValidCommentTargetPositionId,
            resolveCommentTargetPositionId: methods.resolveCommentTargetPositionId,
            isOpenPosition: methods.isOpenPosition,
        };
        const order = { positions: [], commentTargetPositionId: null };

        const canSave = methods.canSaveComment.call(context, order);

        expect(canSave).toBe(false);
    });

    it('does not call updateComment for order without positions', async () => {
        const updateComment = jest.fn();
        const context = {
            canSaveComment: methods.canSaveComment,
            hasEditAccess: () => true,
            getValidCommentTargetPositionId: methods.getValidCommentTargetPositionId,
            ensureCommentTargetPositionId: methods.ensureCommentTargetPositionId,
            resolveCommentTargetPositionId: methods.resolveCommentTargetPositionId,
            isOpenPosition: methods.isOpenPosition,
            $set: jest.fn(),
            createNotificationError: jest.fn(),
            createNotificationSuccess: jest.fn(),
            resolveConcurrencyToken: jest.fn(() => null),
            reloadOrder: jest.fn(),
            handleConflictError: jest.fn(() => false),
            lieferzeitenOrdersService: { updateComment },
            $t: (key) => key,
        };

        await methods.saveComment.call(context, { positions: [], comment: 'foo', commentTargetPositionId: null });

        expect(updateComment).not.toHaveBeenCalled();
    });



    it('formats position quantity as shipped/ordered ratio for complete and fractional cases', () => {
        const context = {
            parseQuantity: methods.parseQuantity,
            positionQuantitySuffix: methods.positionQuantitySuffix,
            pickFirstDefined: methods.pickFirstDefined,
            displayOrDash: methods.displayOrDash,
            $t: (key) => ({
                'lieferzeiten.shipping.pieces': 'Stück',
            }[key] || key),
        };

        expect(methods.positionQuantityDisplay.call(context, { orderedQuantity: 3, shippedQuantity: 3 })).toBe('3/3 Stück');
        expect(methods.positionQuantityDisplay.call(context, { orderedQuantity: 3, shippedQuantity: 2 })).toBe('2/3 Stück');
        expect(methods.positionQuantityDisplay.call(context, { quantity: 5 })).toBe('5');
    });

    it('returns expected package status labels per position state', () => {
        const context = {
            $t: (key) => ({
                'lieferzeiten.shipping.unclear': 'Unklar',
                'lieferzeiten.shipping.completeShipment': 'Gesamt-Versand',
                'lieferzeiten.shipping.partialShipment': 'Teillieferung',
                'lieferzeiten.shipping.splitPosition': 'Trennung Auftragsposition',
                'lieferzeiten.shipping.pieces': 'Stück',
            }[key] || key),
            normalizeShippingType: methods.normalizeShippingType,
            parseQuantity: methods.parseQuantity,
            positionQuantitySuffix: methods.positionQuantitySuffix,
        };

        expect(methods.resolvePackageStatusField.call(context, {}, null)).toBe('Unklar');
        expect(methods.resolvePackageStatusField.call(context, { shippingAssignmentType: 'gesamt' }, {})).toBe('Gesamt-Versand');
        expect(methods.resolvePackageStatusField.call(context, { shippingAssignmentType: 'teil' }, { orderedQuantity: 3, shippedQuantity: 3 })).toBe('Teillieferung 3/3 Stück');
        expect(methods.resolvePackageStatusField.call(context, { shippingAssignmentType: 'teil' }, { orderedQuantity: 3, shippedQuantity: 2 })).toBe('Teillieferung 2/3 Stück');
        expect(methods.resolvePackageStatusField.call(context, { shippingAssignmentType: 'trennung' }, { orderedQuantity: 5, shippedQuantity: 2 })).toBe('Trennung Auftragsposition 2/5 Stück');
    });



    it('returns simplified shipping type labels for shipping column', () => {
        const context = {
            $t: (key) => ({
                'lieferzeiten.shipping.unclear': 'Unklar',
                'lieferzeiten.shipping.complete': 'Gesamt',
                'lieferzeiten.shipping.partial': 'Teil',
                'lieferzeiten.shipping.split': 'Trennung',
            }[key] || key),
            normalizeShippingType: methods.normalizeShippingType,
        };

        expect(methods.shippingLabel.call(context, {})).toBe('Unklar');
        expect(methods.shippingLabel.call(context, { shippingAssignmentType: 'gesamt' })).toBe('Gesamt');
        expect(methods.shippingLabel.call(context, { shippingAssignmentType: 'teil' })).toBe('Teil');
        expect(methods.shippingLabel.call(context, { shippingAssignmentType: 'trennung' })).toBe('Trennung');
    });


    it('stores clicked tracking history for modal display', () => {
        const context = {
            showTrackingModal: false,
            activeTracking: null,
            activeTrackingHistory: [],
        };

        methods.openTrackingHistory.call(context, { number: 'NEW-1', carrier: 'dhl' }, [
            { number: 'NEW-1', carrier: 'dhl', isCurrent: true },
            { number: 'OLD-1', carrier: 'dhl', isCurrent: false },
        ]);

        expect(context.showTrackingModal).toBe(true);
        expect(context.activeTracking.number).toBe('NEW-1');
        expect(context.activeTrackingHistory).toHaveLength(2);
    });

    it('enforces 14-day business bounds for supplier range save', () => {
        const context = {
            supplierBusinessBounds: methods.supplierBusinessBounds,
            isRangeValid: methods.isRangeValid,
            rangeToDays: methods.rangeToDays,
            isRangeChanged: methods.isRangeChanged,
            hasValidNeuerLieferterminRange: () => true,
        };

        const today = new Date();
        const plus = (d) => {
            const c = new Date(today);
            c.setDate(c.getDate() + d);
            return c.toISOString().slice(0, 10);
        };

        const order = {};
        const validTarget = {
            lieferterminLieferantRange: { from: plus(1), to: plus(14) },
            originalLieferterminLieferantRange: { from: null, to: null },
        };
        const invalidTarget = {
            lieferterminLieferantRange: { from: plus(0), to: plus(14) },
            originalLieferterminLieferantRange: { from: null, to: null },
        };

        expect(methods.canSaveLiefertermin.call(context, order, validTarget)).toBe(true);
        expect(methods.canSaveLiefertermin.call(context, order, invalidTarget)).toBe(false);
    });

    it('does not notify on initial task snapshot to avoid false positives on reload', () => {
        const createNotificationInfo = jest.fn();
        const context = {
            extractAdditionalDeliveryRequestTaskStatusByPosition: methods.extractAdditionalDeliveryRequestTaskStatusByPosition,
            isAdditionalDeliveryRequestTaskClosed: methods.isAdditionalDeliveryRequestTaskClosed,
            createNotificationInfo,
            additionalRequestTaskStatusByPosition: {},
            additionalRequestTaskInitialized: false,
            $t: (key) => key,
        };

        methods.handleAdditionalDeliveryRequestTaskTransitions.call(context, [{
            positions: [{
                id: 'position-1',
                additionalDeliveryRequestTask: { status: 'done', initiator: 'John Doe', closedAt: '2025-01-01 10:00:00' },
            }],
        }]);

        expect(createNotificationInfo).not.toHaveBeenCalled();
        expect(context.additionalRequestTaskInitialized).toBe(true);
        expect(context.additionalRequestTaskStatusByPosition['position-1'].status).toBe('done');
    });

    it('notifies only when additional delivery request task really transitions to done/cancelled', () => {
        const createNotificationInfo = jest.fn();
        const context = {
            extractAdditionalDeliveryRequestTaskStatusByPosition: methods.extractAdditionalDeliveryRequestTaskStatusByPosition,
            isAdditionalDeliveryRequestTaskClosed: methods.isAdditionalDeliveryRequestTaskClosed,
            createNotificationInfo,
            additionalRequestTaskStatusByPosition: {
                'position-1': { status: 'open', closedAt: null, initiator: 'Jane Doe' },
            },
            additionalRequestTaskInitialized: true,
            $t: (key) => key,
        };

        methods.handleAdditionalDeliveryRequestTaskTransitions.call(context, [{
            positions: [{
                id: 'position-1',
                additionalDeliveryRequestTask: { status: 'cancelled', initiator: 'Jane Doe', closedAt: '2025-01-02 10:00:00' },
            }],
        }]);

        expect(createNotificationInfo).toHaveBeenCalledTimes(1);
        expect(createNotificationInfo.mock.calls[0][0].message).toContain('lieferzeiten.additionalRequest.notificationClosed');

        methods.handleAdditionalDeliveryRequestTaskTransitions.call(context, [{
            positions: [{
                id: 'position-1',
                additionalDeliveryRequestTask: { status: 'cancelled', initiator: 'Jane Doe', closedAt: '2025-01-02 10:00:00' },
            }],
        }]);

        expect(createNotificationInfo).toHaveBeenCalledTimes(1);
    });

    it('returns null initiator when Shopware session user is not an object', () => {
        const originalShopware = global.Shopware;
        global.Shopware = {
            ...originalShopware,
            Context: { api: { user: null } },
            Store: { get: jest.fn(() => ({ currentUser: 'admin' })) },
            State: { get: jest.fn(() => null) },
        };

        const result = methods.resolveAdditionalRequestInitiator.call({
            $t: (key) => key,
        });

        expect(result).toBeNull();
    });


    it('falls back to session user when context user is malformed', () => {
        const originalShopware = global.Shopware;
        global.Shopware = {
            ...originalShopware,
            Context: { api: { user: 'invalid-context-user' } },
            Store: { get: jest.fn(() => ({ currentUser: { id: ' session-1 ', firstName: 'Grace', lastName: 'Hopper' } })) },
            State: { get: jest.fn(() => null) },
        };

        const result = methods.resolveAdditionalRequestInitiator.call({
            $t: (key) => key,
        });

        expect(result).toEqual({
            userId: 'session-1',
            display: 'Grace Hopper',
        });
    });

    it('resolves initiator from valid Shopware context user', () => {
        const originalShopware = global.Shopware;
        global.Shopware = {
            ...originalShopware,
            Context: { api: { user: { id: ' user-1 ', firstName: 'Ada', lastName: 'Lovelace' } } },
            Store: { get: jest.fn(() => null) },
            State: { get: jest.fn(() => null) },
        };

        const result = methods.resolveAdditionalRequestInitiator.call({
            $t: (key) => key,
        });

        expect(result).toEqual({
            userId: 'user-1',
            display: 'Ada Lovelace',
        });
    });


    it('runs the delivery editing flow on one page (supplier date, new date, comment and package status)', async () => {
        const service = {
            updateLieferterminLieferant: jest.fn(async () => ({})),
            updateNeuerLieferterminByPaket: jest.fn(async () => ({})),
            updateComment: jest.fn(async () => ({})),
            updatePaketStatus: jest.fn(async () => ({})),
        };
        const context = {
            hasEditAccess: () => true,
            canSaveLiefertermin: () => true,
            canSaveNeuerLiefertermin: () => true,
            canSaveComment: () => true,
            canUpdateOrderStatus: () => true,
            ensureCommentTargetPositionId: () => 'position-1',
            resolveConcurrencyToken: () => 'token-1',
            reloadOrder: jest.fn(async () => ({})),
            handleConflictError: () => false,
            createNotificationSuccess: jest.fn(),
            createNotificationWarning: jest.fn(),
            createNotificationError: jest.fn(),
            lieferzeitenOrdersService: service,
            statusUpdateLoadingByOrder: {},
            $set: (obj, key, value) => {
                obj[key] = value;
            },
            $t: (key) => key,
        };

        const order = {
            id: 'order-1',
            selectedManualStatus: 8,
            comment: 'Bitte priorisieren',
        };
        const position = {
            id: 'position-1',
            lieferterminLieferantRange: { from: '2026-03-01', to: '2026-03-07' },
        };
        const parcel = {
            id: 'parcel-1',
            neuerLieferterminRange: { from: '2026-03-08', to: '2026-03-12' },
        };

        await methods.saveLiefertermin.call(context, order, position);
        await methods.saveNeuerLiefertermin.call(context, order, parcel);
        await methods.saveComment.call(context, order);
        await methods.saveOrderStatus.call(context, order);

        expect(service.updateLieferterminLieferant).toHaveBeenCalledWith('position-1', expect.objectContaining({ from: '2026-03-01', to: '2026-03-07', updatedAt: 'token-1' }));
        expect(service.updateNeuerLieferterminByPaket).toHaveBeenCalledWith('parcel-1', expect.objectContaining({ from: '2026-03-08', to: '2026-03-12', updatedAt: 'token-1' }));
        expect(service.updateComment).toHaveBeenCalledWith('position-1', expect.objectContaining({ comment: 'Bitte priorisieren', updatedAt: 'token-1' }));
        expect(service.updatePaketStatus).toHaveBeenCalledWith('order-1', expect.objectContaining({ status: 8, updatedAt: 'token-1' }));
        expect(context.reloadOrder).toHaveBeenCalledTimes(4);
    });

});
