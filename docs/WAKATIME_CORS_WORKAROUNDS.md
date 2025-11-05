# WakaTime Integration - CORS Limitation & Workarounds

## Issue

The WakaTime API does not support CORS (Cross-Origin Resource Sharing) for direct browser requests. This means the browser blocks requests from `localhost:5173` to `wakatime.com/api/v1` for security reasons.

### Error Message

```
Access to fetch at 'https://wakatime.com/api/v1/...' from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Workarounds

### Option 1: Use a Backend Proxy Server (Recommended)

Create a simple backend server that proxies requests to WakaTime API:

**Node.js/Express Example:**

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/wakatime/*', async (req, res) => {
  const apiKey = req.headers.authorization;
  const path = req.params[0];
  
  try {
    const response = await fetch(`https://wakatime.com/api/v1/${path}`, {
      headers: {
        'Authorization': apiKey
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

app.listen(3000, () => console.log('Proxy running on port 3000'));
```

Then update `src/utils/wakatimeApi.ts`:

```typescript
const BASE_URL = 'http://localhost:3000/api/wakatime';
```

### Option 2: Use Vite Proxy Configuration

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/wakatime': {
        target: 'https://wakatime.com/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wakatime/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Forward the Authorization header
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
        }
      }
    }
  }
});
```

Then update the base URL in development:

```typescript
const BASE_URL = import.meta.env.DEV ? '/api/wakatime' : 'https://wakatime.com/api/v1';
```

### Option 3: Browser Extension/CORS Disabler (Development Only)

**⚠️ WARNING: Only use this for local development. Never disable CORS in production!**

Chrome/Edge:

```bash
# Windows
chrome.exe --user-data-dir="C:/Chrome dev session" --disable-web-security --disable-site-isolation-trials

# Mac
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
```

Or install a CORS extension:

- [CORS Unblock](https://chrome.google.com/webstore/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino)
- [Allow CORS](https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf)

### Option 4: Deploy to a Server with Backend

Deploy the app with a proper backend that handles WakaTime API calls server-side:

1. **Netlify Functions**
2. **Vercel Serverless Functions**
3. **AWS Lambda**
4. **Traditional Node.js server**

### Option 5: Use WakaTime Embed/Dashboard

Alternatively, embed WakaTime's official widgets or direct users to their dashboard:

```html
<iframe src="https://wakatime.com/share/@username/project-stats.html" 
        width="100%" height="500px"></iframe>
```

## Recommended Solution for Production

**Create a backend API proxy** (Option 1) or **use serverless functions** (Option 4) to:

1. Keep API keys secure (not exposed in browser)
2. Avoid CORS issues
3. Add caching layer
4. Implement rate limiting
5. Add authentication

## Current Implementation Status

✅ Frontend components implemented
✅ TypeScript types defined
✅ Error handling for CORS
⚠️ **Backend proxy needed for production use**

## Quick Test with Vite Proxy

The easiest way to test locally is to use Vite's proxy:

1. Update `vite.config.ts` (see Option 2 above)
2. Restart dev server: `npm run dev`
3. The proxy will handle CORS for you during development

## References

- [WakaTime API Docs](https://wakatime.com/developers)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Vite Proxy Config](https://vitejs.dev/config/server-options.html#server-proxy)
