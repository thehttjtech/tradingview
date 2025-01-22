// Datafeed implementation
import Datafeed from './datafeed.js';

window.tvWidget = new TradingView.widget({
	symbol: 'USDJPY',             // Default symbol
	interval: '1',                         // Default interval
	fullscreen: true,                       // Displays the chart in the fullscreen mode
	container: 'tv_chart_container',        // Reference to an attribute of the DOM element
	datafeed: Datafeed,
	library_path: '../charting_library_cloned_data/charting_library/',
	timezone: 'Europe/Athens'
});
