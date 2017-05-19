import * as actions from '../../constants/actions';
import * as states from '../../constants/states';
import requestProposals from '../../actions/requestProposals';
import waitForCondition from '../waitForCondition';

const proposalMaker = async ({ store }) => {
    const { stage, tradeOption } = store.getState();
    if (stage !== states.STARTED) {
        return;
    }
    store.dispatch(requestProposals(tradeOption));
    await waitForCondition(
        store,
        state =>
            state.proposalStage === states.TWO_PROPOSALS_RECEIVED ||
            state.proposalStage === states.ONE_PROPOSAL_RECEIVED
    );
    store.dispatch({ type: actions.RECEIVE_PROPOSALS });
};

export default proposalMaker;
