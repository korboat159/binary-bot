import { Map } from 'immutable';
import stage from './';
import * as constants from '../../constants';

const action = (type, data) => ({ type, data });

describe('Stage Reducer', () => {
    let state;
    it('Initial state', () => {
        expect((state = stage(state, action(constants.INVALID)))).toEqual({ name: constants.STOP });
    });
    it('Fatal error occurred during trade', () => {
        expect(stage(constants.STARTED, action(constants.ERROR_OCCURRED))).toEqual({ name: constants.STOP });
    });
    it('Engine initialized with token, and market', () => {
        expect(
            (state = stage(
                state,
                action(constants.INITIALIZE, new Map({ token: 'Token', options: { symbol: 'R_100' } }))
            ))
        ).toEqual({ name: constants.INITIALIZED, data: new Map({ token: 'Token', options: { symbol: 'R_100' } }) });
    });
    it('Engine started', () => {
        expect((state = stage(state, action(constants.START)))).toEqual({ name: constants.STARTED });
    });
    it('All requested proposals are ready', () => {
        expect((state = stage(state, action(constants.PROPOSALS_RECEIVED)))).toEqual({
            name: constants.PROPOSALS_READY,
        });
    });
    it('Purchase failed', () => {
        expect((state = stage(state, action(constants.PURCHASE_FAILED)))).toEqual({ name: constants.STARTED });
    });
    it('Purchase succeeded', () => {
        expect((state = stage(state, action(constants.PURCHASE_SUCCEEDED)))).toEqual({
            name: constants.SUCCESSFUL_PURCHASE,
        });
    });
    it('Open contract received', () => {
        expect((state = stage(state, action(constants.OPEN_CONTRACT_RECEIVED)))).toEqual({
            name: constants.OPEN_CONTRACT,
        });
    });
    it('Sell succeeded', () => {
        expect((state = stage(state, action(constants.SELL_SUCCEEDED)))).toEqual({ name: constants.INITIALIZED });
    });
});