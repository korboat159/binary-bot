import * as actions from '../../constants/actions';
import initProposals from '../../actions/initProposals';

const start = ({ data, store }) => {
    store.dispatch(initProposals(data));
    store.dispatch({ type: actions.START, data });
};

export default start;
