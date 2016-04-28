Bot.Config = function Config(){
	return {
		lists: { 
			PAYOUTTYPE: [["Payout", "payout"], ["Stake", "stake"]],
			CURRENCY: [["USD", "USD"], ["EUR", "EUR"], ["GBP", "GBP"], ["AUD", "AUD"]],
			DETAILS: [['statement', '1'], ['ask price', '2'], ['payout', '3'], ['profit', '4'], ['contract type', '5'], ['entry spot', '6'], ['entry value', '7'], ['exit spot', '8'], ['exit value', '9'], ['barrier', '10'], ],
		}, 

		opposites: {
			UPDOWN: [{'CALL': 'Up'}, {'PUT': 'Down'}],
			ASIAN: [{'ASIANU': 'Asian Up'}, {'ASIAND': 'Asian Down'}],
			MATCHESDIFFERS: [{'DIGITMATCH': 'Matches'}, {'DIGITDIFF': 'Differs'}],
			EVENODD: [{'DIGITEVEN': 'Even'}, {'DIGITODD': 'Odd'}],
			OVERUNDER: [{'DIGITOVER': 'Over'}, {'DIGITUNDER': 'Under'}],
		},

		opposites_have_barrier: [
			'MATCHESDIFFERS',
			'OVERUNDER',
		],

		conditions: ['updown', 'asian', 'matchesdiffers', 'evenodd', 'overunder'],
		ticktrade_markets: ['r_25', 'r_50', 'r_75', 'r_100', 'rdbear', 'rdbull'],
		ticktrade_market_names: ['Volatility 25 Index', 'Volatility 50 Index', 'Volatility 75 Index', 'Volatility 100 Index', 'Bear Market Index', 'Bull Market Index'],
	};
};