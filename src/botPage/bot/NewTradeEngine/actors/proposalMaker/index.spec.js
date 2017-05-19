import createStore from '../../createStore';
import * as states from '../../constants/states';
import * as actions from '../../constants/actions';
import proposalMaker from './';

describe('proposalMaker actor', () => {
    const store = createStore();
    const data = {
        candleInterval: 60,
        contractTypes : ['DIGITEVEN', 'DIGITODD'],
        symbol        : 'R_100',
        amount        : 1,
        currency      : 'USD',
        duration      : 5,
        duration_unit : 't',
    };
    it('should request for proposals then RECEIVE_PROPOSALS', async () => {
        store.dispatch({ type: actions.START, data });
        store.dispatch({ type: actions.REQUEST_TWO_PROPOSALS });
        await proposalMaker({ store });
        const { stage } = store.getState();
        expect(stage).toEqual(states.PROPOSALS_READY);
    });
    it('should not change the state after PURCHASING', async () => {
        store.dispatch({ type: actions.REQUEST_PURCHASE });
        await proposalMaker({ store });
        const { stage } = store.getState();
        expect(stage).toEqual(states.PURCHASING);
    });
});
