import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { DEFAULT_UBU_LOCATIONS } from './src/data/defaultLocations';
import type {
  UbuLocation,
  VolunteerLog,
  SurveyRecord,
  RealtimeEventInfo,
  ServerStateSnapshot,
} from './src/types/ubuCondom';

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
  revision: number;
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
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function createInitialStore(): StoreState {
  return {
    initialized: false,
    revision: 1,
    locations: DEFAULT_UBU_LOCATIONS.map(l => ({ ...l })),
    volunteerLogs: [],
    surveys: [],
    gasUrl: process.env.GAS_WEBAPP_URL || '',
    updatedAt: getBangkokTimestamp(),
  };
}

let lastWrittenRaw = '';
let isWritingStore = false;

function parseStoreJson(raw: string): StoreState {
  const parsed = JSON.parse(raw);
  return {
    initialized: Boolean(parsed.initialized),
    revision: Number.isFinite(Number(parsed.revision)) ? Number(parsed.revision) : 1,
    locations: Array.isArray(parsed.locations) && parsed.locations.length > 0
      ? parsed.locations
      : DEFAULT_UBU_LOCATIONS.map(l => ({ ...l })),
    volunteerLogs: Array.isArray(parsed.volunteerLogs) ? parsed.volunteerLogs : [],
    surveys: Array.isArray(parsed.surveys) ? parsed.surveys : [],
    gasUrl: typeof parsed.gasUrl === 'string' ? parsed.gasUrl : (process.env.GAS_WEBAPP_URL || ''),
    updatedAt: parsed.updatedAt || getBangkokTimestamp(),
  };
}

function loadStore(): StoreState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      lastWrittenRaw = raw;
      return parseStoreJson(raw);
    }
  } catch (err) {
    console.error('Failed to load store file, initializing clean store:', err);
  }
  const initial = createInitialStore();
  saveStore(initial, false);
  return initial;
}

function saveStore(state: StoreState, bumpRevision = true): void {
  try {
    isWritingStore = true;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (bumpRevision) {
      state.revision = (Number(state.revision) || 0) + 1;
    }
    state.updatedAt = getBangkokTimestamp();
    const serialized = JSON.stringify(state, null, 2);
    lastWrittenRaw = serialized;
    const tmpFile = `${STORE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, serialized, 'utf-8');
    fs.renameSync(tmpFile, STORE_FILE);
  } catch (err) {
    console.error('Failed to save store file:', err);
  } finally {
    isWritingStore = false;
  }
}

let store: StoreState = loadStore();

function getPublicState(lastEvent?: RealtimeEventInfo | null): ServerStateSnapshot {
  return {
    initialized: store.initialized,
    revision: store.revision,
    locations: store.locations,
    volunteerLogs: store.volunteerLogs,
    surveys: store.surveys,
    gasUrl: store.gasUrl,
    updatedAt: store.updatedAt,
    ...(lastEvent ? { lastEvent } : {}),
  };
}

function getClientIdFromReq(req: Request): string | undefined {
  const headerVal = req.headers['x-client-id'];
  if (typeof headerVal === 'string' && headerVal.trim()) return headerVal.trim();
  const bodyVal = req.body?.clientId;
  if (typeof bodyVal === 'string' && bodyVal.trim()) return bodyVal.trim();
  return undefined;
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

// WebSocket + SSE Server for instant real-time synchronization across all connected browsers/devices
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
const sseClients = new Set<Response>();

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
    ws.isAlive = true;
    try {
      const msg = JSON.parse(raw.toString());
      if (msg?.type === 'state:request') {
        ws.send(JSON.stringify({ type: 'state:sync', data: getPublicState() }));
      } else if (msg?.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      }
    } catch {
      // Ignore malformed client messages
    }
  });
});

// Keep-alive heartbeat to prune stale WebSocket & SSE connections cleanly
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

  sseClients.forEach((res) => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      sseClients.delete(res);
    }
  });
}, 20000);

wss.on('close', () => {
  clearInterval(wsHeartbeat);
});

function broadcastState(action?: string, message?: string, clientId?: string): void {
  const eventMeta: RealtimeEventInfo | null =
    action && message
      ? {
          action,
          message,
          clientId,
          timestamp: getBangkokTimestamp(),
        }
      : null;

  const snapshot = getPublicState(eventMeta);
  const wsPayload = JSON.stringify({
    type: 'state:sync',
    data: snapshot,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(wsPayload);
      } catch {
        // Ignore individual client write failures
      }
    }
  });

  const ssePayload = `event: state:sync\ndata: ${JSON.stringify(snapshot)}\n\n`;
  sseClients.forEach((res) => {
    try {
      res.write(ssePayload);
    } catch {
      sseClients.delete(res);
    }
  });
}

// Watch external modifications to data/ubu-store.json so manual edits also push live immediately
fs.watchFile(STORE_FILE, { interval: 1000 }, () => {
  if (isWritingStore) return;
  try {
    if (!fs.existsSync(STORE_FILE)) return;
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    if (raw === lastWrittenRaw) return;
    lastWrittenRaw = raw;
    const nextStore = parseStoreJson(raw);
    nextStore.revision = Math.max(nextStore.revision, (store.revision || 0) + 1);
    store = nextStore;
    broadcastState('external:sync', 'อัปเดตข้อมูลล่าสุดจากฐานข้อมูลกลางแล้ว');
  } catch {
    // Ignore transient partial read
  }
});

// =========================================================================
// Server-Sent Events (SSE) Real-Time Stream (Automatic fallback + backup)
// =========================================================================

app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.add(res);
  res.write(`event: state:init\ndata: ${JSON.stringify(getPublicState())}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

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

  const clientId = getClientIdFromReq(req);
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
  broadcastState('bootstrap', 'ซิงค์ข้อมูลตั้งต้นเข้าสู่ระบบ Real-time แล้ว', clientId);

  return res.json({
    success: true,
    bootstrapped: true,
    ...getPublicState(),
  });
});

// Student/Public: Report condom dispenser empty (instant update & broadcast)
app.post('/api/report-empty', (req: Request, res: Response) => {
  const { locationName } = req.body || {};
  const clientId = getClientIdFromReq(req);
  if (!locationName || typeof locationName !== 'string') {
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อจุดบริการ' });
  }

  const now = getBangkokTimestamp();
  store.locations = store.locations.map(loc =>
    loc.name === locationName ? { ...loc, status: 'หมดแล้ว', lastUpdated: now } : loc
  );
  store.initialized = true;
  saveStore(store);
  broadcastState('report:empty', `จุด "${locationName}" ถูกแจ้งว่าหมดแล้ว`, clientId);

  if (store.gasUrl) {
    void forwardToGas(store.gasUrl, { action: 'reportOut', locationName });
  }

  return res.json({
    success: true,
    ...getPublicState(),
    message: `อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`,
  });
});

// Student/Public: Submit satisfaction survey (instant update & broadcast)
app.post('/api/survey', (req: Request, res: Response) => {
  const { rating, feedback } = req.body || {};
  const clientId = getClientIdFromReq(req);
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
  broadcastState('survey:created', `มีแบบประเมินความพึงพอใจใหม่ (${numericRating} ดาว)`, clientId);

  if (store.gasUrl) {
    void forwardToGas(store.gasUrl, {
      action: 'submitSurvey',
      rating: numericRating,
      feedback: cleanFeedback,
    });
  }

  return res.json({
    success: true,
    survey: newSurvey,
    ...getPublicState(),
  });
});

// Volunteer: Submit replenishment form & auto-set location status to "มีอยู่" immediately
app.post('/api/volunteer', (req: Request, res: Response) => {
  const { formData, photoBase64, fileName, mimeType } = req.body || {};
  const clientId = getClientIdFromReq(req);
  if (!formData || !formData.name || !formData.location) {
    return res.status(400).json({
      success: false,
      error: 'ข้อมูลผู้ปฏิบัติงานหรือจุดบริการไม่ครบถ้วน',
    });
  }

  const now = getBangkokTimestamp();
  const initialImageUrl = photoBase64
    ? `data:${mimeType || 'image/jpeg'};base64,${photoBase64}`
    : '';

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
    imageUrl: initialImageUrl,
  };

  store.locations = store.locations.map(loc =>
    loc.name === formData.location ? { ...loc, status: 'มีอยู่', lastUpdated: now } : loc
  );
  store.volunteerLogs = [newLog, ...store.volunteerLogs];
  store.initialized = true;
  saveStore(store);
  broadcastState('volunteer:replenish', `จิตอาสาเติมของที่ "${formData.location}" แล้ว (มีอยู่)`, clientId);

  if (store.gasUrl) {
    void forwardToGas(store.gasUrl, {
      action: 'volunteerReplenish',
      data: formData,
      photoBase64: photoBase64 || '',
      photoFileName: fileName || '',
      photoMimeType: mimeType || 'image/jpeg',
    }).then((gasRes) => {
      if (gasRes && typeof gasRes.imageUrl === 'string' && gasRes.imageUrl.startsWith('http')) {
        store.volunteerLogs = store.volunteerLogs.map((l) =>
          l.id === newLog.id ? { ...l, imageUrl: gasRes.imageUrl } : l
        );
        saveStore(store);
        broadcastState();
      }
    });
  }

  return res.json({
    success: true,
    log: newLog,
    ...getPublicState(),
    message: `บันทึกเติมของสำเร็จ! อัปเดตสถานะจุด "${formData.location}" เป็น 'มีอยู่' อัตโนมัติแล้ว`,
  });
});

// Admin: Toggle location status
app.post('/api/admin/locations/toggle', (req: Request, res: Response) => {
  const { locationName, currentStatus } = req.body || {};
  const clientId = getClientIdFromReq(req);
  const nextStatus = currentStatus === 'มีอยู่' ? 'หมดแล้ว' : 'มีอยู่';
  const now = getBangkokTimestamp();

  store.locations = store.locations.map(loc =>
    loc.name === locationName ? { ...loc, status: nextStatus, lastUpdated: now } : loc
  );
  store.initialized = true;
  saveStore(store);
  broadcastState('location:toggled', `แอดมินปรับสถานะ "${locationName}" เป็น '${nextStatus}'`, clientId);

  if (store.gasUrl) {
    void forwardToGas(store.gasUrl, {
      action: 'toggleStatus',
      locationName,
      newStatus: nextStatus,
    });
  }

  return res.json({ success: true, nextStatus, ...getPublicState() });
});

// Admin: Add location
app.post('/api/admin/locations', (req: Request, res: Response) => {
  const newLoc = req.body;
  const clientId = getClientIdFromReq(req);
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
  broadcastState('location:added', `เพิ่มจุดบริการใหม่ "${created.name}" แล้ว`, clientId);
  return res.json({ success: true, location: created, ...getPublicState() });
});

// Admin: Edit location
app.put('/api/admin/locations/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const clientId = getClientIdFromReq(req);
  const updated = req.body || {};
  store.locations = store.locations.map(loc =>
    String(loc.id) === String(targetId)
      ? { ...loc, ...updated, lastUpdated: getBangkokTimestamp() }
      : loc
  );
  store.initialized = true;
  saveStore(store);
  broadcastState('location:updated', `อัปเดตข้อมูลจุดบริการ "${updated.name || targetId}" แล้ว`, clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Delete location
app.delete('/api/admin/locations/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const clientId = getClientIdFromReq(req);
  const removed = store.locations.find(loc => String(loc.id) === String(targetId));
  store.locations = store.locations.filter(loc => String(loc.id) !== String(targetId));
  store.initialized = true;
  saveStore(store);
  broadcastState('location:deleted', `ลบจุดบริการ "${removed?.name || targetId}" แล้ว`, clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Reset default locations (preserves volunteerLogs and surveys)
app.post('/api/admin/locations/reset', (req: Request, res: Response) => {
  const clientId = getClientIdFromReq(req);
  store.locations = DEFAULT_UBU_LOCATIONS.map(l => ({ ...l }));
  store.initialized = true;
  saveStore(store);
  broadcastState('location:reset', 'รีเซ็ตจุดบริการกลับเป็น 15 จุดเริ่มต้นแล้ว', clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Add single refill log
app.post('/api/admin/logs/add', (req: Request, res: Response) => {
  const newLogData = req.body || {};
  const clientId = getClientIdFromReq(req);
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
  broadcastState('log:added', `เพิ่มบันทึกการเติมที่ "${newLogData.location}" แล้ว`, clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Batch import volunteer logs from Excel (prevents duplicating existing rows)
app.post('/api/admin/logs/batch', (req: Request, res: Response) => {
  const { logs: importedLogs } = req.body || {};
  const clientId = getClientIdFromReq(req);
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
    broadcastState('log:batch', `นำเข้าข้อมูลการเติมของจิตอาสาใหม่ ${uniqueNewLogs.length} รายการแล้ว`, clientId);
  }
  return res.json({
    success: true,
    addedCount: uniqueNewLogs.length,
    skippedCount: importedLogs.length - uniqueNewLogs.length,
    ...getPublicState(),
  });
});

// Admin: Delete single volunteer log
app.delete('/api/admin/logs/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const clientId = getClientIdFromReq(req);
  store.volunteerLogs = store.volunteerLogs.filter(log => log.id !== targetId);
  store.initialized = true;
  saveStore(store);
  broadcastState('log:deleted', 'ลบรายการประวัติการเติม 1 รายการแล้ว', clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Clear logs for specific location
app.post('/api/admin/logs/clear-location', (req: Request, res: Response) => {
  const { locationName } = req.body || {};
  const clientId = getClientIdFromReq(req);
  store.volunteerLogs = store.volunteerLogs.filter(log => log.location !== locationName);
  store.initialized = true;
  saveStore(store);
  broadcastState('log:cleared-location', `ล้างประวัติของจุด "${locationName}" แล้ว`, clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Clear all volunteer logs
app.delete('/api/admin/logs', (req: Request, res: Response) => {
  const clientId = getClientIdFromReq(req);
  store.volunteerLogs = [];
  store.initialized = true;
  saveStore(store);
  broadcastState('log:cleared', 'ล้างประวัติการเติมทั้งหมดแล้ว', clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Delete single survey
app.delete('/api/admin/surveys/:id', (req: Request, res: Response) => {
  const targetId = req.params.id;
  const clientId = getClientIdFromReq(req);
  store.surveys = store.surveys.filter(s => s.id !== targetId);
  store.initialized = true;
  saveStore(store);
  broadcastState('survey:deleted', 'ลบรายการผลประเมิน 1 รายการแล้ว', clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Admin: Clear all surveys
app.delete('/api/admin/surveys', (req: Request, res: Response) => {
  const clientId = getClientIdFromReq(req);
  store.surveys = [];
  store.initialized = true;
  saveStore(store);
  broadcastState('survey:cleared', 'ล้างข้อมูลผลประเมินทั้งหมดแล้ว', clientId);
  return res.json({ success: true, ...getPublicState() });
});

// Config: Save GAS URL on server so all devices share it
app.post('/api/config/gas-url', (req: Request, res: Response) => {
  const { gasUrl } = req.body || {};
  const clientId = getClientIdFromReq(req);
  store.gasUrl = typeof gasUrl === 'string' ? gasUrl.trim() : '';
  store.initialized = true;
  saveStore(store);
  broadcastState('config:gas-url', 'อัปเดตการตั้งค่า Google Apps Script URL แล้ว', clientId);
  return res.json({ success: true, ...getPublicState() });
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
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    revision: store.revision,
    clients: wss.clients.size,
    sseClients: sseClients.size,
  });
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
    console.log(`Server listening on http://0.0.0.0:${PORT} (HTTP + WebSocket /ws + SSE /api/events)`);
  });
}

startServer();
