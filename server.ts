import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { DEFAULT_UBU_LOCATIONS } from './src/data/defaultLocations';
import type { UbuLocation, VolunteerLog, SurveyRecord } from './src/types/ubuCondom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'ubu-store.json');

const MOCK_VOLUNTEER_IDS = new Set(['vol-101', 'vol-102', 'vol-103', 'vol-104', 'vol-105']);
const MOCK_SURVEY_IDS = new Set([
  'sur-101', 'sur-102', 'sur-103', 'sur-104',
  'sur-105', 'sur-106', 'sur-107', 'sur-108',
]);

interface StoreState {
  initialized: boolean;
  locations: UbuLocation[];
  volunteerLogs: VolunteerLog[];
  surveys: SurveyRecord[];
  gasUrl: string;
  updatedAt: string;
}

function getBangkokTimestamp(): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

function createInitialStore(): StoreState {
  return {
    initialized: false,
    locations: DEFAULT_UBU_LOCATIONS.map(l => ({ ...l })),
    volunteerLogs: [],
    surveys: [],
    gasUrl: process.env.GAS_WEBAPP_URL || '',
    updatedAt: getBangkokTimestamp(),
  };
}

function loadStore(): StoreState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        initialized: Boolean(parsed.initialized),
        locations: Array.isArray(parsed.locations) && parsed.locations.length > 0
          ? parsed.locations
          : DEFAULT_UBU_LOCATIONS.map(l => ({ ...l })),
        volunteerLogs: Array.isArray(parsed.volunteerLogs) ? parsed.volunteerLogs : [],
        surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
        gasUrl: typeof parsed.gasUrl === 'string' ? parsed.gasUrl : (process.env.GAS_WEBAPP_URL || ''),
        updatedAt: parsed.updatedAt || getBangkokTimestamp(),
      };
    }
  } catch (err) {
    console.error('Failed to load store file, initializing clean store:', err);
  }
  const initial = createInitialStore();
  saveStore(initial);
  return initial;
}

function saveStore(state: StoreState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    state.updatedAt = getBangkokTimestamp();
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err) {
    console.error('Failed to save store file:', err);
  }
}

let store: StoreState = loadStore();

function getPublicState() {
  return {
    initialized: store.initialized,
    locations: store.locations,
    volunteerLogs: store.volunteerLogs,
    surveys: store.surveys,
    gasUrl: store.gasUrl,
    updatedAt: store.updatedAt,
  };
}

function makeLogSignature(log: VolunteerLog): string {
  return [
    String(log.date || '').trim(),
    String(log.name || '').trim(),
    String(log.studentId || '').trim(),
    String(log.location || '').trim(),
    Number(log.lubricant || 0),
    Number(log.size49 || 0),
    Number(log.size52 || 0),
    Number(log.size54 || 0),
    Number(log.size56 || 0),
  ].join('|');
}

async function forwardToGas(targetUrl: string, payload: Record<string, any>): Promise<any | null> {
  if (!targetUrl || (!targetUrl.startsWith('https://script.google.com/') && !targetUrl.startsWith('https://script.googleusercontent.com/'))) {
    return null;
  }
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (err) {
    console.error('GAS forward error:', err);
    return null;
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// WebSocket Server for true real-time synchronization across all connected browsers/devices
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

interface HeartbeatWebSocket extends WebSocket {
  isAlive?: boolean;
}

wss.on('connection', (ws: HeartbeatWebSocket) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Immediately push authoritative server state to newly connected client
  try {
    ws.send(JSON.stringify({ type: 'state:init', data: getPublicState() }));
  } catch {
    // Ignore send errors on closing socket
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg?.type === 'state:request') {
        ws.send(JSON.stringify({ type: 'state:sync', data: getPublicState() }));
      }
    } catch {
      // Ignore malformed client messages
    }
  });
});

// Keep-alive heartbeat to prune stale WebSocket connections cleanly
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    const sock = client as HeartbeatWebSocket;
    if (sock.isAlive === false) {
      sock.terminate();
      return;
    }
    sock.isAlive = false;
    sock.ping();
  });
}, 25000);

wss.on('close', () => {
  clearInterval(wsHeartbeat);
});

function broadcastState(): void {
  const message = JSON.stringify({
    type: 'state:sync',
    data: getPublicState(),
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch {
        // Ignore individual client write failures
      }
    }
  });
}

// =========================================================================
// Shared Persistent State API (Preserves existing data, never re-seeds mocks)
// =========================================================================

app.get('/api/data', (_req: Request, res: Response) => {
  res.json({
    success: true,
    ...getPublicState(),
  });
});

// One-time safe migration from an existing admin browser ONLY if server store is not yet initialized
app.post('/api/bootstrap', (req: Request, res: Response) => {
  if (store.initialized) {
    return res.json({
      success: true,
      bootstrapped: false,
      ...getPublicState(),
    });
  }

  const { locations, volunteerLogs, surveys, gasUrl } = req.body || {};

  if (Array.isArray(locations) && locations.length > 0) {
    store.locations = locations;
  }
  if (Array.isArray(volunteerLogs)) {
    // Keep only real user-entered records; exclude auto-generated mock IDs
    store.volunteerLogs = volunteerLogs.filter((l: VolunteerLog) => !MOCK_VOLUNTEER_IDS.has(String(l.id || '')));
  }
  if (Array.isArray(surveys)) {
    store.surveys = surveys.filter((s: SurveyRecord) => !MOCK_SURVEY_IDS.has(String(s.id || '')));
  }
  if (typeof gasUrl === 'string' && gasUrl.trim()) {
    store.gasUrl = gasUrl.trim();
  }

  store.initialized = true;
  saveStore(store);
  broadcastState();

  return res.json({
    success: true,
    bootstrapped: true,
    ...getPublicState(),
  });
});

// Student/Public: Report condom dispenser empty
app.post('/api/report-empty', async (req: Request, res: Response) => {
  const { locationName } = req.body || {};
  if (!locationName || typeof locationName !== 'string') {
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อจุดบริการ' });
  }

  const now = getBangkokTimestamp();
  store.locations = store.locations.map(loc =>
    loc.name === locationName ? { ...loc, status: 'หมดแล้ว', lastUpdated: now } : loc
  );
  store.initialized = true;
  saveStore(store);
  broadcastState();

  const gasRes = store.gasUrl
    ? await forwardToGas(store.gasUrl, { action: 'reportOut', locationName })
    : null;

  return res.json({
    success: true,
    locations: store.locations,
    message: (gasRes && gasRes.message) || `อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`,
  });
});

// Student/Public: Submit satisfaction survey
app.post('/api/survey', async (req: Request, res: Response) => {
  const { rating, feedback } = req.body || {};
  const numericRating = Math.min(5, Math.max(1, Number(rating) || 5));
  const cleanFeedback = typeof feedback === 'string' ? feedback.trim() : '';

  const newSurvey: SurveyRecord = {
    id: `sur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: getBangkokTimestamp(),
    rating: numericRating,
    feedback: cleanFeedback,
  };

  store.surveys = [newSurvey, ...store.surveys];
  store.initialized = true;
  saveStore(store);
  broadcastState();

  if (store.gasUrl) {
    await forwardToGas(store.gasUrl, {
      action: 'submitSurvey',
      rating: numericRating,
      feedback: cleanFeedback,
    });
  }

  return res.json({
    success: true,
    survey: newSurvey,
    surveys: store.surveys,
  });
});

// Volunteer: Submit replenishment form & auto-set location status to "มีอยู่"
app.post('/api/volunteer', async (req: Request, res: Response) => {
  const { formData, photoBase64, fileName, mimeType } = req.body || {};
  if (!formData || !formData.name || !formData.location) {
    return res.status(400).json({
      success: false,
      error: 'ข้อมูลผู้ปฏิบัติงานหรือจุดบริการไม่ครบถ้วน',
    });
  }

  const now = getBangkokTimestamp();
  let finalImageUrl = photoBase64
    ? `data:${mimeType || 'image/jpeg'};base64,${photoBase64}`
    : '';

  if (store.gasUrl) {
    const gasRes = await forwardToGas(store.gasUrl, {
      action: 'volunteerReplenish',
      data: formData,
      photoBase64: photoBase64 || '',
      photoFileName: fileName || '',
      photoMimeType: mimeType || 'image/jpeg',
    });
    if (gasRes && typeof gasRes.imageUrl === 'string' && gasRes.imageUrl.startsWith('http')) {
      finalImageUrl = gasRes.imageUrl;
    }
  }

  const newLog: VolunteerLog = {
    id: `vol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: now,
    name: String(formData.name).trim(),
    year: String(formData.year || ''),
    faculty: String(formData.faculty || ''),
    studentId: String(formData.studentId || ''),
    location: String(formData.location),
    lubricant: Math.max(0, Number(formData.lubricant) || 0),
    size49: Math.max(0, Number(formData.size49) || 0),
    size52: Math.max(0, Number(formData.size52) || 0),
    size54: Math.max(0, Number(formData.size54) || 0),
    size56: Math.max(0, Number(formData.size56) || 0),
    comment: String(formData.comment || '').trim() || '-',
    imageUrl: finalImageUrl,
  };

  store.locations = store.locations.map(loc =>
    loc.name === formData.location ? { ...loc, status: 'มีอยู่', lastUpdated: now } : loc
  );
  store.volunteerLogs = [newLog, ...store.volunteerLogs];
  store.initialized = true;
  saveStore(store);
  broadcastState();

  return res.json({
    success: true,
    log: newLog,
    locations: store.locations,
    volunteerLogs: store.volunteerLogs,
    message: `บันทึกเติมของสำเร็จ! อัปเดตสถานะจุด "${formData.location}" เป็น 'มีอยู่' อัตโนมัติแล้ว`,
  });
});

// Admin: Toggle location status
app.post('/api/admin/locations/toggle', async (req: Request, res: Response) => {
  const { locationName, currentStatus } = req.body || {};
  const nextStatus = currentStatus === 'มีอยู่' ? 'หมดแล้ว' : 'มีอยู่';
  const now = getBangkokTimestamp();

  store.locations = store.locations.map(loc =>
    loc.name === locationName ? { ...loc, status: nextStatus, lastUpdated: now } : loc
  );
  store.initialized = true;
  saveStore(store);
  broadcastState();

  if (store.gasUrl) {
    await forwardToGas(store.gasUrl, {
      action: 'toggleStatus',
      locationName,
      newStatus: nextStatus,
    });
  }

  return res.json({ success: true, locations: store.locations, nextStatus });
});

// Admin: Add location
app.post('/api/admin/locations', (req: Request, res: Response) => {
  const newLoc = req.body;
  if (!newLoc || !newLoc.name) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อจุดบริการ' });
  }
  const created: UbuLocation = {
    id: Date.now(),
    name: String(newLoc.name).trim(),
    status: newLoc.status === 'หมดแล้ว' ? 'หมดแล้ว' : 'มีอยู่',
    lat: Number(newLoc.lat) || 15.1190,
    lng: Number(newLoc.lng) || 104.9060,
    zone: newLoc.zone || '',
    landmark: newLoc.landmark || '',
    lastUpdated: getBangkokTimestamp(),
  };
  store.locations = [created, ...store.locations];
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, location: created, locations: store.locations });
});

// Admin: Edit location
app.put('/api/admin/locations/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const updated = req.body || {};
  store.locations = store.locations.map(loc =>
    String(loc.id) === String(targetId)
      ? { ...loc, ...updated, lastUpdated: getBangkokTimestamp() }
      : loc
  );
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, locations: store.locations });
});

// Admin: Delete location
app.delete('/api/admin/locations/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  store.locations = store.locations.filter(loc => String(loc.id) !== String(targetId));
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, locations: store.locations });
});

// Admin: Reset default locations (preserves volunteerLogs and surveys)
app.post('/api/admin/locations/reset', (_req: Request, res: Response) => {
  store.locations = DEFAULT_UBU_LOCATIONS.map(l => ({ ...l }));
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, locations: store.locations });
});

// Admin: Add single refill log
app.post('/api/admin/logs/add', (req: Request, res: Response) => {
  const newLogData = req.body || {};
  const now = getBangkokTimestamp();
  const newLog: VolunteerLog = {
    id: `admin-refill-${Date.now()}`,
    date: now,
    ...newLogData,
  };
  store.locations = store.locations.map(loc =>
    loc.name === newLogData.location ? { ...loc, status: 'มีอยู่', lastUpdated: now } : loc
  );
  store.volunteerLogs = [newLog, ...store.volunteerLogs];
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, locations: store.locations, volunteerLogs: store.volunteerLogs });
});

// Admin: Batch import volunteer logs from Excel (prevents duplicating existing rows)
app.post('/api/admin/logs/batch', (req: Request, res: Response) => {
  const { logs: importedLogs } = req.body || {};
  if (!Array.isArray(importedLogs) || importedLogs.length === 0) {
    return res.status(400).json({ success: false, error: 'ไม่มีรายการที่จะนำเข้า' });
  }
  const existingIds = new Set(store.volunteerLogs.map(l => String(l.id || '')));
  const existingSigs = new Set(store.volunteerLogs.map(makeLogSignature));

  const uniqueNewLogs: VolunteerLog[] = [];
  for (const item of importedLogs) {
    const id = String(item.id || '');
    const sig = makeLogSignature(item);
    if ((id && existingIds.has(id)) || existingSigs.has(sig)) {
      continue;
    }
    existingIds.add(id);
    existingSigs.add(sig);
    uniqueNewLogs.push(item);
  }

  const now = getBangkokTimestamp();
  if (uniqueNewLogs.length > 0) {
    const refilledLocations = new Set(uniqueNewLogs.map((l: VolunteerLog) => l.location));
    store.locations = store.locations.map(loc =>
      refilledLocations.has(loc.name) ? { ...loc, status: 'มีอยู่', lastUpdated: now } : loc
    );
    store.volunteerLogs = [...uniqueNewLogs, ...store.volunteerLogs];
    store.initialized = true;
    saveStore(store);
    broadcastState();
  }
  return res.json({
    success: true,
    addedCount: uniqueNewLogs.length,
    skippedCount: importedLogs.length - uniqueNewLogs.length,
    locations: store.locations,
    volunteerLogs: store.volunteerLogs,
  });
});

// Admin: Delete single volunteer log
app.delete('/api/admin/logs/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  store.volunteerLogs = store.volunteerLogs.filter(log => log.id !== targetId);
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, volunteerLogs: store.volunteerLogs });
});

// Admin: Clear logs for specific location
app.post('/api/admin/logs/clear-location', (req: Request, res: Response) => {
  const { locationName } = req.body || {};
  store.volunteerLogs = store.volunteerLogs.filter(log => log.location !== locationName);
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, volunteerLogs: store.volunteerLogs });
});

// Admin: Clear all volunteer logs
app.delete('/api/admin/logs', (_req: Request, res: Response) => {
  store.volunteerLogs = [];
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, volunteerLogs: store.volunteerLogs });
});

// Admin: Delete single survey
app.delete('/api/admin/surveys/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  store.surveys = store.surveys.filter(s => s.id !== targetId);
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, surveys: store.surveys });
});

// Admin: Clear all surveys
app.delete('/api/admin/surveys', (_req: Request, res: Response) => {
  store.surveys = [];
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, surveys: store.surveys });
});

// Config: Save GAS URL on server so all devices share it
app.post('/api/config/gas-url', (req: Request, res: Response) => {
  const { gasUrl } = req.body || {};
  store.gasUrl = typeof gasUrl === 'string' ? gasUrl.trim() : '';
  store.initialized = true;
  saveStore(store);
  broadcastState();
  return res.json({ success: true, gasUrl: store.gasUrl });
});

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
  res.json({ status: 'ok', timestamp: new Date().toISOString(), clients: wss.clients.size });
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (HTTP + WebSocket /ws)`);
  });
}

startServer();
