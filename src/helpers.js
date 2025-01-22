// Get a CryptoCompare API key CryptoCompare https://www.cryptocompare.com/coins/guides/how-to-use-our-api/
export const apiKey = "7c359d0d3b7f7fb84f7dde00eb1b122a3f7f3cde30721485a21a28e1e08ad286";
// Makes requests to CryptoCompare API
export async function makeApiRequest(path) {
	try {
		const url = new URL(`https://mobile-service-dev.is6.com/${path}`);
		const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjM0NTYsIm10NCI6WzEyMzQ1NiwxMjM0NTZdLCJtdDUiOlsxMjM0NTYsMTIzNDU2XSwiaWF0IjoxNzM3NDUwOTk4LCJleHAiOjE3MzgwNTA5OTh9.MsXrYivljVZp3iugfl6cvIuYYFJRElWNcTnAOtH_Vz8';
		const headers = {
			Authorization: `Bearer ${bearerToken}`,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		  };
		const response = await fetch(url.toString(), { headers });
		return await response.json()
	} catch (error) {
		console.log(error)
		throw new Error(`CryptoCompare request error: ${error.status}`);
	}
}

// Generates a symbol ID from a pair of the coins
export function generateSymbol(exchange, fromSymbol, toSymbol) {
	const short = `${fromSymbol}/${toSymbol}`;
	return {
		short,
		full: `${exchange}:${short}`,
	};
}

// Returns all parts of the symbol
export function parseFullSymbol(fullSymbol) {
	const match = fullSymbol.match(/^(\w+):(\w+)(\w+)$/);
	if (!match) {
		return null;
	}

	return {
		exchange: match[1],
		fromSymbol: match[2],
		toSymbol: match[3],
	};
}
