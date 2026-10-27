import React from 'react';
import { 
  MapPin, 
  HeartHandshake, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { UbuLocation } from '../types/ubuCondom';

interface UbuHeaderProps {
  activeTab: 'user' | 'volunteer' | 'admin' | 'config';
  setActiveTab: (tab: 'user' | 'volunteer' | 'admin' | 'config') => void;
  locations: UbuLocation[];
  isLiveGAS?: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenConfig?: () => void;
}

export const UbuHeader: React.FC<UbuHeaderProps> = ({
  activeTab,
  setActiveTab,
  locations,
  isLoading,
  onRefresh,
}) => {
  const totalCount = locations.length;
  const emptyCount = locations.filter(l => l.status === 'หมดแล้ว').length;
  const availableCount = locations.filter(l => l.status === 'มีอยู่').length;

  return (
    <header className="space-y-5">
      {/* Top Navbar */}
      <nav className="bg-white/95 backdrop-blur-md px-4 sm:px-8 py-4 rounded-3xl border border-slate-200/90 custom-shadow space-y-3.5 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Brand & Wordmark and Mobile Refresh Action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="bg-blue-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base tracking-wider shadow-md shadow-blue-500/25 shrink-0">
              UBU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl text-slate-800 tracking-tight">
                  UBU Condom
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full shrink-0">
                  ม.อุบลฯ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium hidden sm:block">
                คลินิกวัยรุ่น โรงพยาบาลมหาวิทยาลัยอุบลราชธานี
              </p>
            </div>
          </div>

          {/* Mobile Refresh Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-100 rounded-2xl transition-colors disabled:opacity-50 cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Mode: Dropdown on Mobile (<md) & Tabs on Desktop (>=md) */}
        <div className="w-full md:w-auto">
          {/* Mobile Dropdown Menu (แบบเลื่อนลง ดูง่าย ไม่ล้นจอ) */}
          <div className="block md:hidden">
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="w-full appearance-none bg-slate-50 border-2 border-blue-600/30 hover:border-blue-600 focus:border-blue-600 rounded-2xl px-4 py-3.5 pr-11 text-base font-bold text-slate-800 focus:outline-none focus:bg-white shadow-xs transition-all cursor-pointer"
              >
                <option value="user" className="py-2 text-slate-800 font-semibold">
                  🗺️ 1. แผนที่จุดบริการ (สำหรับนักศึกษา)
                </option>
                <option value="volunteer" className="py-2 text-slate-800 font-semibold">
                  💛 2. เติมถุงยางอนามัย (หน่วยจิตอาสา)
                </option>
                <option value="admin" className="py-2 text-slate-800 font-semibold">
                  🔑 3. ระบบหลังบ้านแอดมิน (ผู้ดูแลโครงการ)
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-600">
                <ChevronDown className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Desktop Tab Pills */}
          <div className="hidden md:flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('user')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm lg:text-base transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === 'user'
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white/60'
              }`}
            >
              <span>🗺️ แผนที่จุดบริการ</span>
            </button>

            <button
              onClick={() => setActiveTab('volunteer')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm lg:text-base transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === 'volunteer'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
              }`}
            >
              <span>💛 เติมถุงยางอนามัย</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm lg:text-base transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span>🔑 ระบบหลังบ้านแอดมิน</span>
            </button>
          </div>
        </div>

        {/* Right: Refresh Screen Button (Desktop) */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>รีเฟรชหน้าจอ</span>
          </button>
        </div>
      </nav>

      {/* 3 Top Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Points */}
        <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl custom-shadow flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
              จุดตั้งตู้บริการทั้งหมด
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-800 tabular-nums">
                {totalCount}
              </h3>
              <span className="text-sm font-medium text-slate-500">แห่งทั่วมหาวิทยาลัย</span>
            </div>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl text-blue-600">
            📍
          </div>
        </div>

        {/* Empty / Needs refill */}
        <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl custom-shadow flex items-center justify-between">
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
              จุดที่ของหมด (ต้องเติม)
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className={`text-3xl sm:text-4xl font-extrabold font-mono tabular-nums ${emptyCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {emptyCount}
              </h3>
              <span className="text-sm font-medium text-slate-500">
                {emptyCount > 0 ? 'รอจิตอาสานำของเข้าเติม' : 'ทุกจุดมีของพร้อมบริการ'}
              </span>
            </div>
          </div>
          <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl ${
            emptyCount > 0
              ? 'bg-rose-50 border border-rose-100 text-rose-500'
              : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
          }`}>
            {emptyCount > 0 ? '⚠️' : '✅'}
          </div>
        </div>

        {/* Service Highlight: คลินิกวัยรุ่น รพ.ม.อุบลฯ */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/80 border border-blue-200/90 p-5 sm:p-6 rounded-3xl custom-shadow flex flex-col justify-between space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  บริการคลินิกวัยรุ่น รพ.ม.อุบลฯ
                </p>
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 mt-1">
                • หากต้องการปรึกษาทุกปัญหาของวัยรุ่น
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl text-emerald-600 shrink-0">
              🏥
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 font-semibold">ปรึกษาแบบออนไลน์ แอดไลน์เลย:</span>
            <a
              href="https://line.me/R/ti/p/%40176joubz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer no-underline shrink-0"
              title="กดเพื่อเพิ่มเพื่อนใน LINE"
            >
              <span>💬 @176joubz</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
