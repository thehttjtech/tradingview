import {
	makeApiRequest,
	generateSymbol,
	parseFullSymbol,
} from './helpers.js';
import {
	subscribeOnStream,
	unsubscribeFromStream,
} from './streaming.js';

const lastBarsCache = new Map();

// DatafeedConfiguration implementation
let configurationData = {
	// Represents the resolutions for bars supported by your datafeed
	supported_resolutions: ['1', '1D', '1W', '1M'],

	// The `exchanges` arguments are used for the `searchSymbols` method if a user selects the exchange
	exchanges: [{
		value: 'IS6',
		name: 'IS6',
		desc: 'IS6',
	},
	],
	// The `symbols_types` arguments are used for the `searchSymbols` method if a user selects this symbol type
	symbols_types: [{
		name: 'forex',
		value: 'forex',
	},
	{
		name: 'crypto',
		value: 'crypto',
	},
	],

	timezone: {
		name: 'Europe/Athens',
		offset: 2,
	}
};

async function fetchConfig() {
	try {
		const config = await makeApiRequest('trading-view/mt4/config');
		configurationData = { 
			...configurationData, 
			...config,
		};

		console.log('[fetchConfig]: Configuration updated', configurationData);
	} catch (error) {
		console.error('[fetchConfig]: Error fetching config', error);
	}
}

fetchConfig();

// Obtains all symbols for all exchanges supported by CryptoCompare API
async function getAllSymbols() {
	const data = await makeApiRequest('trading-view/mt4/all-symbols');
	let allSymbols = [];

	for (const item of data.items) {
		allSymbols = [...allSymbols, {
			symbol: item.symbol,
			full_name: `IS6:${item.symbol}`,
			description: item.symbol,
			exchange: 'IS6',
			type: item.type,
		}];
	}

	console.log('[getAllSymbols]: Method call', allSymbols);
	return allSymbols;
}

export default {
	onReady: (callback) => {
		console.log('[onReady]: Method call');
		setTimeout(() => callback(configurationData));
	},

	searchSymbols: async (
		userInput,
		exchange,
		symbolType,
		onResultReadyCallback,
	) => {
		console.log('[searchSymbols]: Method call');
		const symbols = await getAllSymbols();
		const newSymbols = symbols.filter(symbol => {
			const isExchangeValid = exchange === '' || symbol.exchange === exchange;
			const isFullSymbolContainsInput = symbol.full_name
				.toLowerCase()
				.indexOf(userInput.toLowerCase()) !== -1;
			return isExchangeValid && isFullSymbolContainsInput;
		});
		onResultReadyCallback(newSymbols);
	},

	resolveSymbol: async (
		symbolName,
		onSymbolResolvedCallback,
		onResolveErrorCallback,
		extension
	) => {
		console.log('[resolveSymbol]: Method call', symbolName);
		const symbols = await getAllSymbols();
		const symbolItem = symbols.find(({symbol}) => symbol === symbolName);
		if (!symbolItem) {
			console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
			onResolveErrorCallback('cannot resolve symbol');
			return;
		}
		// Symbol information object
		const symbolInfo = {
			ticker: symbolItem.full_name,
			name: symbolItem.symbol,
			description: symbolItem.description,
			type: symbolItem.type,
			session: '24x7',
			timezone: 'Etc/UTC',
			exchange: symbolItem.exchange,
			minmov: 1,
			pricescale: 100,
			has_intraday: true, //true => support time scale
			has_no_volume: true,
			has_weekly_and_monthly: false,
			supported_resolutions: configurationData.supported_resolutions,
			volume_precision: 2,
			data_status: 'streaming',
		};
		console.log(symbolInfo);

		console.log('[resolveSymbol]: Symbol resolved', symbolName);
		onSymbolResolvedCallback(symbolInfo);
	},

	getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
		console.log('periodParams', periodParams);
		const { from, to, firstDataRequest } = periodParams;
		console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
		const parsedSymbol = parseFullSymbol(symbolInfo.full_name);
		// const urlParameters = {
		// 	e: parsedSymbol.exchange,
		// 	fsym: parsedSymbol.fromSymbol,
		// 	tsym: parsedSymbol.toSymbol,
		// 	toTs: to,
		// 	limit: 2000,
		// };

		const utcToLocal = (timestamp, offsetHours) => {
			return timestamp + offsetHours * 3600;
		};
		
		const localFrom = utcToLocal(from, configurationData.timezone.offset);
		const localTo = utcToLocal(to, configurationData.timezone.offset);

		const urlParameters = {
			symbol: symbolInfo.name,
			from: localFrom,
			to: localTo,
			resolution,
		}
		const query = Object.keys(urlParameters)
			.map(name => `${name}=${encodeURIComponent(urlParameters[name])}`)
			.join('&');
		try {
			const data = await makeApiRequest(`trading-view/mt4/history?${query}`);
		
			if (data.s && data.s === 'Error' || data.length === 0) {
				// "noData" should be set if there is no data in the requested period
				onHistoryCallback([], {
					noData: true,
				});
				return;
			}
			let bars = [];
			data.t.map((time, index) => {
				if (time >= localFrom && time < localTo) {
					bars.push({
						time: time * 1000,
						low: data.l[index],
						high: data.h[index],
						open: data.o[index],
						close: data.c[index],
						volume: data.v[index],
					});
				}
			});
			console.log('[getBars]: Get history', bars);

			if (firstDataRequest) {
				lastBarsCache.set(symbolInfo.name, {
					...bars[bars.length - 1],
				});
			}
			console.log('[getBars]: Last bar cache', lastBarsCache);

			onHistoryCallback(bars, {
				noData: false,
			});

		} catch (error) {
			console.log('[getBars]: Get error', error);
			onErrorCallback(error);
		}
	},

	subscribeBars: (
		symbolInfo,
		resolution,
		onRealtimeCallback,
		subscriberUID,
		onResetCacheNeededCallback,
	) => {
		console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
		subscribeOnStream(
			symbolInfo,
			resolution,
			onRealtimeCallback,
			subscriberUID,
			onResetCacheNeededCallback,
			lastBarsCache.get(symbolInfo.name),
		);
	},

	unsubscribeBars: (subscriberUID) => {
		console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
		unsubscribeFromStream(subscriberUID);
	},
};
