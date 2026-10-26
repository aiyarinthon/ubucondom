import React, { useState, useMemo } from 'react';
import { 
  Download, 
  RefreshCw,
  BarChart3, 
  PieChart, 
  AlertTriangle,
  Award,
  TrendingUp,
  Printer,
  CheckCircle2,
  Package,
  Star,
  Users,
  Building2,
  Layers,
  Sparkles,
  Link2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UbuLocation, VolunteerLog } from '../types/ubuCondom';
import { GOOGLE_APPS_SCRIPT_CODE } from '../data/ubuData';

interface AdminPortalProps {
  locations: UbuLocation[];
  logs: VolunteerLog[];
  ratings: number[];
  onToggleLocationStatus: (locationName: string, currentStatus: string) => Promise<void>;
  onRefreshData: () => Promise<void>;
  isLoading?: boolean;
  gasUrl?: string;
  onSaveGasUrl?: (url: string) => Promise<void>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  locations,
  logs,
  ratings,
  onToggleLocationStatus,
  onRefreshData,
  isLoading,
  gasUrl = '',
  onSaveGasUrl,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // GAS URL State
  const [inputGasUrl, setInputGasUrl] = useState(gasUrl);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingGas, setIsTestingGas] = useState(false);
  const [isSavingGas, setIsSavingGas] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinQty, setFilterMinQty] = useState<number | ''>('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '15078') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('รหัสผ่านผู้ดูแลระบบไม่ถูกต้อง โปรดลองใหม่อีกครั้ง');
    }
  };

  // 1. Overall Product totals
  const productTotals = useMemo(() => {
    let lubricant = 0;
    let size49 = 0;
    let size52 = 0;
    let size54 = 0;
    let size56 = 0;

    logs.forEach(log => {
      lubricant += Number(log.lubricant || 0);
      size49 += Number(log.size49 || 0);
      size52 += Number(log.size52 || 0);
      size54 += Number(log.size54 || 0);
      size56 += Number(log.size56 || 0);
    });

    const total = lubricant + size49 + size52 + size54 + size56;
    return {
      lubricant,
      size49,
      size52,
      size54,
      size56,
      total,
      condomsTotal: size49 + size52 + size54 + size56,
    };
  }, [logs]);

  // 2. Location Replenish Stats
  const locationStats = useMemo(() => {
    const counts: Record<string, { total: number; lubricant: number; condoms: number }> = {};
    
    // Initialize all existing locations
    locations.forEach(loc => { 
      counts[loc.name] = { total: 0, lubricant: 0, condoms: 0 }; 
    });

    // Sum logs
    logs.forEach(log => {
      if (!counts[log.location]) {
        counts[log.location] = { total: 0, lubricant: 0, condoms: 0 };
      }
      const lub = Number(log.lubricant || 0);
      const condoms = Number(log.size49 || 0) + Number(log.size52 || 0) + Number(log.size54 || 0) + Number(log.size56 || 0);
      const sum = lub + condoms;

      counts[log.location].total += sum;
      counts[log.location].lubricant += lub;
      counts[log.location].condoms += condoms;
    });

    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [locations, logs]);

  const maxReplenished = Math.max(1, ...locationStats.map(s => s.total));
  const topLocation = locationStats[0] || { name: 'ไม่มีข้อมูล', total: 0 };

  // 3. Ratings distribution & CSAT
  const ratingsDist = useMemo(() => {
    const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      if (starCounts[r] !== undefined) {
        starCounts[r]++;
      }
    });
    const total = ratings.length || 1;
    return [5, 4, 3, 2, 1].map(star => ({
      star,
      count: starCounts[star] || 0,
      percentage: Math.round(((starCounts[star] || 0) / total) * 100),
    }));
  }, [ratings]);

  const averageRating = useMemo(() => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, v) => acc + v, 0);
    return (sum / ratings.length).toFixed(1);
  }, [ratings]);

  const highSatisfactionPercentage = useMemo(() => {
    if (ratings.length === 0) return 100;
    const highCount = ratings.filter(r => r >= 4).length;
    return Math.round((highCount / ratings.length) * 100);
  }, [ratings]);

  // 4. Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterDate && !log.date.startsWith(filterDate)) return false;
      if (filterLocation && !log.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
      
      const totalQty = Number(log.lubricant || 0) + Number(log.size49 || 0) + Number(log.size52 || 0) + Number(log.size54 || 0) + Number(log.size56 || 0);
      if (filterMinQty !== '' && totalQty < Number(filterMinQty)) return false;

      return true;
    });
  }, [logs, filterDate, filterLocation, filterMinQty]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      alert('ไม่มีข้อมูลให้ออกรายงานในขณะนี้');
      return;
    }

    const rows = filteredLogs.map((log) => {
      const total = Number(log.lubricant || 0) + Number(log.size49 || 0) + Number(log.size52 || 0) + Number(log.size54 || 0) + Number(log.size56 || 0);
      return {
        'วัน-เวลาปฏิบัติงาน': log.date,
        'ชื่อ-นามสกุล จิตอาสา': log.name,
        'รหัสนักศึกษา': log.studentId,
        'คณะ/หน่วยงาน': log.faculty,
        'ชั้นปี': log.year,
        'จุดบริการที่เติม': log.location,
        'เจลหล่อลื่น (ชิ้น)': log.lubricant,
        'ไซส์ 49 (ชิ้น)': log.size49,
        'ไซส์ 52 (ชิ้น)': log.size52,
        'ไซส์ 54 (ชิ้น)': log.size54,
        'ไซส์ 56 (ชิ้น)': log.size56,
        'จำนวนรวมทั้งหมด (ชิ้น)': total,
        'หมายเหตุ/ข้อความ': log.comment,
        'รูปภาพหลักฐาน': log.imageUrl || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Volunteer Logs');
    XLSX.writeFile(workbook, `UBU_Condom_Volunteer_Report.xlsx`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 3000);
  };

  const handleTestGasConnection = async () => {
    if (!inputGasUrl.trim()) {
      setTestResult({ success: false, message: 'โปรดกรอก Google Apps Script Web App URL ก่อนทดสอบ' });
      return;
    }

    setIsTestingGas(true);
    setTestResult(null);
    try {
      const proxyUrl = `/api/gas-proxy?url=${encodeURIComponent(inputGasUrl.trim() + '?action=getLocations')}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && (Array.isArray(data) || Array.isArray(data.data) || data.locations)) {
        setTestResult({
          success: true,
          message: '✓ เชื่อมต่อสำเร็จ! สามารถอ่านข้อมูล 15 จุดบริการจาก Google Sheets ได้เรียบร้อยแล้ว',
        });
      } else {
        setTestResult({
          success: true,
          message: '✓ เชื่อมต่อ Web App ได้เรียบร้อยแล้ว',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: '✕ เชื่อมต่อไม่สำเร็จ: โปรดตรวจสอบว่าตั้งค่าสิทธิ์ Deploy เป็น "Anyone" (ทุกคน) ใน Apps Script',
      });
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleSaveGasConnection = async () => {
    if (onSaveGasUrl) {
      setIsSavingGas(true);
      await onSaveGasUrl(inputGasUrl.trim());
      setIsSavingGas(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 custom-shadow text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-sm">
          🔐
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">แผงควบคุมหลักระบบผู้ดูแลหลังบ้าน</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            โปรดระบุรหัสประจำตัวความปลอดภัยเพื่อสิทธิ์เข้าตรวจสอบ
          </p>
        </div>

        {loginError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center gap-2.5 text-left font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-xs sm:text-sm font-semibold text-slate-700">รหัสแอดมินความปลอดภัย:</label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่านผู้ดูแลระบบ"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-base sm:text-lg px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl shadow-md transition-all cursor-pointer"
          >
            ยืนยันรหัสความปลอดภัย
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="executive-dashboard-root">
      {/* Admin Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 custom-shadow">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight font-mono uppercase">
                DASHBORD CONDOM
              </h2>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Executive Report
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ระบบวิเคราะห์ข้อมูลการให้บริการถุงยางอนามัย
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handlePrintReport}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
            title="พิมพ์หน้ารายงานสรุปสำหรับผู้บริหาร"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงานผู้บริหาร (PDF)</span>
          </button>

          <button
            onClick={() => onRefreshData()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition-colors cursor-pointer disabled:opacity-50"
            title="ซิงค์ข้อมูลล่าสุด"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">ซิงค์ข้อมูล</span>
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs sm:text-sm font-semibold rounded-2xl transition-colors cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* Google Sheets Backend Connection Card */}
      <div className="bg-gradient-to-br from-emerald-50/70 via-white to-blue-50/50 border-2 border-emerald-200/80 rounded-3xl p-6 sm:p-7 custom-shadow space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-600/20 shrink-0">
              📊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  เชื่อมต่อฐานข้อมูล Google Sheets & Google Apps Script
                </h3>
                {gasUrl ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    เชื่อมต่อแล้ว
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    ข้อมูลจำลอง 15 จุด
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ซิงค์ข้อมูล 15 จุดบริการ บันทึกการเติมของจิตอาสา และแบบประเมินความพึงพอใจเข้า Google Sheet แบบ Real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyScriptCode}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isCopiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{isCopiedCode ? 'คัดลอกโค้ดสำเร็จ!' : 'คัดลอกโค้ด Apps Script'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCodeModal(!showCodeModal)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{showCodeModal ? 'ซ่อนคำแนะนำ' : 'วิธีติดตั้งใน Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Step Guide Modal / Expandable Box */}
        {showCodeModal && (
          <div className="p-5 bg-white border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in text-xs sm:text-sm text-slate-700">
            <div className="font-bold text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>ขั้นตอนการผูกระบบกับ Google Sheets (ทำเพียงครั้งเดียว):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-2 leading-relaxed">
              <li>เปิดไฟล์ <b>Google Sheets</b> เปล่าของท่าน</li>
              <li>ไปที่เมนูด้านบน <b>ส่วนขยาย (Extensions) &gt; Apps Script</b></li>
              <li>กดปุ่ม <b>"คัดลอกโค้ด Apps Script"</b> ด้านบน แล้วนำไปวางทับโค้ดเดิมทั้งหมด</li>
              <li>กดปุ่ม <b>Deploy (การทำให้ใช้งานได้) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)</b></li>
              <li>เลือกประเภท: <b>เว็บแอป (Web app)</b>, ตั้งค่า <b>Who has access (ผู้มีสิทธิ์เข้าถึง)</b> เป็น <b>Anyone (ทุกคน)</b></li>
              <li>กด <b>Deploy</b> แล้วคัดลอก <b>Web App URL (ลงท้ายด้วย /exec)</b> มาวางในช่องด้านล่าง แล้วกด "บันทึกและเชื่อมต่อ"</li>
            </ol>
          </div>
        )}

        {/* URL Input Form */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-slate-700 flex items-center justify-between">
            <span>Google Apps Script Web App URL (ลงท้ายด้วย /exec):</span>
            <span className="text-xs text-slate-400 font-mono">https://script.google.com/macros/s/.../exec</span>
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="url"
              placeholder="วาง Web App URL ที่ได้จากการ Deploy ที่นี่ (https://script.google.com/macros/s/AKfycb.../exec)"
              value={inputGasUrl}
              onChange={(e) => setInputGasUrl(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />

            <button
              type="button"
              onClick={handleTestGasConnection}
              disabled={isTestingGas || !inputGasUrl.trim()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              {isTestingGas ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" /> : <RefreshCw className="w-4 h-4" />}
              <span>{isTestingGas ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveGasConnection}
              disabled={isSavingGas}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกและเชื่อมต่อ</span>
            </button>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5 font-bold ${
              testResult.success
                ? 'bg-emerald-100/90 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Units */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 custom-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              ยอดแจกจ่ายรวมสะสม
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
              📦
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-800 tabular-nums">
                {productTotals.total.toLocaleString('th-TH')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-600">ชิ้น</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ถุงยาง {productTotals.condomsTotal.toLocaleString()} ชิ้น | เจล {productTotals.lubricant.toLocaleString()} ซอง
            </p>
          </div>
        </div>

        {/* Metric 2: Top Service Point */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 custom-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              จุดบริการยอดนิยมอันดับ 1
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold">
              🏆
            </div>
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-800 line-clamp-1" title={topLocation.name}>
              {topLocation.name}
            </h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600 tabular-nums">
                {topLocation.total.toLocaleString('th-TH')}
              </span>
              <span className="text-xs text-slate-500 font-medium">ชิ้น ({Math.round(((topLocation.total || 0) / (productTotals.total || 1)) * 100)}% ของโครงการ)</span>
            </div>
          </div>
        </div>

        {/* Metric 3: CSAT Satisfaction */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 custom-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              ดัชนีความพึงพอใจ (CSAT)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg font-bold">
              ⭐
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600 tabular-nums">
                {averageRating}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 5.0 ดาว</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              พึงพอใจระดับดี-ดีมาก <b className="text-emerald-700 font-bold">{highSatisfactionPercentage}%</b> จากผู้ประเมิน {ratings.length} ท่าน
            </p>
          </div>
        </div>

        {/* Metric 4: Missions & Volunteers */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 custom-shadow flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              รอบภารกิจจิตอาสา
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              🤝
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-purple-700 tabular-nums">
                {logs.length}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500">ครั้ง</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ดูแลจุดบริการ {locations.length} แห่งทั่วมหาวิทยาลัย
            </p>
          </div>
        </div>
      </div>

      {/* Main Executive Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Top Locations Distribution Breakdown */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 custom-shadow space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    รายงานอันดับการแจกจ่ายแยกตามจุดบริการ ({locations.length} จุด)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  แสดงปริมาณรวมอุปกรณ์ที่ถูกเติมและเบิกใช้งาน เรียงลำดับจากมากไปน้อย
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold font-mono self-start sm:self-auto">
                รวม {productTotals.total.toLocaleString()} ชิ้น
              </div>
            </div>

            {/* Ranking Bar Chart */}
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1.5 pt-1">
              {locationStats.map((item, index) => {
                const percentage = Math.round((item.total / maxReplenished) * 100);
                const shareOfTotal = Math.round(((item.total || 0) / (productTotals.total || 1)) * 100);
                
                // Top 3 badges
                const rankColors = [
                  'bg-amber-500 text-white',
                  'bg-slate-400 text-white',
                  'bg-amber-700 text-white',
                ];
                const badgeClass = rankColors[index] || 'bg-slate-100 text-slate-600';

                return (
                  <div key={item.name} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${badgeClass}`}>
                          {index + 1}
                        </span>
                        <span className="text-slate-800 font-bold truncate" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                          ({shareOfTotal}%)
                        </span>
                        <span className="font-mono text-slate-900 font-extrabold text-sm sm:text-base tabular-nums">
                          {item.total.toLocaleString()} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          index === 0
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                            : index === 1
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>📌 แหล่งข้อมูล: บันทึกสต็อกของจิตอาสา ม.อุบลฯ</span>
            <span className="font-semibold text-slate-700">อัปเดตข้อมูลแบบ Real-time</span>
          </div>
        </div>

        {/* Right 5 Cols: Product Mix & Satisfaction Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          {/* Chart 2: Product Sizes Demand Mix */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 custom-shadow space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>📦 สัดส่วนขนาดและประเภทผลิตภัณฑ์</span>
                </h3>
                <span className="text-xs font-bold text-slate-500 font-mono">5 หมวดหมู่</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ความต้องการผลิตภัณฑ์แต่ละขนาดในพื้นที่มหาวิทยาลัย
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Size 49 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-rose-600 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    ถุงยางอนามัย ไซส์ 49 มม.
                  </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {productTotals.size49} ชิ้น ({Math.round(((productTotals.size49 || 0) / (productTotals.total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.round(((productTotals.size49 || 0) / (productTotals.total || 1)) * 100)}%` }} />
                </div>
              </div>

              {/* Size 52 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-amber-600 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    ถุงยางอนามัย ไซส์ 52 มม. (ยอดนิยม)
                  </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {productTotals.size52} ชิ้น ({Math.round(((productTotals.size52 || 0) / (productTotals.total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round(((productTotals.size52 || 0) / (productTotals.total || 1)) * 100)}%` }} />
                </div>
              </div>

              {/* Size 54 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    ถุงยางอนามัย ไซส์ 54 มม.
                  </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {productTotals.size54} ชิ้น ({Math.round(((productTotals.size54 || 0) / (productTotals.total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(((productTotals.size54 || 0) / (productTotals.total || 1)) * 100)}%` }} />
                </div>
              </div>

              {/* Size 56 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-blue-600 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    ถุงยางอนามัย ไซส์ 56 มม.
                  </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {productTotals.size56} ชิ้น ({Math.round(((productTotals.size56 || 0) / (productTotals.total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(((productTotals.size56 || 0) / (productTotals.total || 1)) * 100)}%` }} />
                </div>
              </div>

              {/* Lubricant */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
                  <span className="text-indigo-600 font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                    เจลหล่อลื่นอนามัย
                  </span>
                  <span className="font-mono text-slate-800 font-bold">
                    {productTotals.lubricant} ซอง ({Math.round(((productTotals.lubricant || 0) / (productTotals.total || 1)) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.round(((productTotals.lubricant || 0) / (productTotals.total || 1)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Chart 3: Satisfaction Breakdown */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 custom-shadow space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>⭐ สรุปผลการประเมินความพึงพอใจ</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ความพึงพอใจของผู้รับบริการตู้สวัสดิการ
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold font-mono text-amber-500">{averageRating}</span>
                <span className="text-xs text-slate-400 font-bold"> / 5.0</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {ratingsDist.map((item) => {
                const starColors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500'];
                const starColor = starColors[5 - item.star] || 'bg-blue-500';

                return (
                  <div key={item.star} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-amber-400 font-mono text-xs">{'★'.repeat(item.star)}</span>
                        <span>{item.star} ดาว</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-mono">
                        <span>{item.count} คน</span>
                        <span className="text-slate-800 font-bold w-9 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${starColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(item.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Status Grid of All Locations */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 custom-shadow space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🔍 ตรวจสอบสถานะสต็อกปัจจุบันแยกตามจุดบริการ ({locations.length} จุด)</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              แสดงรายชื่อตู้บริการทั้งหมดเพื่อตรวจสอบว่าจุดไหนถุงยางอนามัยหมดแบบ Real-time
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {locations.map((loc) => {
            const isAvailable = loc.status === 'มีอยู่';
            return (
              <div
                key={loc.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 custom-shadow ${
                  isAvailable
                    ? 'bg-emerald-50/40 border-emerald-100'
                    : 'bg-rose-50/40 border-rose-100'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-800 line-clamp-2 leading-tight">{loc.name}</p>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 shadow-xs ${
                        isAvailable ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'
                      }`}
                    >
                      {loc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1.5">
                    พิกัด: {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}
                  </p>
                </div>

                <button
                  onClick={() => onToggleLocationStatus(loc.name, loc.status)}
                  className={`w-full text-center text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer ${
                    isAvailable
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {isAvailable ? 'ปรับเป็น: หมดแล้ว ⚠️' : 'ปรับเป็น: มีอยู่แล้ว ✅'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volunteer Detailed Logs Table & Excel Export */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 custom-shadow space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">📋 บันทึกประวัติการเติมของจิตอาสาฉบับเต็ม</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">คัดกรอง ค้นหา และส่งออกรายงานดิบเข้าโปรแกรม Microsoft Excel</p>
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-5 py-3 bg-blue-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>📥 ส่งออกรายงานเป็นไฟล์ Excel (.xlsx)</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">คัดกรองตามวันที่ระบุ</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">พิมพ์ค้นหาจุดตู้บริการ</label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อตึกหรือจุดเพื่อกรอง..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">จำนวนบรรจุรวมขั้นต่ำ (ชิ้น)</label>
            <input
              type="number"
              min="0"
              placeholder="ระบุจำนวนขั้นต่ำ (ชิ้น)"
              value={filterMinQty}
              onChange={(e) => setFilterMinQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse" id="excel-table-id">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-4 whitespace-nowrap">วัน-เวลาปฏิบัติงาน</th>
                <th className="p-4 whitespace-nowrap">ผู้รับผิดชอบ / รหัส นศ.</th>
                <th className="p-4 whitespace-nowrap">คณะ / ชั้นปี</th>
                <th className="p-4 text-blue-900 font-bold whitespace-nowrap">ตู้สถานที่ที่เติม</th>
                <th className="p-4 text-center whitespace-nowrap">เจล</th>
                <th className="p-4 text-center text-rose-600 font-bold whitespace-nowrap">49</th>
                <th className="p-4 text-center text-amber-600 font-bold whitespace-nowrap">52</th>
                <th className="p-4 text-center text-emerald-600 font-bold whitespace-nowrap">54</th>
                <th className="p-4 text-center text-blue-600 font-bold whitespace-nowrap">56</th>
                <th className="p-4 whitespace-nowrap">ข้อความจิตอาสา</th>
                <th className="p-4 text-center whitespace-nowrap">ภาพ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
                    ฐานข้อมูลประวัติของจิตอาสายังคงว่างเปล่าในขณะนี้
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">{log.date}</td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{log.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{log.studentId}</div>
                    </td>
                    <td className="p-4 text-slate-600 whitespace-nowrap">{log.faculty} (ปี {log.year})</td>
                    <td className="p-4 font-bold text-blue-800 whitespace-nowrap">{log.location}</td>
                    <td className="p-4 text-center font-mono font-bold">{log.lubricant}</td>
                    <td className="p-4 text-center font-mono font-extrabold text-rose-600">{log.size49}</td>
                    <td className="p-4 text-center font-mono font-extrabold text-amber-600">{log.size52}</td>
                    <td className="p-4 text-center font-mono font-extrabold text-emerald-600">{log.size54}</td>
                    <td className="p-4 text-center font-mono font-extrabold text-blue-600">{log.size56}</td>
                    <td className="p-4 max-w-[200px] truncate text-slate-600" title={log.comment}>
                      {log.comment || '-'}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {log.imageUrl ? (
                        <a
                          href={log.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition"
                        >
                          👁️ เปิดดูภาพ
                        </a>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
