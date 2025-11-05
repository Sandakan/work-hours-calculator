import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			'/api/wakatime': {
				target: 'https://wakatime.com/api/v1',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/wakatime/, ''),
				configure: (proxy) => {
					proxy.on('proxyReq', (proxyReq, req) => {
						// Forward the Authorization header from the original request
						if (req.headers.authorization) {
							proxyReq.setHeader('Authorization', req.headers.authorization);
						}
					});
				},
			},
		},
	},
});
