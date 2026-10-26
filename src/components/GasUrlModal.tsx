import React, { useState } from 'react';
import { 
  X, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  ShieldCheck, 
  Database
} from 'lucide-react';

interface GasUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasUrl: string;
  onSaveUrl: (url: string) => Promise<void>;
  isLoading?: boolean;
}

export const GasUrlModal: React.FC<GasUrlModalProps> = ({
  isOpen,
  onClose,
  gasUrl,
  onSaveUrl,
  isLoading,
}) => {
  const [urlInput, setUrlInput] = useState(gasUrl);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!urlInput.trim()) {
      setTestStatus({ success: false, message: 'กรุณาระบุ Web App URL ของ Google Apps Script' });
      return;
    }

    setIsTesting(true);
    setTestStatus(null);
    try {
      const testUrl = `/api/gas-proxy?url=${encodeURIComponent(urlInput.trim() + '?action=getLocations')}`;
      const res = await fetch(testUrl);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();

      if (data && (Array.isArray(data) || Array.isArray(data.data) || data.locations)) {
        setTestStatus({
          success: true,
          message: 'เชื่อมต่อกับ Google Apps Script สำเร็จ! สามารถอ่านข้อมูลตารางได้เรียบร้อย',
        });
      } else {
        setTestStatus({
          success: true,
          message: 'เชื่อมต่อ Web App ได้เรียบร้อยแล้ว',
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err.message || 'ไม่สามารถติดต่อ Web App ได้ กรุณาตรวจสอบว่าตั้งค่าสิทธิ์เป็น Anyone แล้ว',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    await onSaveUrl(urlInput.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">ตั้งค่า Google Apps Script Web App URL</h2>
              <p className="text-xs text-slate-500">เชื่อมต่อกับ Google Sheets ของโครงการ UBU Condom</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-xs sm:text-sm text-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-800">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>วิธีรับ Web App URL จาก Google Apps Script</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-xs pl-6">
              ใน Google Sheets &gt; <b>ส่วนขยาย &gt; Apps Script</b> &gt; กด <b>Deploy (การทำให้ใช้งานได้)</b> &gt; เลือก <b>Web App</b> &gt; กำหนด Who has access เป็น <b>Anyone (ทุกคน)</b> &gt; คัดลอก URL นำมาวางด้านล่าง
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
              <span>Google Apps Script Web App URL:</span>
              <span className="text-xs text-slate-400 font-mono">ลงท้ายด้วย /exec</span>
            </label>
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Test button & Status */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !urlInput.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ (Test Connection)'}</span>
            </button>

            {testStatus && (
              <div
                className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5 font-medium ${
                  testStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {testStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setUrlInput('');
              onSaveUrl('');
              onClose();
            }}
            className="text-xs sm:text-sm font-medium text-slate-400 hover:text-rose-600 transition-colors"
          >
            ล้างค่า / ใช้ข้อมูลจำลอง ม.อุบลฯ
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-colors"
            >
              บันทึกและใช้งาน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
