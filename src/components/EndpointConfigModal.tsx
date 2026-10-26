import React, { useState } from 'react';
import { 
  X, 
  Link2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Play, 
  Clock, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { GasEndpointConfig } from '../types/gas';
import { fetchGasData } from '../services/gasService';

interface EndpointConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GasEndpointConfig;
  onSaveConfig: (newConfig: GasEndpointConfig, fetchedData?: any) => void;
}

export const EndpointConfigModal: React.FC<EndpointConfigModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [url, setUrl] = useState(config.url);
  const [sheetName, setSheetName] = useState(config.sheetName || 'Sheet1');
  const [useProxy, setUseProxy] = useState(config.useProxy !== false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(config.autoRefreshInterval || 0);
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    count?: number;
    message?: string;
    sample?: any;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!url || !url.trim()) {
      setTestResult({
        success: false,
        message: 'กรุณาระบุ URL ของ Google Apps Script Web App',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const start = performance.now();

    try {
      const testConfig: GasEndpointConfig = {
        url: url.trim(),
        useProxy,
        autoRefreshInterval,
        sheetName,
        isConnected: true,
      };

      const result = await fetchGasData(testConfig);
      const end = performance.now();

      setTestResult({
        success: true,
        latencyMs: Math.round(end - start),
        count: result.records.length,
        message: `เชื่อมต่อสำเร็จ! พบข้อมูลทั้งหมด ${result.records.length} แถว (Headers: ${result.headers.join(', ') || 'ไม่มี'})`,
        sample: result.records.slice(0, 2),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'ไม่สามารถเชื่อมต่อได้ ตรวจสอบสิทธิ์การเข้าถึงเป็น "Anyone" และรูปแบบการ Deploy',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      url: url.trim(),
      sheetName: sheetName.trim(),
      useProxy,
      autoRefreshInterval,
      isConnected: Boolean(url.trim()),
      lastSyncedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">ตั้งค่าการเชื่อมต่อ Google Apps Script</h2>
              <p className="text-xs text-slate-400">กำหนด Web App URL เพื่อดึงและอัปเดตข้อมูลกับ Google Sheets จริง</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Quick Notice */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 font-medium text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>วิธีได้ URL จาก Google Sheet ของคุณ</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-6">
              ใน Google Sheet ไปที่ <b>ส่วนขยาย (Extensions) &gt; Apps Script</b> &gt; วางโค้ดจากแท็บ <b>"โค้ด Apps Script & คู่มือ"</b> &gt; กด <b>Deploy (ทำให้ใช้งานได้)</b> &gt; เลือก <b>Web App</b> &gt; Who has access: <b>Anyone</b> &gt; คัดลอก URL มาวางด้านล่าง
            </p>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
              <span>Google Apps Script Web App URL:</span>
              <span className="text-[11px] text-slate-400">ลงท้ายด้วย /exec</span>
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sheet Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-400" />
                <span>ชื่อแท็บ Sheet (Sheet Name):</span>
              </label>
              <input
                type="text"
                placeholder="Sheet1 หรือชื่อชีตของคุณ"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Auto Refresh Interval */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>ซิงค์ข้อมูลอัตโนมัติ (Auto Refresh):</span>
              </label>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value={0}>ปิด (กดซิงค์ด้วยตนเอง)</option>
                <option value={15}>ทุกๆ 15 วินาที</option>
                <option value={30}>ทุกๆ 30 วินาที</option>
                <option value={60}>ทุกๆ 1 นาที</option>
                <option value={300}>ทุกๆ 5 นาที</option>
              </select>
            </div>
          </div>

          {/* Proxy Mode Toggle */}
          <div className="flex items-start gap-3 p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-lg">
            <input
              type="checkbox"
              id="useProxyCheck"
              checked={useProxy}
              onChange={(e) => setUseProxy(e.target.checked)}
              className="mt-0.5 accent-emerald-500 cursor-pointer rounded"
            />
            <label htmlFor="useProxyCheck" className="text-xs cursor-pointer select-none">
              <div className="font-medium text-slate-200">ใช้ Server Proxy จัดการ CORS & Redirect (แนะนำอย่างยิ่ง)</div>
              <div className="text-slate-400 text-[11px] mt-0.5">
                ช่วยแก้ปัญหา Browser บล็อก CORS ของ Google Apps Script และจัดการ 302 Redirection อัตโนมัติ
              </div>
            </label>
          </div>

          {/* Test Connection Button & Result */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !url.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-700/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบการเชื่อมต่อ (Test Connection)'}</span>
            </button>

            {testResult && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>

                {testResult.latencyMs !== undefined && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pl-6">
                    <span>ความเร็วตอบสนอง (Latency):</span>
                    <span className="font-mono tabular-nums text-slate-200">{testResult.latencyMs} ms</span>
                  </div>
                )}

                {testResult.sample && testResult.sample.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400 mb-1">ตัวอย่างข้อมูลแถวแรก:</div>
                    <pre className="text-[11px] font-mono bg-slate-950/80 p-2 rounded text-slate-300 overflow-x-auto max-h-24">
                      {JSON.stringify(testResult.sample[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              setUrl('');
              setTestResult(null);
            }}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
          >
            ล้างค่า / กลับไปโหมด Demo
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              บันทึกและใช้งาน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
