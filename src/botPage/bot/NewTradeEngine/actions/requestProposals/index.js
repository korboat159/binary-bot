import * as actions from '../../constants/actions';
import { tradeOptionToProposal, doUntilDone, getUUID } from '../../../tools';

const isTradeOptionTheSame = (oldOpt, newOpt) =>
    [
        'contractTypes',
        'symbol',
        'duration',
        'duration_unit',
        'amount',
        'currency',
        'prediction',
        'barrierOffset',
        'secondBarrierOffset',
    ].every(field => {
        if (oldOpt[field] === newOpt[field]) {
            return true;
        } else if (field === 'contractTypes') {
            try {
                const [oldType1, oldType2] = oldOpt[field];
                const [type1, type2] = newOpt[field];
                return type1 === oldType1 && type2 === oldType2;
            } catch (e) {
                return false;
            }
        }
        return false;
    });

const requestProposals = tradeOption => (dispatch, getState, { api }) => {
    const { tradeOption: oldTradeOption } = getState();

    if (isTradeOptionTheSame(oldTradeOption, tradeOption)) {
        return;
    }

    const { contractTypes } = tradeOption;

    if (contractTypes.length === 2) {
        dispatch({ type: actions.REQUEST_TWO_PROPOSALS });
    } else if (contractTypes.length === 1) {
        dispatch({ type: actions.REQUEST_ONE_PROPOSAL });
    }

    tradeOptionToProposal(tradeOption).map(proposal =>
        doUntilDone(() =>
            api.subscribeToPriceForContractProposal({
                ...proposal,
                passthrough: {
                    contractType: proposal.contract_type,
                    uuid        : getUUID(),
                },
            })
        )
    );

    api.events.on('proposal', r => dispatch({ type: actions.UPDATE_PROPOSAL, data: r }));
};

export default requestProposals;
