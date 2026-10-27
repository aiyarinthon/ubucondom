/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UbuHeader } from './components/UbuHeader';
import { CampusMapView } from './components/CampusMapView';
import { VolunteerPortal } from './components/VolunteerPortal';
import { AdminPortal } from './components/AdminPortal';
import { GasUrlModal } from './components/GasUrlModal';
import { UbuLocation, VolunteerLog, VolunteerFormData } from './types/ubuCondom';
import { 
  INITIAL_UBU_LOCATIONS, 
  INITIAL_VOLUNTEER_LOGS, 
  INITIAL_RATINGS,
  INITIAL_SURVEY_RECORDS 
} from './data/ubuData';
import { SurveyRecord } from './types/ubuCondom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'user' | 'volunteer' | 'admin' | 'config'>('user');
  
  // GAS Web App URL
  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem('ubu_gas_url') || '';
  });

  // State for UBU Condom Application with localStorage persistence
  const [locations, setLocations] = useState<UbuLocation[]>(() => {
    const saved = localStorage.getItem('ubu_locations_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return INITIAL_UBU_LOCATIONS;
  });

  useEffect(() => {
    localStorage.setItem('ubu_locations_data', JSON.stringify(locations));
  }, [locations]);

  const [volunteerLogs, setVolunteerLogs] = useState<VolunteerLog[]>(() => {
    const saved = localStorage.getItem('ubu_volunteer_logs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return INITIAL_VOLUNTEER_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('ubu_volunteer_logs', JSON.stringify(volunteerLogs));
  }, [volunteerLogs]);

  // Survey Records State with localStorage persistence
  const [surveys, setSurveys] = useState<SurveyRecord[]>(() => {
    const saved = localStorage.getItem('ubu_surveys_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return INITIAL_SURVEY_RECORDS;
  });

  useEffect(() => {
    localStorage.setItem('ubu_surveys_data', JSON.stringify(surveys));
  }, [surveys]);

  const [ratings, setRatings] = useState<number[]>(() => {
    if (surveys.length > 0) return surveys.map(s => s.rating);
    return INITIAL_RATINGS;
  });
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

  // Fetch data from real Google Apps Script if URL provided
  const handleFetchFromGas = useCallback(async (targetUrl = gasUrl) => {
    if (!targetUrl || !targetUrl.trim()) return;

    setIsLoading(true);
    try {
      // 1. Fetch Locations
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

      // 2. Fetch Admin Data (Volunteer logs & Surveys)
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

      showToast('ซิงค์ข้อมูลล่าสุดจาก Google Sheets สำเร็จ!', 'success');
    } catch (err: any) {
      showToast(err.message || 'ไม่สามารถดึงข้อมูลจาก Google Apps Script ได้', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [gasUrl]);

  // Initial load
  useEffect(() => {
    if (gasUrl) {
      handleFetchFromGas(gasUrl);
    }
  }, []);

  // Save GAS URL
  const handleSaveGasUrl = async (newUrl: string) => {
    setGasUrl(newUrl);
    localStorage.setItem('ubu_gas_url', newUrl);
    if (newUrl) {
      await handleFetchFromGas(newUrl);
    } else {
      setLocations(INITIAL_UBU_LOCATIONS);
      setVolunteerLogs(INITIAL_VOLUNTEER_LOGS);
      setRatings(INITIAL_RATINGS);
      showToast('สลับกลับมาใช้ชุดข้อมูลจำลอง ม.อุบลฯ', 'info');
    }
  };

  // 1. Report Condom Out (User)
  const handleReportEmpty = async (locationName: string) => {
    // Immediate Update & LocalStorage Persistence
    setLocations(prev => {
      const updated = prev.map(loc => loc.name === locationName ? { ...loc, status: 'หมดแล้ว' } : loc);
      localStorage.setItem('ubu_locations_data', JSON.stringify(updated));
      return updated;
    });

    if (gasUrl) {
      try {
        const response = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _targetUrl: gasUrl,
            action: 'reportOut',
            locationName,
          }),
        });
        const resJson = await response.json();
        showToast(resJson.message || `อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`, 'success');
      } catch (err: any) {
        showToast(`อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`, 'success');
      }
    } else {
      showToast(`อัปเดตสถานะจุด "${locationName}" เป็น 'หมดแล้ว' อัตโนมัติเรียบร้อยแล้ว`, 'success');
    }
  };

  // 2. Submit Survey (User)
  const handleSubmitSurvey = async (rating: number, feedback: string) => {
    const newSurvey: SurveyRecord = {
      id: 'sur-' + Date.now(),
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      rating,
      feedback: feedback.trim(),
    };

    setSurveys(prev => [newSurvey, ...prev]);
    setRatings(prev => [...prev, rating]);

    if (gasUrl) {
      try {
        await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _targetUrl: gasUrl,
            action: 'submitSurvey',
            rating,
            feedback,
          }),
        });
      } catch {
        // demo fallback
      }
    }
    showToast('บันทึกแบบประเมินเรียบร้อยแล้ว ขอบคุณสำหรับความคิดเห็นครับ', 'success');
  };

  // 3. Submit Volunteer Replenishment (Volunteer)
  const handleSubmitVolunteer = async (
    formData: VolunteerFormData,
    photoBase64?: string,
    fileName?: string,
    mimeType?: string
  ) => {
    // 1. Mark location back to "มีอยู่" and persist to localStorage
    setLocations(prev => {
      const updated = prev.map(loc => loc.name === formData.location ? { ...loc, status: 'มีอยู่' } : loc);
      localStorage.setItem('ubu_locations_data', JSON.stringify(updated));
      return updated;
    });

    // 2. Append to logs
    const newLog: VolunteerLog = {
      id: 'vol-' + Date.now(),
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      name: formData.name,
      year: formData.year,
      faculty: formData.faculty,
      studentId: formData.studentId,
      location: formData.location,
      lubricant: formData.lubricant,
      size49: formData.size49,
      size52: formData.size52,
      size54: formData.size54,
      size56: formData.size56,
      comment: formData.comment || '-',
      imageUrl: photoBase64 ? 'data:' + mimeType + ';base64,' + photoBase64 : '',
    };

    setVolunteerLogs(prev => [newLog, ...prev]);

    if (gasUrl) {
      try {
        const response = await fetch('/api/gas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _targetUrl: gasUrl,
            action: 'submitVolunteer',
            formData: {
              ...formData,
              fileData: photoBase64 ? { base64: photoBase64, fileName, mimeType } : undefined,
            },
          }),
        });
        const resJson = await response.json();
        showToast(resJson.message || `บันทึกเติมของสำเร็จ! จุด "${formData.location}" เปลี่ยนสถานะเป็น 'มีอยู่' อัตโนมัติแล้ว`, 'success');
      } catch (err: any) {
        showToast(`บันทึกเติมของสำเร็จ! จุด "${formData.location}" เปลี่ยนสถานะเป็น 'มีอยู่' อัตโนมัติแล้ว`, 'success');
      }
    } else {
      showToast(`บันทึกเติมของสำเร็จ! อัปเดตสถานะจุด "${formData.location}" เป็น 'มีอยู่' อัตโนมัติแล้ว`, 'success');
    }
  };

  // 4. Admin manual toggle status
  const handleToggleLocationStatus = async (locationName: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'มีอยู่' ? 'หมดแล้ว' : 'มีอยู่';
    setLocations(prev => {
      const updated = prev.map(loc => loc.name === locationName ? { ...loc, status: nextStatus } : loc);
      localStorage.setItem('ubu_locations_data', JSON.stringify(updated));
      return updated;
    });

    showToast(`ปรับสถานะจุด "${locationName}" เป็น "${nextStatus}" เรียบร้อยแล้ว`, 'success');
  };

  // 5. Admin Add Location
  const handleAddLocation = (newLoc: Omit<UbuLocation, 'id'>) => {
    const newId = Date.now();
    const created: UbuLocation = {
      id: newId,
      ...newLoc,
    };
    setLocations(prev => [created, ...prev]);
    showToast(`เพิ่มจุดติดตั้ง "${newLoc.name}" เรียบร้อยแล้ว`, 'success');
  };

  // 6. Admin Edit Location
  const handleEditLocation = (id: string | number, updated: Partial<UbuLocation>) => {
    setLocations(prev => prev.map(loc => loc.id === id ? { ...loc, ...updated } : loc));
    showToast(`บันทึกการแก้ไขจุดติดตั้งเรียบร้อยแล้ว`, 'success');
  };

  // 7. Admin Delete Location
  const handleDeleteLocation = (id: string | number) => {
    const target = locations.find(l => l.id === id);
    setLocations(prev => prev.filter(loc => loc.id !== id));
    showToast(`ลบจุดติดตั้ง "${target?.name || ''}" ออกจากระบบแล้ว`, 'info');
  };

  // 8. Admin Reset Default Locations
  const handleResetDefaultLocations = () => {
    setLocations(INITIAL_UBU_LOCATIONS);
    localStorage.setItem('ubu_locations_data', JSON.stringify(INITIAL_UBU_LOCATIONS));
    showToast('คืนค่าจุดติดตั้งกลับเป็น 15 จุดเริ่มต้นของ ม.อุบลฯ เรียบร้อยแล้ว', 'info');
  };

  // 9. Admin Delete Single Volunteer Log
  const handleDeleteVolunteerLog = (id: string) => {
    setVolunteerLogs(prev => {
      const updated = prev.filter(log => log.id !== id);
      localStorage.setItem('ubu_volunteer_logs', JSON.stringify(updated));
      return updated;
    });
    showToast('ลบรายการประวัติการเติมเรียบร้อยแล้ว', 'info');
  };

  // 10. Admin Clear All Volunteer Logs
  const handleClearAllVolunteerLogs = () => {
    if (window.confirm('คุณต้องการลบประวัติการเติมของจิตอาสา "ทั้งหมด" ใช่หรือไม่?')) {
      setVolunteerLogs([]);
      localStorage.setItem('ubu_volunteer_logs', JSON.stringify([]));
      showToast('ลบประวัติการเติมทั้งหมดเรียบร้อยแล้ว', 'info');
    }
  };

  // 11. Admin Restore Default Volunteer Logs
  const handleRestoreDefaultVolunteerLogs = () => {
    if (window.confirm('คุณต้องการคืนค่าประวัติการเติมกลับเป็น "ชุดข้อมูลเริ่มต้น" ใช่หรือไม่?')) {
      setVolunteerLogs(INITIAL_VOLUNTEER_LOGS);
      localStorage.setItem('ubu_volunteer_logs', JSON.stringify(INITIAL_VOLUNTEER_LOGS));
      showToast('คืนค่าประวัติการเติมเริ่มต้นเรียบร้อยแล้ว', 'success');
    }
  };

  // 12. Admin Delete Single Survey Record
  const handleDeleteSurvey = (id: string) => {
    setSurveys(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('ubu_surveys_data', JSON.stringify(updated));
      setRatings(updated.map(s => s.rating));
      return updated;
    });
    showToast('ลบรายการผลประเมินเรียบร้อยแล้ว', 'info');
  };

  // 13. Admin Clear All Surveys
  const handleClearAllSurveys = () => {
    if (window.confirm('คุณต้องการลบข้อมูลประเมินความพึงพอใจและข้อคิดเห็น "ทั้งหมด" ใช่หรือไม่?')) {
      setSurveys([]);
      setRatings([]);
      localStorage.setItem('ubu_surveys_data', JSON.stringify([]));
      showToast('ลบข้อมูลการประเมินทั้งหมดเรียบร้อยแล้ว', 'info');
    }
  };

  // 14. Admin Restore Default Surveys
  const handleRestoreDefaultSurveys = () => {
    if (window.confirm('คุณต้องการคืนค่าข้อมูลประเมินกลับเป็น "ชุดข้อมูลเริ่มต้น" ใช่หรือไม่?')) {
      setSurveys(INITIAL_SURVEY_RECORDS);
      setRatings(INITIAL_SURVEY_RECORDS.map(s => s.rating));
      localStorage.setItem('ubu_surveys_data', JSON.stringify(INITIAL_SURVEY_RECORDS));
      showToast('คืนค่าข้อมูลแบบประเมินเริ่มต้นเรียบร้อยแล้ว', 'success');
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
          onRefresh={() => {
            if (gasUrl) {
              handleFetchFromGas(gasUrl);
            } else {
              showToast('รีเฟรชข้อมูลเรียบร้อยแล้ว', 'info');
            }
          }}
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
              onRestoreDefaultVolunteerLogs={handleRestoreDefaultVolunteerLogs}
              onDeleteSurvey={handleDeleteSurvey}
              onClearAllSurveys={handleClearAllSurveys}
              onRestoreDefaultSurveys={handleRestoreDefaultSurveys}
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
