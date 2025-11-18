/**
 * Netlify Edge Function to proxy WakaTime API requests
 * This eliminates CORS errors by forwarding browser requests to WakaTime's API
 * from a server-side context where CORS restrictions don't apply.
 */

export default async (request: Request) => {
	// Extract the path after /api/wakatime/
	const url = new URL(request.url);
	const wakatimePath = url.pathname.replace('/api/wakatime', '');
	const queryString = url.search;

	// Construct the target WakaTime API URL
	const targetUrl = `https://wakatime.com/api/v1${wakatimePath}${queryString}`;

	try {
		// Forward the Authorization header from the client
		const headers = new Headers();
		const authHeader = request.headers.get('Authorization');
		if (authHeader) {
			headers.set('Authorization', authHeader);
		}

		// Set User-Agent to identify our proxy
		headers.set('User-Agent', 'Work-Hours-Calculator-Netlify-Proxy/1.0');

		// Forward the request to WakaTime API
		const response = await fetch(targetUrl, {
			method: request.method,
			headers: headers,
		});

		// Handle specific error cases
		if (response.status === 401) {
			return new Response(
				JSON.stringify({
					error: 'Invalid API key. Please check your WakaTime settings.',
				}),
				{
					status: 401,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		}

		if (response.status === 404) {
			return new Response(
				JSON.stringify({
					error: 'Resource not found. Please check your project name.',
				}),
				{
					status: 404,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
					},
				}
			);
		}

		if (response.status === 429) {
			return new Response(
				JSON.stringify({
					error: 'Rate limit exceeded. Please wait a moment before trying again.',
				}),
				{
					status: 429,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Retry-After': response.headers.get('Retry-After') || '60',
					},
				}
			);
		}

		// Get the response body
		const data = await response.text();

		// Return the proxied response with CORS headers
		return new Response(data, {
			status: response.status,
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Authorization, Content-Type',
			},
		});
	} catch (error) {
		// Handle network or unexpected errors
		console.error('Edge function error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to connect to WakaTime API. Please try again later.',
			}),
			{
				status: 502,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			}
		);
	}
};

// Handle preflight CORS requests
export const config = {
	path: '/api/wakatime/*',
};
