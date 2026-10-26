import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// GAS Proxy endpoint to circumvent browser CORS & redirect issues
app.all('/api/gas-proxy', async (req: Request, res: Response) => {
  try {
    const targetUrl = (req.query.url as string) || (req.body && req.body._targetUrl);

    if (!targetUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing target URL parameter (?url=https://script.google.com/macros/s/.../exec)',
      });
    }

    if (!targetUrl.startsWith('https://script.google.com/') && !targetUrl.startsWith('https://script.googleusercontent.com/')) {
      return res.status(400).json({
        success: false,
        error: 'URL must belong to Google Apps Script (https://script.google.com/...)',
      });
    }

    const method = req.method;
    let fetchOptions: RequestInit = {
      method: method === 'GET' ? 'GET' : 'POST',
      redirect: 'follow',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    };

    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      const payload = { ...req.body };
      delete payload._targetUrl;
      
      fetchOptions = {
        ...fetchOptions,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify(payload),
      };
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        return res.status(response.status).json(json);
      } catch {
        return res.status(response.status).send(text);
      }
    } else {
      // Sometimes GAS returns JSON wrapped in HTML or text
      try {
        const json = JSON.parse(text);
        return res.status(response.status).json(json);
      } catch {
        return res.status(response.status).send(text);
      }
    }
  } catch (error: any) {
    console.error('GAS Proxy Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to proxy request to Google Apps Script',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
