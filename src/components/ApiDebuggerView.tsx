import React, { useState } from 'react';
import { 
  TerminalSquare, 
  Send, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Code2, 
  RotateCcw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { GasEndpointConfig, ApiLogEntry } from '../types/gas';
import { fetchGasData, sendGasPostAction } from '../services/gasService';

interface ApiDebuggerViewProps {
  config: GasEndpointConfig;
  onOpenConfig: () => void;
}

export const ApiDebuggerView: React.FC<ApiDebuggerViewProps> = ({
  config,
  onOpenConfig,
}) => {
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [customAction, setCustomAction] = useState<string>('create');
  const [jsonPayload, setJsonPayload] = useState<string>(
    JSON.stringify({
      action: 'create',
      data: {
        id: 'TEST-' + Math.floor(1000 + Math.random() * 9000),
        name: 'ตัวอย่างข้อมูลทดสอบ',
        category: 'ทั่วไป',
        status: 'Active',
        createdAt: new Date().toISOString().split('T')[0]
      }
    }, null, 2)
  );

  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);

  const handleSendRequest = async () => {
    if (!config.url) {
      onOpenConfig();
      return;
    }

    setIsLoading(true);
    const start = performance.now();
    const logId = 'log-' + Date.now();

    try {
      let responseBody: any;
      let status = 200;

      if (method === 'GET') {
        const res = await fetchGasData(config);
        responseBody = res.rawResponse;
      } else {
        let parsedPayload: any;
        try {
          parsedPayload = JSON.parse(jsonPayload);
        } catch {
          throw new Error('รูปแบบ JSON Payload ไม่ถูกต้อง กรุณาตรวจสอบวงเล็บและเครื่องหมายคำพูด');
        }
        responseBody = await sendGasPostAction(config, parsedPayload);
      }

      const durationMs = Math.round(performance.now() - start);
      const newEntry: ApiLogEntry = {
        id: logId,
        timestamp: new Date().toLocaleTimeString('th-TH'),
        method,
        url: config.url,
        payload: method === 'POST' ? JSON.parse(jsonPayload) : undefined,
        responseStatus: status,
        durationMs,
        success: true,
        responseBody,
      };

      setLogs(prev => [newEntry, ...prev]);
      setActiveLogId(logId);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      const newEntry: ApiLogEntry = {
        id: logId,
        timestamp: new Date().toLocaleTimeString('th-TH'),
        method,
        url: config.url,
        payload: method === 'POST' ? jsonPayload : undefined,
        responseStatus: 500,
        durationMs,
        success: false,
        responseBody: null,
        error: err.message || 'เกิดข้อผิดพลาดในการเรียก Google Apps Script',
      };

      setLogs(prev => [newEntry, ...prev]);
      setActiveLogId(logId);
    } finally {
      setIsLoading(false);
    }
  };

  const activeLog = logs.find(l => l.id === activeLogId) || logs[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TerminalSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">API Inspector & Google Apps Script Debugger</h2>
              <p className="text-xs text-slate-400">ทดสอบยิงคำขอ GET & POST จำลอง Payload และตรวจสอบ Response แบบเรียลไทม์</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Endpoint:</span>
            <span className="text-xs font-mono text-emerald-400 max-w-[220px] truncate bg-slate-950 px-2 py-1 rounded border border-slate-800">
              {config.url || 'ยังไม่ได้ตั้งค่า URL'}
            </span>
            <button
              onClick={onOpenConfig}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              แก้ไข
            </button>
          </div>
        </div>
      </div>

      {/* Main Debugger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Request Builder */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-semibold text-slate-200">สร้างคำขอทดสอบ (Request Builder)</h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setMethod('GET')}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    method === 'GET'
                      ? 'bg-emerald-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  GET (ดึงข้อมูล)
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('POST')}
                  className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                    method === 'POST'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  POST (ส่งข้อมูล)
                </button>
              </div>
            </div>

            {/* If POST: Show JSON Payload Editor */}
            {method === 'POST' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-slate-400 font-medium">JSON Request Body (ส่งเข้า doPost):</label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setJsonPayload(JSON.stringify({ action: 'create', data: { id: 'PRD-999', name: 'สินค้าใหม่', price: 590, status: 'พร้อมจำหน่าย' } }, null, 2))}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      เทมเพลต Create
                    </button>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <button
                      onClick={() => setJsonPayload(JSON.stringify({ action: 'update', primaryKey: 'id', id: 'PRD-1001', data: { price: 49900, status: 'พร้อมจำหน่าย' } }, null, 2))}
                      className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                    >
                      เทมเพลต Update
                    </button>
                    <span aria-hidden="true" className="text-slate-700">·</span>
                    <button
                      onClick={() => setJsonPayload(JSON.stringify({ action: 'delete', primaryKey: 'id', id: 'PRD-1001' }, null, 2))}
                      className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                    >
                      เทมเพลต Delete
                    </button>
                  </div>
                </div>

                <textarea
                  value={jsonPayload}
                  onChange={(e) => setJsonPayload(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed"
                />
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleSendRequest}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังส่งคำขอไปยัง Apps Script...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>ยิงคำขอทดสอบ ({method} Request)</span>
                </>
              )}
            </button>
          </div>

          {/* Tips for GAS Debugging */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <HelpCircle className="w-4 h-4" />
              <span>เทคนิคแก้ปัญหาทั่วไป (Common Troubleshooting)</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li><b>เกิด Error 302 Redirection:</b> ระบบ Proxy ในแอปนี้จะ Follow Redirect ให้โดยอัตโนมัติแล้ว</li>
              <li><b>สคริปต์ไม่อัปเดตเมื่อแก้ Code.gs:</b> ใน Google Apps Script ต้องกด <b>Deploy &gt; Manage Deployments &gt; Edit &gt; เลือก Version ใหม่</b> ทุกครั้งหลังแก้โค้ด</li>
              <li><b>สิทธิ์เข้าถึง:</b> ตรวจสอบว่า Who has access ได้เลือกเป็น <b>Anyone (ทุกคน)</b></li>
            </ul>
          </div>
        </div>

        {/* Right 6 cols: Response Inspector & History Logs */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[400px]">
            {/* Inspector Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">ผลลัพธ์ตอบกลับ (Response Inspector)</span>
              </div>

              {activeLog && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded text-[11px] ${
                    activeLog.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {activeLog.success ? '200 OK' : 'ERROR'}
                  </span>
                  <span className="text-slate-400 tabular-nums">{activeLog.durationMs}ms</span>
                </div>
              )}
            </div>

            {/* Inspector Body */}
            <div className="p-4 flex-1 overflow-x-auto max-h-[480px] font-mono text-[11px] leading-relaxed text-slate-300 select-all">
              {activeLog ? (
                <div>
                  {activeLog.error ? (
                    <div className="text-rose-400 p-2 bg-rose-950/20 border border-rose-800/40 rounded">
                      ❌ {activeLog.error}
                    </div>
                  ) : (
                    <pre className="text-emerald-300">
                      <code>{JSON.stringify(activeLog.responseBody, null, 2)}</code>
                    </pre>
                  )}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-600">
                  กดปุ่ม "ยิงคำขอทดสอบ" ด้านซ้ายเพื่อดูผลลัพธ์
                </div>
              )}
            </div>
          </div>

          {/* Recent Request Logs History */}
          {logs.length > 0 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800">
                <span>ประวัติคำขอที่ยิงแล้ว ({logs.length})</span>
                <button
                  onClick={() => setLogs([])}
                  className="text-[10px] text-slate-500 hover:text-rose-400 cursor-pointer"
                >
                  ล้างประวัติ
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    onClick={() => setActiveLogId(log.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                      activeLogId === log.id
                        ? 'bg-slate-800 border border-slate-700 text-white'
                        : 'bg-slate-950/60 hover:bg-slate-800/40 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        log.method === 'GET' ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'
                      }`}>
                        {log.method}
                      </span>
                      <span className="text-slate-300 text-[11px]">{log.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-2 tabular-nums">
                      <span>{log.durationMs}ms</span>
                      {log.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
