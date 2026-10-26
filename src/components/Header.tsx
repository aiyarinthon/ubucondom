import React from 'react';
import { 
  Database, 
  RefreshCw, 
  Plus, 
  Code2, 
  SlidersHorizontal, 
  FileSpreadsheet, 
  TerminalSquare, 
  LayoutGrid, 
  Table as TableIcon, 
  BarChart3, 
  Layers
} from 'lucide-react';
import { GasEndpointConfig } from '../types/gas';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';

interface HeaderProps {
  activeTab: 'table' | 'kanban' | 'analytics' | 'scripts' | 'debugger';
  setActiveTab: (tab: 'table' | 'kanban' | 'analytics' | 'scripts' | 'debugger') => void;
  config: GasEndpointConfig;
  onOpenConfig: () => void;
  onOpenNewRecord: () => void;
  onOpenExportImport: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  recordCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  onOpenConfig,
  onOpenNewRecord,
  onOpenExportImport,
  onRefresh,
  isLoading,
  selectedPresetId,
  onSelectPreset,
  recordCount,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      {/* Top zone: Brand & Main Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white tracking-tight">GAS Connect</span>
                  <span className="text-xs text-emerald-400 font-mono font-medium bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    Google Apps Script Hub
                  </span>
                </div>
                <div className="text-xs text-slate-400 hidden sm:block">
                  เชื่อมต่อและจัดการข้อมูล Google Sheets API แบบเรียลไทม์
                </div>
              </div>
            </div>

            {/* Dataset / Connection Switcher */}
            <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-slate-800 gap-2">
              <span className="text-xs text-slate-400">ชุดข้อมูล:</span>
              <select
                value={selectedPresetId}
                onChange={(e) => onSelectPreset(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <optgroup label="ตัวอย่างพร้อมใช้งาน (Demo Presets)">
                  {SAMPLE_DATASETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.nameTh} ({preset.data.length} แถว)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Google Apps Script จริง">
                  <option value="custom-gas">⚡ เชื่อมต่อ Live Web App URL</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Zone 2: Primary Actions */}
          <div className="flex items-center gap-2.5">
            {/* Sync Status Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="ดึงข้อมูลล่าสุด (Sync Data)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">ซิงค์ข้อมูล</span>
            </button>

            {/* Config GAS Endpoint Button */}
            <button
              onClick={onOpenConfig}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                config.url
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>{config.url ? 'GAS เชื่อมต่อแล้ว' : 'ตั้งค่า Endpoint'}</span>
            </button>

            {/* Export/Import */}
            <button
              onClick={onOpenExportImport}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>นำเข้า/ส่งออก</span>
            </button>

            {/* Add New Record CTA */}
            <button
              onClick={onOpenNewRecord}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all cursor-pointer hover:shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              <span className="whitespace-nowrap">เพิ่มข้อมูลใหม่</span>
            </button>
          </div>
        </div>

        {/* Bottom Zone: View Tabs & Live Status Bar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 pb-2 overflow-x-auto no-scrollbar">
          {/* View Mode Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80 shrink-0">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>ตารางข้อมูล ({recordCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'kanban'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>บอร์ดสถานะ (Kanban)</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>สถิติ & กราฟ</span>
            </button>

            <button
              onClick={() => setActiveTab('scripts')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'scripts'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>โค้ด Apps Script & คู่มือ</span>
            </button>

            <button
              onClick={() => setActiveTab('debugger')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'debugger'
                  ? 'bg-slate-800 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TerminalSquare className="w-3.5 h-3.5" />
              <span>API Inspector</span>
            </button>
          </nav>

          {/* Quick Info text without pills */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 shrink-0 pl-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${config.url ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{config.url ? 'โหมด: Live Apps Script' : 'โหมด: จำลองข้อมูล (Demo)'}</span>
            </div>
            {config.lastSyncedAt && (
              <>
                <span aria-hidden="true" className="text-slate-700">·</span>
                <span className="font-mono tabular-nums text-slate-400 text-[11px]">
                  ซิงค์ล่าสุด: {new Date(config.lastSyncedAt).toLocaleTimeString('th-TH')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
