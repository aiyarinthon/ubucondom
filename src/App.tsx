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
import { UbuLocation, VolunteerLog, VolunteerFormData, SurveyRecord } from './types/ubuCondom';
import { DEFAULT_UBU_LOCATIONS } from './data/defaultLocations';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const MOCK_VOLUNTEER_IDS = new Set(['vol-101', 'vol-102', 'vol-103', 'vol-104', 'vol-105']);
const MOCK_SURVEY_IDS = new Set([
  'sur-101', 'sur-102', 'sur-103', 'sur-104',
  'sur-105', 'sur-106', 'sur-107', 'sur-108',
]);

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

  // State for UBU Condom Application (cached in localStorage, synced with server API)
  const [locations, setLocations] = useState<UbuLocation[]>(() => {
    const saved = localStorage.getItem('ubu_locations_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_UBU_LOCATIONS;
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

  // Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const applyServerSnapshot = useCallback((snapshot: {
    locations?: UbuLocation[];
    volunteerLogs?: VolunteerLog[];
    surveys?: SurveyRecord[];
    gasUrl?: string;
  }) => {
    if (Array.isArray(snapshot.locations) && snapshot.locations.length > 0) {
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
  }, []);

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
              headers: { 'Content-Type': 'application/json' },
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
                applyServerSnapshot(bootData);
                return bootData;
              }
            }
          }
        }

        applyServerSnapshot(data);
      }
      return data;
    } catch (err) {
      if (!silent) {
        console.error('Failed to sync with server:', err);
      }
      return null;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [applyServerSnapshot]);

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
  }, [gasUrl, fetchServerData]);

  // Initial load from server + optional GAS
  useEffect(() => {
    fetchServerData(true).then((serverData) => {
      const activeGasUrl = (serverData && serverData.gasUrl) || gasUrl;
      if (activeGasUrl) {
        handleFetchFromGas(activeGasUrl);
      }
    });
  }, []);

  // Live WebSocket connection for instant real-time updates across all clients and tabs
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    let isDisposed = false;
    let reconnectTimer: number | null = null;
    let retryAttempt = 0;

    const connectWebSocket = () => {
      if (isDisposed) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        retryAttempt = 0;
        // Re-verify bootstrap/sync once connected
        fetchServerData(true);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if ((msg?.type === 'state:sync' || msg?.type === 'state:init') && msg.data) {
            // Do not overwrite uninitialized local data with empty server store before bootstrap completes
            if (msg.data.initialized) {
              applyServerSnapshot(msg.data);
            }
          }
        } catch {
          // Ignore invalid WebSocket payloads
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) {
          wsRef.current = null;
        }
        if (isDisposed) return;
        const delayMs = Math.min(10000, 1000 * Math.pow(2, retryAttempt));
        retryAttempt += 1;
        reconnectTimer = window.setTimeout(connectWebSocket, delayMs);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connectWebSocket();

    const handleReconnectCheck = () => {
      if (document.visibilityState === 'visible') {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'state:request' }));
        } else {
          fetchServerData(true);
        }
      }
    };

    window.addEventListener('focus', handleReconnectCheck);
    window.addEventListener('online', handleReconnectCheck);
    document.addEventListener('visibilitychange', handleReconnectCheck);

    return () => {
      isDisposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      window.removeEventListener('focus', handleReconnectCheck);
      window.removeEventListener('online', handleReconnectCheck);
      document.removeEventListener('visibilitychange', handleReconnectCheck);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [applyServerSnapshot, fetchServerData]);

  // Sync latest snapshot when switching tabs as an extra safeguard
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
      await fetch('/api/config/gas-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gasUrl: newUrl }),
      });
    } catch {}
    if (newUrl) {
      await handleFetchFromGas(newUrl);
    } else {
      await fetchServerData(false);
      showToast('บันทึกการตั้งค่าเรียบร้อยแล้ว (ใช้ฐานข้อมูลเซิร์ฟเวอร์กลาง)', 'info');
    }
  };

  // 1. Report Condom Out (User)
  const handleReportEmpty = async (locationName: string) => {
    setLocations(prev => prev.map(loc => loc.name === locationName ? { ...loc, status: 'หมดแล้ว' } : loc));
    try {
      const response = await fetch('/api/report-empty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationName }),
      });
      const resJson = await response.json();
      if (resJson.success && Array.isArray(resJson.locations)) {
        setLocations(resJson.locations);
      }
      showToast(resJson.message || `อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`, 'success');
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์กลางได้ โปรดลองใหม่อีกครั้ง', 'error');
    }
  };

  // 2. Submit Survey (User)
  const handleSubmitSurvey = async (rating: number, feedback: string) => {
    try {
      const response = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback }),
      });
      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'บันทึกแบบประเมินไม่สำเร็จ');
      }
      if (Array.isArray(resJson.surveys)) {
        setSurveys(resJson.surveys);
      }
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
      headers: { 'Content-Type': 'application/json' },
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

    if (Array.isArray(resJson.locations)) {
      setLocations(resJson.locations);
    }
    if (Array.isArray(resJson.volunteerLogs)) {
      setVolunteerLogs(resJson.volunteerLogs);
    }

    showToast(
      resJson.message || `บันทึกเติมของสำเร็จ! อัปเดตสถานะจุด "${formData.location}" เป็น 'มีอยู่' อัตโนมัติแล้ว`,
      'success'
    );
  };

  // 4. Admin manual toggle status
  const handleToggleLocationStatus = async (locationName: string, currentStatus: string) => {
    try {
      const res = await fetch('/api/admin/locations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationName, currentStatus }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
        showToast(`ปรับสถานะจุด "${locationName}" เป็น "${data.nextStatus}" เรียบร้อยแล้ว`, 'success');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการปรับสถานะ', 'error');
    }
  };

  // 5. Admin Add Location
  const handleAddLocation = async (newLoc: Omit<UbuLocation, 'id'>) => {
    try {
      const res = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLoc),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
        showToast(`เพิ่มจุดติดตั้ง "${newLoc.name}" เรียบร้อยแล้ว`, 'success');
      }
    } catch {
      showToast('ไม่สามารถเพิ่มจุดติดตั้งได้', 'error');
    }
  };

  // 6. Admin Edit Location
  const handleEditLocation = async (id: string | number, updated: Partial<UbuLocation>) => {
    try {
      const res = await fetch(`/api/admin/locations/${encodeURIComponent(String(id))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
        showToast('บันทึกการแก้ไขจุดติดตั้งเรียบร้อยแล้ว', 'success');
      }
    } catch {
      showToast('ไม่สามารถบันทึกการแก้ไขจุดติดตั้งได้', 'error');
    }
  };

  // 7. Admin Delete Location
  const handleDeleteLocation = async (id: string | number) => {
    const target = locations.find(l => l.id === id);
    try {
      const res = await fetch(`/api/admin/locations/${encodeURIComponent(String(id))}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
        showToast(`ลบจุดติดตั้ง "${target?.name || ''}" ออกจากระบบแล้ว`, 'info');
      }
    } catch {
      showToast('ไม่สามารถลบจุดติดตั้งได้', 'error');
    }
  };

  // 8. Admin Reset Default Locations
  const handleResetDefaultLocations = async () => {
    try {
      const res = await fetch('/api/admin/locations/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success && Array.isArray(data.locations)) {
        setLocations(data.locations);
        showToast('คืนค่าจุดติดตั้งกลับเป็น 15 จุดเริ่มต้นของ ม.อุบลฯ เรียบร้อยแล้ว', 'info');
      }
    } catch {
      showToast('ไม่สามารถคืนค่าจุดติดตั้งได้', 'error');
    }
  };

  // 9. Admin Delete Single Volunteer Log
  const handleDeleteVolunteerLog = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/logs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && Array.isArray(data.volunteerLogs)) {
        setVolunteerLogs(data.volunteerLogs);
        showToast('ลบรายการประวัติการเติมเรียบร้อยแล้ว', 'info');
      }
    } catch {
      showToast('ไม่สามารถลบรายการประวัติการเติมได้', 'error');
    }
  };

  // 9.1 Admin Add Refill Log
  const handleAddRefillLog = async (newLogData: Omit<VolunteerLog, 'id' | 'date'>) => {
    try {
      const res = await fetch('/api/admin/logs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLogData),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.locations)) setLocations(data.locations);
        if (Array.isArray(data.volunteerLogs)) setVolunteerLogs(data.volunteerLogs);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: importedLogs }),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.locations)) setLocations(data.locations);
        if (Array.isArray(data.volunteerLogs)) setVolunteerLogs(data.volunteerLogs);
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationName }),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.volunteerLogs)) {
          setVolunteerLogs(data.volunteerLogs);
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
      try {
        const res = await fetch('/api/admin/logs', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setVolunteerLogs([]);
          showToast('ลบประวัติการเติมทั้งหมดเรียบร้อยแล้ว', 'info');
        }
      } catch {
        showToast('ไม่สามารถลบประวัติทั้งหมดได้', 'error');
      }
    }
  };

  // 12. Admin Delete Single Survey Record
  const handleDeleteSurvey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/surveys/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && Array.isArray(data.surveys)) {
        setSurveys(data.surveys);
        showToast('ลบรายการผลประเมินเรียบร้อยแล้ว', 'info');
      }
    } catch {
      showToast('ไม่สามารถลบรายการผลประเมินได้', 'error');
    }
  };

  // 13. Admin Clear All Surveys
  const handleClearAllSurveys = async () => {
    if (window.confirm('คุณต้องการลบข้อมูลประเมินความพึงพอใจและข้อคิดเห็น "ทั้งหมด" ใช่หรือไม่?')) {
      try {
        const res = await fetch('/api/admin/surveys', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setSurveys([]);
          showToast('ลบข้อมูลการประเมินทั้งหมดเรียบร้อยแล้ว', 'info');
        }
      } catch {
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
              onResetDefaultLocations={handleResetDefaultLocations}
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
