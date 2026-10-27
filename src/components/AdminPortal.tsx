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
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Compass,
  Crosshair,
  ExternalLink,
  Search,
  RotateCcw,
  X,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { UbuLocation, VolunteerLog, SurveyRecord } from '../types/ubuCondom';

// คณะและหน่วยงานหลักในมหาวิทยาลัยอุบลราชธานี
const UBU_ZONES = [
  'คณะวิทยาศาสตร์',
  'คณะเกษตรศาสตร์',
  'คณะวิศวกรรมศาสตร์',
  'คณะศิลปศาสตร์',
  'คณะเภสัชศาสตร์',
  'คณะบริหารศาสตร์',
  'คณะพยาบาลศาสตร์',
  'คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์',
  'คณะนิติศาสตร์',
  'คณะรัฐศาสตร์',
  'วิทยาลัยแพทยศาสตร์และการสาธารณสุข',
  'โรงพยาบาลมหาวิทยาลัยอุบลราชธานี',
  'อาคารเรียนรวม / ส่วนกลาง',
  'หอพักนักศึกษา',
];

interface AdminPortalProps {
  locations: UbuLocation[];
  logs: VolunteerLog[];
  ratings: number[];
  surveys?: SurveyRecord[];
  onToggleLocationStatus: (locationName: string, currentStatus: string) => Promise<void>;
  onAddLocation?: (location: Omit<UbuLocation, 'id'>) => void;
  onEditLocation?: (id: string | number, updated: Partial<UbuLocation>) => void;
  onDeleteLocation?: (id: string | number) => void;
  onResetDefaultLocations?: () => void;
  onDeleteVolunteerLog?: (id: string) => void;
  onClearAllVolunteerLogs?: () => void;
  onRestoreDefaultVolunteerLogs?: () => void;
  onDeleteSurvey?: (id: string) => void;
  onClearAllSurveys?: () => void;
  onRestoreDefaultSurveys?: () => void;
  onRefreshData: () => Promise<void>;
  isLoading?: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  locations,
  logs,
  ratings,
  surveys = [],
  onToggleLocationStatus,
  onAddLocation,
  onEditLocation,
  onDeleteLocation,
  onResetDefaultLocations,
  onDeleteVolunteerLog,
  onClearAllVolunteerLogs,
  onRestoreDefaultVolunteerLogs,
  onDeleteSurvey,
  onClearAllSurveys,
  onRestoreDefaultSurveys,
  onRefreshData,
  isLoading,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Location Management State
  const [locationSearch, setLocationSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<'all' | 'available' | 'empty'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | number | null>(null);

  // Form State for Add/Edit Location
  const [formName, setFormName] = useState('');
  const [formZone, setFormZone] = useState('');
  const [formLandmark, setFormLandmark] = useState('');
  const [formLat, setFormLat] = useState<number | ''>(15.1190);
  const [formLng, setFormLng] = useState<number | ''>(104.9060);
  const [formStatus, setFormStatus] = useState<'มีอยู่' | 'หมดแล้ว'>('มีอยู่');
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [formError, setFormError] = useState('');

  // Table Filters
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

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormName('');
    setFormZone(UBU_ZONES[0]);
    setFormLandmark('');
    setFormLat(15.1190);
    setFormLng(104.9060);
    setFormStatus('มีอยู่');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (loc: UbuLocation) => {
    setModalMode('edit');
    setEditingId(loc.id);
    setFormName(loc.name);
    setFormZone(loc.zone || UBU_ZONES[0]);
    setFormLandmark(loc.landmark || '');
    setFormLat(loc.lat);
    setFormLng(loc.lng);
    setFormStatus(loc.status === 'หมดแล้ว' ? 'หมดแล้ว' : 'มีอยู่');
    setFormError('');
    setIsModalOpen(true);
  };

  // Auto-fill GPS from current device
  const handleGetDeviceGps = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLat(Number(pos.coords.latitude.toFixed(6)));
        setFormLng(Number(pos.coords.longitude.toFixed(6)));
        setIsLocatingGps(false);
      },
      (err) => {
        setIsLocatingGps(false);
        alert('ไม่สามารถดึงตำแหน่ง GPS ได้ โปรดอนุญาตสิทธิ์ Location ในเบราว์เซอร์');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save Add/Edit
  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('กรุณากรอกชื่อจุดติดตั้ง / อาคาร');
      return;
    }
    if (formLat === '' || formLng === '') {
      setFormError('กรุณาระบุพิกัดละติจูดและลองจิจูดให้ถูกต้อง');
      return;
    }

    if (modalMode === 'add') {
      if (onAddLocation) {
        onAddLocation({
          name: formName.trim(),
          zone: formZone.trim(),
          landmark: formLandmark.trim(),
          lat: Number(formLat),
          lng: Number(formLng),
          status: formStatus,
        });
      }
    } else if (modalMode === 'edit' && editingId !== null) {
      if (onEditLocation) {
        onEditLocation(editingId, {
          name: formName.trim(),
          zone: formZone.trim(),
          landmark: formLandmark.trim(),
          lat: Number(formLat),
          lng: Number(formLng),
          status: formStatus,
        });
      }
    }

    setIsModalOpen(false);
  };

  // Delete Location Confirmation
  const handleDeleteClick = (loc: UbuLocation) => {
    if (window.confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการ "ลบจุดติดตั้งนี้" ออกจากระบบ?\n\n• ชื่อจุด: ${loc.name}\n\nเมื่อลบแล้ว จุดนี้จะไม่แสดงบนแผนที่และรายการเติมของจิตอาสาอีกต่อไป`)) {
      if (onDeleteLocation) {
        onDeleteLocation(loc.id);
      }
    }
  };

  // Filtered locations for management view
  const filteredLocationList = useMemo(() => {
    return locations.filter(loc => {
      const matchSearch = loc.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        (loc.zone && loc.zone.toLowerCase().includes(locationSearch.toLowerCase())) ||
        (loc.landmark && loc.landmark.toLowerCase().includes(locationSearch.toLowerCase()));

      if (!matchSearch) return false;

      if (locationFilter === 'available') return loc.status === 'มีอยู่';
      if (locationFilter === 'empty') return loc.status === 'หมดแล้ว';
      return true;
    });
  }, [locations, locationSearch, locationFilter]);

  // Overall Product totals
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

  // Location Replenish Stats
  const locationStats = useMemo(() => {
    const counts: Record<string, { total: number; lubricant: number; condoms: number }> = {};
    
    locations.forEach(loc => { 
      counts[loc.name] = { total: 0, lubricant: 0, condoms: 0 }; 
    });

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

  // Ratings distribution & CSAT
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

  // Filtered Logs
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

  // Survey Table Filters
  const [surveySearch, setSurveySearch] = useState('');
  const [surveyStarFilter, setSurveyStarFilter] = useState<'all' | number>('all');

  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const query = surveySearch.toLowerCase().trim();
      const matchText = !query || 
        s.feedback.toLowerCase().includes(query) || 
        s.date.toLowerCase().includes(query);

      const matchStar = surveyStarFilter === 'all' || s.rating === surveyStarFilter;
      return matchText && matchStar;
    });
  }, [surveys, surveySearch, surveyStarFilter]);

  // Export Survey Records to Excel (.xlsx)
  const handleExportSurveyExcel = () => {
    if (filteredSurveys.length === 0) {
      alert('ไม่มีข้อมูลประเมินความพึงพอใจให้ออกรายงานในขณะนี้');
      return;
    }

    const rows = filteredSurveys.map((s, idx) => {
      const levelLabel = s.rating === 5 ? 'ดีมากที่สุด' : s.rating === 4 ? 'ดีมาก' : s.rating === 3 ? 'ปานกลาง' : s.rating === 2 ? 'พอใช้' : 'ควรปรับปรุง';
      return {
        'ลำดับ': idx + 1,
        'วัน-เวลาที่ประเมิน': s.date,
        'คะแนนดาว': `${s.rating} ดาว`,
        'ระดับความพึงพอใจ': levelLabel,
        'ข้อคิดเห็น / ข้อเสนอแนะของผู้รับบริการ': s.feedback || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Survey Feedback');
    XLSX.writeFile(workbook, `UBU_Condom_Satisfaction_Survey_Report.xlsx`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 custom-shadow text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-sm">
          🔐
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">แผงควบคุมหลักระบบผู้ดูแลหลังบ้าน</h2>
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
              จุดบริการทั้งหมดในระบบ
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg font-bold">
              📍
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-purple-700 tabular-nums">
                {locations.length}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500">แห่ง</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              พร้อมบริการ: {locations.filter(l => l.status === 'มีอยู่').length} | หมดแล้ว: {locations.filter(l => l.status === 'หมดแล้ว').length}
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

      {/* LOCATION MANAGEMENT SECTION (เพิ่ม / ลบ / แก้ไข จุดติดตั้งถุงยางอนามัย) */}
      <div className="bg-white border-2 border-blue-500/30 rounded-3xl p-6 sm:p-7 custom-shadow space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20 shrink-0">
              📍
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                  จัดการจุดติดตั้งตู้บริการถุงยางอนามัย
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 font-mono">
                  {locations.length} จุด
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                สามารถเพิ่มจุดบริการใหม่ แก้ไขข้อมูลพิกัด หรือลบจุดที่ไม่ใช้งานออกจากระบบได้ทันที
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onResetDefaultLocations && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('คุณต้องการรีเซ็ตรายชื่อจุดบริการกลับเป็น 15 จุดเริ่มต้นของ ม.อุบลฯ หรือไม่?')) {
                    onResetDefaultLocations();
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                title="รีเซ็ตเป็น 15 จุดเริ่มต้น"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>รีเซ็ต 15 จุดเริ่มต้น</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มจุดติดตั้งใหม่</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อจุดติดตั้ง อาคาร คณะ หรือจุดสังเกต..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setLocationFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                locationFilter === 'all' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({locations.length})
            </button>
            <button
              type="button"
              onClick={() => setLocationFilter('available')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                locationFilter === 'available' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มีอยู่ ({locations.filter(l => l.status === 'มีอยู่').length})
            </button>
            <button
              type="button"
              onClick={() => setLocationFilter('empty')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                locationFilter === 'empty' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              หมดแล้ว ({locations.filter(l => l.status === 'หมดแล้ว').length})
            </button>
          </div>
        </div>

        {/* Locations Grid Cards */}
        {filteredLocationList.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 font-medium">
            ไม่พบจุดติดตั้งที่ตรงกับเงื่อนไขการค้นหา
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocationList.map((loc) => {
              const isAvailable = loc.status === 'มีอยู่';
              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 custom-shadow ${
                    isAvailable
                      ? 'bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-300'
                      : 'bg-rose-50/30 border-rose-200/80 hover:border-rose-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {loc.zone && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md inline-block mb-1">
                            {loc.zone}
                          </span>
                        )}
                        <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2" title={loc.name}>
                          {loc.name}
                        </h4>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 shadow-xs ${
                          isAvailable ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'
                        }`}
                      >
                        {loc.status}
                      </span>
                    </div>

                    {loc.landmark && (
                      <p className="text-xs text-slate-500 line-clamp-2 pl-1 border-l-2 border-slate-200">
                        {loc.landmark}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
                      <span>พิกัด: {loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</span>
                      <a
                        href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                        title="เปิดดูตำแหน่งบน Google Maps"
                      >
                        <span>เปิด Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Action Buttons: Toggle, Edit, Delete */}
                  <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleLocationStatus(loc.name, loc.status)}
                      className={`flex-1 text-center text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer ${
                        isAvailable
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isAvailable ? 'ปรับเป็น: หมดแล้ว ⚠️' : 'ปรับเป็น: มีอยู่แล้ว ✅'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(loc)}
                      className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="แก้ไขข้อมูลจุดนี้"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(loc)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="ลบจุดนี้ออกจากระบบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Volunteer Detailed Logs Table & Excel Export */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 custom-shadow space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">📋 บันทึกประวัติการเติมของจิตอาสาฉบับเต็ม ({logs.length} รายการ)</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">คัดกรอง ค้นหา ลบประวัติที่ไม่ต้องการ หรือส่งออกรายงานดิบเข้าโปรแกรม Microsoft Excel</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRestoreDefaultVolunteerLogs && (
              <button
                onClick={onRestoreDefaultVolunteerLogs}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                title="คืนค่าข้อมูลประวัติการเติมเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>คืนค่าประวัติเริ่มต้น</span>
              </button>
            )}

            {onClearAllVolunteerLogs && logs.length > 0 && (
              <button
                onClick={onClearAllVolunteerLogs}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                title="ลบประวัติการเติมทั้งหมด"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>ล้างประวัติทั้งหมด</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-950 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>
          </div>
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
                <th className="p-4 text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400 font-medium">
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
                    <td className="p-4 text-slate-600 whitespace-nowrap">{log.faculty} ({log.year})</td>
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
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition inline-block"
                        >
                          👁️ เปิดดูภาพ
                        </a>
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {onDeleteVolunteerLog && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`คุณต้องการลบประวัติการเติมของจิตอาสา:\n${log.name} (${log.location}) หรือไม่?`)) {
                              if (log.id) onDeleteVolunteerLog(log.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SATISFACTION SURVEY RECORDS & COMMENTS SECTION */}
      <div className="bg-white border-2 border-amber-400/30 rounded-3xl p-6 sm:p-7 custom-shadow space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                ⭐ รายงานผลการประเมินความพึงพอใจและข้อคิดเห็นผู้รับบริการ ({surveys.length} รายการ)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                CSAT {averageRating} / 5.0
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              เข้าถึงข้อมูลคะแนนดาวและข้อ comment จากผู้รับบริการตู้ถุงยางอนามัยฟรี ม.อุบลฯ พร้อมส่งออกรายงานไฟล์ Excel (.xlsx)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRestoreDefaultSurveys && (
              <button
                type="button"
                onClick={onRestoreDefaultSurveys}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                title="คืนค่าข้อมูลการประเมินเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>คืนค่าประวัติเริ่มต้น</span>
              </button>
            )}

            {onClearAllSurveys && surveys.length > 0 && (
              <button
                type="button"
                onClick={onClearAllSurveys}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                title="ลบข้อมูลการประเมินทั้งหมด"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>ล้างประวัติทั้งหมด</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportSurveyExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Search and Star Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาตามข้อความความคิดเห็น หรือ วัน-เวลา..."
              value={surveySearch}
              onChange={(e) => setSurveySearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setSurveyStarFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                surveyStarFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({surveys.length})
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSurveyStarFilter(star)}
                className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  surveyStarFilter === star ? 'bg-amber-500 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{star}</span>
                <Star className="w-3 h-3 fill-current" />
                <span className="text-[11px] font-normal">({surveys.filter(s => s.rating === star).length})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
              <tr>
                <th className="p-4 whitespace-nowrap w-44">วัน-เวลาประเมิน</th>
                <th className="p-4 whitespace-nowrap w-48 text-center">คะแนนความพึงพอใจ</th>
                <th className="p-4 whitespace-nowrap">ข้อคิดเห็น / ข้อเสนอแนะจากผู้รับบริการ</th>
                <th className="p-4 text-center whitespace-nowrap w-20">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredSurveys.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 font-medium">
                    ไม่พบข้อมูลการประเมินความพึงพอใจตามเงื่อนไขที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredSurveys.map((survey, idx) => {
                  const stars = '★'.repeat(survey.rating) + '☆'.repeat(5 - survey.rating);
                  const levelText = survey.rating === 5 ? 'ดีมากที่สุด' : survey.rating === 4 ? 'ดีมาก' : survey.rating === 3 ? 'ปานกลาง' : survey.rating === 2 ? 'พอใช้' : 'ควรปรับปรุง';
                  return (
                    <tr key={survey.id || idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {survey.date}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-amber-500 font-mono text-sm tracking-wider">{stars}</span>
                          <span className="text-[11px] font-bold text-slate-700">
                            {survey.rating}.0 ดาว ({levelText})
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-800 leading-relaxed font-normal">
                        {survey.feedback ? (
                          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl text-xs sm:text-sm italic text-slate-700">
                            "{survey.feedback}"
                          </div>
                        ) : (
                          <span className="text-slate-300 italic font-mono">- ไม่ได้ระบุข้อความ -</span>
                        )}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap">
                        {onDeleteSurvey && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('คุณต้องการลบรายการผลประเมินนี้ใช่หรือไม่?')) {
                                if (survey.id) onDeleteSurvey(survey.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบผลประเมินนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD / EDIT LOCATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  📍
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {modalMode === 'add' ? 'เพิ่มจุดติดตั้งตู้บริการใหม่' : 'แก้ไขข้อมูลจุดติดตั้งตู้บริการ'}
                  </h3>
                  <p className="text-xs text-slate-500">ข้อมูลจะอัปเดตลงแผนที่และระบบทันที</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveLocation} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Location Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  ชื่อจุดติดตั้ง / อาคาร <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น หน้าห้องสโมสรนักศึกษา คณะรัฐศาสตร์"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Zone / Faculty */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">โซน / คณะ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    list="ubu-zones-list"
                    placeholder="เลือกหรือพิมพ์ชื่อคณะ/โซน"
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  <datalist id="ubu-zones-list">
                    {UBU_ZONES.map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Landmark description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">จุดสังเกต / ชั้น / รายละเอียดตำแหน่ง</label>
                <input
                  type="text"
                  placeholder="เช่น ข้างห้องน้ำชาย ชั้น 1 ใกล้ตู้กดน้ำ"
                  value={formLandmark}
                  onChange={(e) => setFormLandmark(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Coordinates (Lat / Lng) with Auto GPS button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    พิกัดแผนที่ (Latitude / Longitude) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGetDeviceGps}
                    disabled={isLocatingGps}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Crosshair className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin' : ''}`} />
                    <span>{isLocatingGps ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัด GPS ปัจจุบัน'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-mono">Lat:</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="15.1190"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 font-mono">Lng:</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="104.9060"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">สถานะเริ่มต้น</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('มีอยู่')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formStatus === 'มีอยู่'
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>✓ มีอยู่ (พร้อมบริการ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('หมดแล้ว')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formStatus === 'หมดแล้ว'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>⚠️ หมดแล้ว (รอเติม)</span>
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {modalMode === 'add' ? 'บันทึกจุดติดตั้งใหม่' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
