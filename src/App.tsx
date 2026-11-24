/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UbuHeader } from './components/UbuHeader';
import { CampusMapView } from './components/CampusMapView';
import { VolunteerPortal } from './components/VolunteerPortal';
import { AdminPortal } from './components/AdminPortal';
import { GasUrlModal } from './components/GasUrlModal';
import {
  UbuLocation,
  VolunteerLog,
  VolunteerFormData,
  SurveyRecord,
  ServerStateSnapshot,
} from './types/ubuCondom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MOCK_VOLUNTEER_IDS = new Set(['vol-101', 'vol-102', 'vol-103', 'vol-104', 'vol-105']);
const MOCK_SURVEY_IDS = new Set([
  'sur-101', 'sur-102', 'sur-103', 'sur-104',
  'sur-105', 'sur-106', 'sur-107', 'sur-108',
]);

const CLIENT_ID = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const BROADCAST_CHANNEL_NAME = 'ubu_condom_realtime_v1';

function safeSaveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore localStorage quota exceeded errors; server store is authoritative
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'volunteer' | 'admin' | 'config'>('user');

  // GAS Web App URL (synced with server)
  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem('ubu_gas_url') || '';
  });

  // State for UBU Condom Application (cached in localStorage, synced with real server API)
  const [locations, setLocations] = useState<UbuLocation[]>(() => {
    const saved = localStorage.getItem('ubu_locations_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    safeSaveLocal('ubu_locations_data', locations);
  }, [locations]);

  const [volunteerLogs, setVolunteerLogs] = useState<VolunteerLog[]>(() => {
    const saved = localStorage.getItem('ubu_volunteer_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((l: VolunteerLog) => !MOCK_VOLUNTEER_IDS.has(String(l.id || '')));
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    safeSaveLocal('ubu_volunteer_logs', volunteerLogs);
  }, [volunteerLogs]);

  const [surveys, setSurveys] = useState<SurveyRecord[]>(() => {
    const saved = localStorage.getItem('ubu_surveys_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: SurveyRecord) => !MOCK_SURVEY_IDS.has(String(s.id || '')));
        }
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    safeSaveLocal('ubu_surveys_data', surveys);
  }, [surveys]);

  const [ratings, setRatings] = useState<number[]>(() => {
    return surveys.map(s => s.rating);
  });

  useEffect(() => {
    setRatings(surveys.map(s => s.rating));
  }, [surveys]);

  const [isLoading, setIsLoading] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'reconnecting' | 'offline'>('reconnecting');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const lastRevisionRef = useRef<number>(0);
  const lastServerInstanceIdRef = useRef<string>('');
  const lastToastEventKeyRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const wsConnectedRef = useRef<boolean>(false);
  const sseConnectedRef = useRef<boolean>(false);
  const httpSyncedRef = useRef<boolean>(false);
  const syncErrorCountRef = useRef<number>(0);
  const realtimeModeRef = useRef<'websocket+sse' | 'polling'>('websocket+sse');

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  }, []);

  const updateConnectionStatus = useCallback(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setRealtimeStatus('offline');
    } else if (
      wsConnectedRef.current ||
      sseConnectedRef.current ||
      httpSyncedRef.current ||
      realtimeModeRef.current === 'polling'
    ) {
      setRealtimeStatus('connected');
    } else {
      setRealtimeStatus('reconnecting');
    }
  }, []);

  const applyServerSnapshot = useCallback((
    snapshot: Partial<ServerStateSnapshot>,
    options: { notifyRemote?: boolean; relayToBroadcastChannel?: boolean } = {}
  ) => {
    if (snapshot.serverInstanceId && snapshot.serverInstanceId !== lastServerInstanceIdRef.current) {
      lastServerInstanceIdRef.current = snapshot.serverInstanceId;
      lastRevisionRef.current = 0;
    }

    const incomingRev = Number(snapshot.revision || 0);
    if (incomingRev > 0 && lastRevisionRef.current > 0 && incomingRev < lastRevisionRef.current) {
      return;
    }

    const isNewerRevision = incomingRev > lastRevisionRef.current;
    if (incomingRev > 0) {
      lastRevisionRef.current = incomingRev;
    }

    if (Array.isArray(snapshot.locations)) {
      setLocations(snapshot.locations);
    }
    if (Array.isArray(snapshot.volunteerLogs)) {
      setVolunteerLogs(snapshot.volunteerLogs);
    }
    if (Array.isArray(snapshot.surveys)) {
      setSurveys(snapshot.surveys);
    }
    if (typeof snapshot.gasUrl === 'string') {
      setGasUrl(snapshot.gasUrl);
      localStorage.setItem('ubu_gas_url', snapshot.gasUrl);
    }
    if (snapshot.realtimeMode === 'polling' || snapshot.realtimeMode === 'websocket+sse') {
      realtimeModeRef.current = snapshot.realtimeMode;
    }
    if (typeof snapshot.updatedAt === 'string' && snapshot.updatedAt) {
      setLastUpdated(snapshot.updatedAt);
    }
    httpSyncedRef.current = true;
    syncErrorCountRef.current = 0;
    updateConnectionStatus();

    if (
      options.notifyRemote &&
      isNewerRevision &&
      snapshot.lastEvent?.message &&
      snapshot.lastEvent.clientId !== CLIENT_ID
    ) {
      const eventKey = `${incomingRev}:${snapshot.lastEvent.action}`;
      if (lastToastEventKeyRef.current !== eventKey) {
        lastToastEventKeyRef.current = eventKey;
        showToast(`⚡ อัปเดต Real-time: ${snapshot.lastEvent.message}`, 'info');
      }
    }

    if (options.relayToBroadcastChannel && incomingRev > 0) {
      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage({ type: 'state:sync', data: snapshot });
        } catch {
          // Ignore BroadcastChannel serialization errors
        }
      }
      try {
        localStorage.setItem('ubu_realtime_pulse', JSON.stringify({
          rev: incomingRev,
          srv: snapshot.serverInstanceId || '',
          ts: Date.now(),
        }));
      } catch {
        // Ignore storage errors
      }
    }
  }, [showToast, updateConnectionStatus]);

  // Sync authoritative state from shared Express server (preserving existing data cleanly)
  const fetchServerData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Server HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        // One-time safe migration if server store is brand new & browser already has real saved data
        if (!data.initialized) {
          const hasLocalLogs = localStorage.getItem('ubu_volunteer_logs') !== null;
          const hasLocalLocations = localStorage.getItem('ubu_locations_data') !== null;
          const hasLocalSurveys = localStorage.getItem('ubu_surveys_data') !== null;
          const hasLocalGas = Boolean(localStorage.getItem('ubu_gas_url'));

          if (hasLocalLogs || hasLocalLocations || hasLocalSurveys || hasLocalGas) {
            const realLocalLogs = (() => {
              try {
                const parsed = JSON.parse(localStorage.getItem('ubu_volunteer_logs') || '[]');
                return Array.isArray(parsed)
                  ? parsed.filter((l: VolunteerLog) => !MOCK_VOLUNTEER_IDS.has(String(l.id || '')))
                  : [];
              } catch {
                return [];
              }
            })();

            const realLocalSurveys = (() => {
              try {
                const parsed = JSON.parse(localStorage.getItem('ubu_surveys_data') || '[]');
                return Array.isArray(parsed)
                  ? parsed.filter((s: SurveyRecord) => !MOCK_SURVEY_IDS.has(String(s.id || '')))
                  : [];
              } catch {
                return [];
              }
            })();

            const localLocations = (() => {
              try {
                const parsed = JSON.parse(localStorage.getItem('ubu_locations_data') || '[]');
                return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
              } catch {
                return undefined;
              }
            })();

            const bootRes = await fetch('/api/bootstrap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-client-id': CLIENT_ID,
              },
              body: JSON.stringify({
                locations: localLocations,
                volunteerLogs: realLocalLogs,
                surveys: realLocalSurveys,
                gasUrl: localStorage.getItem('ubu_gas_url') || '',
              }),
            });
            if (bootRes.ok) {
              const bootData = await bootRes.json();
              if (bootData.success) {
                applyServerSnapshot(bootData, { relayToBroadcastChannel: true });
                return bootData;
              }
            }
          }
        }

        applyServerSnapshot(data, { relayToBroadcastChannel: true });
      }
      return data;
    } catch (err) {
      syncErrorCountRef.current += 1;
      if (syncErrorCountRef.current >= 2) {
        httpSyncedRef.current = false;
        updateConnectionStatus();
      }
      if (!silent) {
        console.error('Failed to sync with server:', err);
      }
      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [applyServerSnapshot, updateConnectionStatus]);

  // Fetch data from real Google Apps Script if URL provided (and also refresh server store)
  const handleFetchFromGas = useCallback(async (targetUrl = gasUrl) => {
    setIsLoading(true);
    try {
      await fetchServerData(true);

      if (!targetUrl || !targetUrl.trim()) {
        showToast('ซิงค์ข้อมูลล่าสุดจากเซิร์ฟเวอร์กลางเรียบร้อยแล้ว!', 'success');
        return;
      }

      // 1. Fetch Locations from GAS
      const locProxyUrl = `/api/gas-proxy?url=${encodeURIComponent(targetUrl.trim() + '?action=getLocations')}`;
      const locRes = await fetch(locProxyUrl);
      if (locRes.ok) {
        const locData = await locRes.json();
        const list = Array.isArray(locData) ? locData : (locData.data || locData.locations || []);
        if (list.length > 0) {
          setLocations(list.map((item: any, idx: number) => ({
            id: item.id || idx + 1,
            name: item.name,
            status: item.status || 'มีอยู่',
            lat: Number(item.lat) || 15.1190,
            lng: Number(item.lng) || 104.9030,
            landmark: item.landmark,
          })));
        }
      }

      // 2. Fetch Admin Data (Volunteer logs & Surveys) from GAS
      const adminProxyUrl = `/api/gas-proxy?url=${encodeURIComponent(targetUrl.trim() + '?action=getAdminData')}`;
      const adminRes = await fetch(adminProxyUrl);
      if (adminRes.ok) {
        const adminData = await adminRes.json();
        const payload = adminData.data || adminData;
        if (payload.logs && Array.isArray(payload.logs)) {
          setVolunteerLogs(payload.logs);
        }
        if (payload.ratings && Array.isArray(payload.ratings)) {
          setRatings(payload.ratings);
        }
      }

      showToast('ซิงค์ข้อมูลล่าสุดจากระบบกลางและ Google Sheets สำเร็จ!', 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถดึงข้อมูลจาก Google Apps Script ได้', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [gasUrl, fetchServerData, showToast]);

  // Clear legacy mock rating keys & load authoritative current state from server
  useEffect(() => {
    try {
      localStorage.removeItem('ubu_ratings_data');
    } catch {}
    fetchServerData(true);
  }, [fetchServerData]);

  // Multi-channel instant Real-Time Synchronization:
  // 1) WebSocket (/ws) with fast reconnect & heartbeat
  // 2) Server-Sent Events (/api/events) instant push backup
  // 3) Cross-tab BroadcastChannel + localStorage storage event (<1ms local tab sync)
  // 4) Safety fallback check ONLY while both WS and SSE are temporarily disconnected
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    let isDisposed = false;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let retryAttempt = 0;

    // Cross-tab BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = bc;
      bc.onmessage = (ev) => {
        if (ev?.data?.type === 'state:sync' && ev.data.data) {
          applyServerSnapshot(ev.data.data, { notifyRemote: true });
        }
      };
    }

    // Cross-tab storage event backup (catches updates across tabs even without BroadcastChannel)
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'ubu_realtime_pulse' || e.key === 'ubu_locations_data') {
        fetchServerData(true);
      }
    };
    window.addEventListener('storage', handleStorageSync);

    // Server-Sent Events (SSE) stream
    let eventSource: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/api/events');
      eventSource.onopen = () => {
        sseConnectedRef.current = true;
        updateConnectionStatus();
      };
      eventSource.addEventListener('state:init', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.realtimeMode === 'polling') {
            sseConnectedRef.current = false;
            eventSource?.close();
            eventSource = null;
          } else {
            sseConnectedRef.current = true;
          }
          if (data?.initialized || lastRevisionRef.current === 0) {
            applyServerSnapshot(data);
          } else {
            httpSyncedRef.current = true;
            updateConnectionStatus();
          }
        } catch {}
      });
      eventSource.addEventListener('state:sync', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.realtimeMode !== 'polling') {
            sseConnectedRef.current = true;
          }
          applyServerSnapshot(data, { notifyRemote: true, relayToBroadcastChannel: true });
        } catch {}
      });
      eventSource.onerror = () => {
        sseConnectedRef.current = false;
        if (realtimeModeRef.current === 'polling') {
          eventSource?.close();
          eventSource = null;
        }
        updateConnectionStatus();
      };
    }

    // Primary WebSocket (/ws)
    const connectWebSocket = () => {
      if (isDisposed || realtimeModeRef.current === 'polling') return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        return;
      }
      wsRef.current = socket;

      socket.onopen = () => {
        retryAttempt = 0;
        wsConnectedRef.current = true;
        httpSyncedRef.current = true;
        updateConnectionStatus();
        fetchServerData(true);

        if (pingTimer !== null) window.clearInterval(pingTimer);
        pingTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.type === 'state:init' && msg.data) {
            if (msg.data.initialized || lastRevisionRef.current === 0) {
              applyServerSnapshot(msg.data);
            } else {
              httpSyncedRef.current = true;
              updateConnectionStatus();
            }
          } else if (msg?.type === 'state:sync' && msg.data) {
            applyServerSnapshot(msg.data, { notifyRemote: true, relayToBroadcastChannel: true });
          }
        } catch {
          // Ignore invalid WebSocket payloads
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        wsConnectedRef.current = false;
        updateConnectionStatus();
        if (pingTimer !== null) {
          window.clearInterval(pingTimer);
          pingTimer = null;
        }
        if (isDisposed || realtimeModeRef.current === 'polling') {
          return;
        }
        // Self-healing backoff: fast retries initially, then check every 10s without giving up
        const delayMs = retryAttempt < 4 ? 500 * Math.pow(2, retryAttempt) : 10000;
        retryAttempt += 1;
        reconnectTimer = window.setTimeout(connectWebSocket, delayMs);
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {}
      };
    };

    connectWebSocket();

    // Sync safety fallback timer (runs whenever WS/SSE are unavailable or in polling mode)
    const fallbackTimer = window.setInterval(() => {
      if (!isDisposed && (!wsConnectedRef.current && (!sseConnectedRef.current || realtimeModeRef.current === 'polling')) && navigator.onLine) {
        fetchServerData(true);
      }
    }, 3500);

    const handleReconnectCheck = () => {
      updateConnectionStatus();
      if (document.visibilityState === 'visible') {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'state:request' }));
        } else {
          fetchServerData(true);
          if (!wsRef.current && realtimeModeRef.current !== 'polling') {
            retryAttempt = 0;
            if (reconnectTimer !== null) {
              window.clearTimeout(reconnectTimer);
              reconnectTimer = null;
            }
            connectWebSocket();
          }
        }
      }
    };

    const handleOffline = () => {
      wsConnectedRef.current = false;
      sseConnectedRef.current = false;
      httpSyncedRef.current = false;
      setRealtimeStatus('offline');
    };

    window.addEventListener('focus', handleReconnectCheck);
    window.addEventListener('online', handleReconnectCheck);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleReconnectCheck);

    return () => {
      isDisposed = true;
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      if (pingTimer !== null) window.clearInterval(pingTimer);
      window.clearInterval(fallbackTimer);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleReconnectCheck);
      window.removeEventListener('online', handleReconnectCheck);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleReconnectCheck);
      if (eventSource) {
        eventSource.close();
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [applyServerSnapshot, fetchServerData, updateConnectionStatus]);

  // Sync latest snapshot when switching tabs
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'state:request' }));
    } else {
      fetchServerData(true);
    }
  }, [activeTab, fetchServerData]);

  // Save GAS URL
  const handleSaveGasUrl = async (newUrl: string) => {
    setGasUrl(newUrl);
    localStorage.setItem('ubu_gas_url', newUrl);
    try {
      const res = await fetch('/api/config/gas-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify({ gasUrl: newUrl }),
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
      }
    } catch {}
    if (newUrl) {
      await handleFetchFromGas(newUrl);
    } else {
      await fetchServerData(false);
      showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว (ใช้ฐานข้อมูลเซิร์ฟเวอร์กลาง)', 'info');
    }
  };

  // 1. Report Condom Out (User)
  const handleReportEmpty = async (locationName: string, locationId?: string | number) => {
    setLocations(prev => prev.map(loc =>
      (locationId !== undefined && String(loc.id) === String(locationId)) || loc.name.trim() === locationName.trim()
        ? { ...loc, status: 'หมดแล้ว' }
        : loc
    ));
    try {
      const response = await fetch('/api/report-empty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify({ locationName, locationId }),
      });
      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'อัปเดตสถานะไม่สำเร็จ');
      }
      applyServerSnapshot(resJson, { relayToBroadcastChannel: true });
      showToast(resJson.message || `อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`, 'success');
    } catch (err: any) {
      await fetchServerData(true);
      showToast(err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์กลางได้ โปรดลองใหม่อีกครั้ง', 'error');
    }
  };

  // 2. Submit Survey (User)
  const handleSubmitSurvey = async (rating: number, feedback: string) => {
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify({ rating, feedback }),
      });
      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'บันทึกแบบประเมินไม่สำเร็จ');
      }
      applyServerSnapshot(resJson, { relayToBroadcastChannel: true });
      showToast('บันทึกแบบประเมินเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นครับ', 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถส่งแบบประเมินไปยังเซิร์ฟเวอร์ได้', 'error');
      throw err;
    }
  };

  // 3. Submit Volunteer Replenishment (Volunteer -> Shared Server DB)
  const handleSubmitVolunteer = async (
    formData: VolunteerFormData,
    photoBase64?: string,
    fileName?: string,
    mimeType?: string
  ) => {
    const response = await fetch('/api/volunteer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': CLIENT_ID,
      },
      body: JSON.stringify({
        formData,
        photoBase64,
        fileName,
        mimeType,
      }),
    });

    let resJson: any = {};
    try {
      resJson = await response.json();
    } catch {
      throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด ไม่สามารถบันทึกข้อมูลได้');
    }

    if (!response.ok || !resJson.success) {
      throw new Error(resJson.error || 'ไม่สามารถบันทึกข้อมูลไปยังระบบหลังบ้านได้ โปรดลองใหม่อีกครั้ง');
    }

    applyServerSnapshot(resJson, { relayToBroadcastChannel: true });

    showToast(
      resJson.message || `บันทึกเติมของสำเร็จ! อัปเดตสถานะจุด "${formData.location}" เป็น 'มีอยู่' อัตโนมัติแล้ว`,
      'success'
    );
  };

  // 4. Admin manual toggle status (optimistic + instant broadcast)
  const handleToggleLocationStatus = async (locationName: string, currentStatus: string) => {
    const optimisticNext = currentStatus === 'มีอยู่' ? 'หมดแล้ว' : 'มีอยู่';
    setLocations(prev => prev.map(loc => loc.name === locationName ? { ...loc, status: optimisticNext } : loc));
    try {
      const res = await fetch('/api/admin/locations/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify({ locationName, currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast(`ปรับสถานะจุด "${locationName}" เป็น "${data.nextStatus}" เรียบร้อยแล้ว`, 'success');
      }
    } catch {
      await fetchServerData(true);
      showToast('เกิดข้อผิดพลาดในการปรับสถานะ', 'error');
    }
  };

  // 5. Admin Add Location
  const handleAddLocation = async (newLoc: Omit<UbuLocation, 'id'>) => {
    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify(newLoc),
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast(`เพิ่มจุดติดตั้ง "${newLoc.name}" เรียบร้อยแล้ว`, 'success');
      }
    } catch {
      showToast('ไม่สามารถเพิ่มจุดติดตั้งได้', 'error');
    }
  };

  // 6. Admin Edit Location
  const handleEditLocation = async (id: string | number, updated: Partial<UbuLocation>) => {
    setLocations(prev => prev.map(loc => String(loc.id) === String(id) ? { ...loc, ...updated } : loc));
    try {
      const res = await fetch(`/api/admin/locations/${encodeURIComponent(String(id))}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast('บันทึกการแก้ไขจุดติดตั้งเรียบร้อยแล้ว', 'success');
      }
    } catch {
      await fetchServerData(true);
      showToast('ไม่สามารถบันทึกการแก้ไขจุดติดตั้งได้', 'error');
    }
  };

  // 7. Admin Delete Location
  const handleDeleteLocation = async (id: string | number) => {
    const target = locations.find(l => l.id === id);
    setLocations(prev => prev.filter(l => String(l.id) !== String(id)));
    try {
      const res = await fetch(`/api/admin/locations/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
        headers: { 'x-client-id': CLIENT_ID },
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast(`ลบจุดติดตั้ง "${target?.name || ''}" ออกจากระบบแล้ว`, 'info');
      }
    } catch {
      await fetchServerData(true);
      showToast('ไม่สามารถลบจุดติดตั้งได้', 'error');
    }
  };

  // 9. Admin Delete Single Volunteer Log
  const handleDeleteVolunteerLog = async (id: string) => {
    setVolunteerLogs(prev => prev.filter(log => log.id !== id));
    try {
      const res = await fetch(`/api/admin/logs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-client-id': CLIENT_ID },
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast('ลบรายการประวัติการเติมเรียบร้อยแล้ว', 'info');
      }
    } catch {
      await fetchServerData(true);
      showToast('ไม่สามารถลบรายการประวัติการเติมได้', 'error');
    }
  };

  // 9.1 Admin Add Refill Log
  const handleAddRefillLog = async (newLogData: Omit<VolunteerLog, 'id' | 'date'>) => {
    try {
      const res = await fetch('/api/admin/logs/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify(newLogData),
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast(`เพิ่มยอดเติมสำหรับจุด "${newLogData.location}" เรียบร้อยแล้ว`, 'success');
      }
    } catch {
      showToast('ไม่สามารถเพิ่มยอดเติมได้', 'error');
    }
  };

  // 9.1.5 Admin Batch Import Volunteer Logs from File (deduplicated on server)
  const handleBatchImportVolunteerLogs = async (importedLogs: VolunteerLog[]) => {
    if (!importedLogs || importedLogs.length === 0) return;
    try {
      const res = await fetch('/api/admin/logs/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': CLIENT_ID,
        },
        body: JSON.stringify({ logs: importedLogs }),
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        const added = Number(data.addedCount ?? importedLogs.length);
        const skipped = Number(data.skippedCount ?? 0);
        showToast(
          skipped > 0
            ? `นำเข้าข้อมูลใหม่ ${added} รายการ (ข้ามข้อมูลเดิมที่มีอยู่แล้ว ${skipped} รายการ)`
            : `นำเข้าข้อมูลการเติมของจิตอาสาจำนวน ${added} รายการสำเร็จ!`,
          'success'
        );
      }
    } catch {
      showToast('ไม่สามารถนำเข้าข้อมูลจากไฟล์ได้', 'error');
    }
  };

  // 9.2 Admin Clear Refill Logs for specific Location
  const handleClearLocationLogs = async (locationName: string) => {
    if (window.confirm(`คุณต้องการลบยอดประวัติการเติมของจุด "${locationName}" ทั้งหมดใช่หรือไม่?`)) {
      try {
        const res = await fetch('/api/admin/logs/clear-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': CLIENT_ID,
          },
          body: JSON.stringify({ locationName }),
        });
        const data = await res.json();
        if (data.success) {
          applyServerSnapshot(data, { relayToBroadcastChannel: true });
          showToast(`ลบประวัติยอดเติมของจุด "${locationName}" ทั้งหมดเรียบร้อยแล้ว`, 'info');
        }
      } catch {
        showToast('ไม่สามารถลบประวัติยอดเติมได้', 'error');
      }
    }
  };

  // 10. Admin Clear All Volunteer Logs
  const handleClearAllVolunteerLogs = async () => {
    if (window.confirm('คุณต้องการลบประวัติการเติมของจิตอาสา "ทั้งหมด" ใช่หรือไม่?')) {
      setVolunteerLogs([]);
      try {
        const res = await fetch('/api/admin/logs', {
          method: 'DELETE',
          headers: { 'x-client-id': CLIENT_ID },
        });
        const data = await res.json();
        if (data.success) {
          applyServerSnapshot(data, { relayToBroadcastChannel: true });
          showToast('ลบประวัติการเติมทั้งหมดเรียบร้อยแล้ว', 'info');
        }
      } catch {
        await fetchServerData(true);
        showToast('ไม่สามารถลบประวัติทั้งหมดได้', 'error');
      }
    }
  };

  // 12. Admin Delete Single Survey Record
  const handleDeleteSurvey = async (id: string) => {
    setSurveys(prev => prev.filter(s => s.id !== id));
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-client-id': CLIENT_ID },
      });
      const data = await res.json();
      if (data.success) {
        applyServerSnapshot(data, { relayToBroadcastChannel: true });
        showToast('ลบรายการผลประเมินเรียบร้อยแล้ว', 'info');
      }
    } catch {
      await fetchServerData(true);
      showToast('ไม่สามารถลบรายการผลประเมินได้', 'error');
    }
  };

  // 13. Admin Clear All Surveys
  const handleClearAllSurveys = async () => {
    if (window.confirm('คุณต้องการลบข้อมูลประเมินความพึงพอใจและข้อคิดเห็น "ทั้งหมด" ใช่หรือไม่?')) {
      setSurveys([]);
      try {
        const res = await fetch('/api/admin/surveys', {
          method: 'DELETE',
          headers: { 'x-client-id': CLIENT_ID },
        });
        const data = await res.json();
        if (data.success) {
          applyServerSnapshot(data, { relayToBroadcastChannel: true });
          showToast('ลบข้อมูลการประเมินทั้งหมดเรียบร้อยแล้ว', 'info');
        }
      } catch {
        await fetchServerData(true);
        showToast('ไม่สามารถลบข้อมูลการประเมินทั้งหมดได้', 'error');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 flex flex-col font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl w-full mx-auto space-y-6 flex-1 flex flex-col">
        {/* Header */}
        <UbuHeader
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'config') {
              setIsConfigModalOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          locations={locations}
          isLiveGAS={Boolean(gasUrl)}
          isLoading={isLoading}
          realtimeStatus={realtimeStatus}
          lastUpdated={lastUpdated}
          onRefresh={() => handleFetchFromGas(gasUrl)}
          onOpenConfig={() => setIsConfigModalOpen(true)}
        />

        {/* View Content */}
        <main className="flex-1">
          {activeTab === 'user' && (
            <CampusMapView
              locations={locations}
              onReportEmpty={handleReportEmpty}
              onSubmitSurvey={handleSubmitSurvey}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'volunteer' && (
            <VolunteerPortal
              locations={locations}
              onSubmitVolunteer={handleSubmitVolunteer}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPortal
              locations={locations}
              logs={volunteerLogs}
              ratings={ratings}
              surveys={surveys}
              onToggleLocationStatus={handleToggleLocationStatus}
              onAddLocation={handleAddLocation}
              onEditLocation={handleEditLocation}
              onDeleteLocation={handleDeleteLocation}
              onDeleteVolunteerLog={handleDeleteVolunteerLog}
              onClearAllVolunteerLogs={handleClearAllVolunteerLogs}
              onAddRefillLog={handleAddRefillLog}
              onBatchImportVolunteerLogs={handleBatchImportVolunteerLogs}
              onClearLocationLogs={handleClearLocationLogs}
              onDeleteSurvey={handleDeleteSurvey}
              onClearAllSurveys={handleClearAllSurveys}
              onRefreshData={() => handleFetchFromGas(gasUrl)}
              isLoading={isLoading}
            />
          )}
        </main>
      </div>

      {/* GAS Web App URL Config Modal */}
      <GasUrlModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        gasUrl={gasUrl}
        onSaveUrl={handleSaveGasUrl}
        isLoading={isLoading}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-bold backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
              : toast.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/20'
              : 'bg-slate-900 text-white border-slate-800 shadow-slate-900/20'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-white shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-white shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-300 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
