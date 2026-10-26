import React, { useMemo } from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Hash, 
  DollarSign, 
  Layers, 
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { FieldDefinition, GasRecord } from '../types/gas';

interface AnalyticsViewProps {
  records: GasRecord[];
  fields: FieldDefinition[];
  primaryKey: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  records,
  fields,
}) => {
  // Find numeric fields
  const numericFields = fields.filter(f => f.type === 'number');
  const categoricalFields = fields.filter(f => f.type === 'select' || f.type === 'status');

  // Summary Metrics calculations
  const stats = useMemo(() => {
    const totalRecords = records.length;
    
    // Calculate sums/averages for first 2 numeric fields
    const numSummaries = numericFields.slice(0, 3).map(field => {
      const values = records
        .map(r => Number(r[field.key]))
        .filter(v => !isNaN(v) && v !== null);
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      const min = values.length > 0 ? Math.min(...values) : 0;
      const max = values.length > 0 ? Math.max(...values) : 0;

      return {
        key: field.key,
        label: field.label || field.key,
        sum,
        avg,
        min,
        max,
        count: values.length,
      };
    });

    return {
      totalRecords,
      numSummaries,
    };
  }, [records, numericFields]);

  // Categorical Distributions
  const distributions = useMemo(() => {
    return categoricalFields.slice(0, 2).map(field => {
      const counts: Record<string, number> = {};
      records.forEach(r => {
        const val = String(r[field.key] || 'ไม่ระบุ');
        counts[val] = (counts[val] || 0) + 1;
      });

      const total = records.length || 1;
      const items = Object.entries(counts)
        .map(([label, count]) => ({
          label,
          count,
          percentage: Math.round((count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      return {
        fieldKey: field.key,
        fieldLabel: field.label || field.key,
        items,
      };
    });
  }, [records, categoricalFields]);

  return (
    <div className="space-y-6">
      {/* Top Metrics Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">จำนวนแถว/รายการทั้งหมด</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
              {stats.totalRecords.toLocaleString('th-TH')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>เชื่อมโยงผ่าน Google Apps Script</span>
            </div>
          </div>
        </div>

        {/* Dynamic Numeric Metric Cards */}
        {stats.numSummaries.map((numStat) => (
          <div key={numStat.key} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 truncate max-w-[160px]">{numStat.label}</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold font-mono tabular-nums text-white tracking-tight">
                {numStat.sum > 1000 ? numStat.sum.toLocaleString('th-TH') : numStat.avg.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span>เฉลี่ย: <b className="text-slate-200 font-mono">{numStat.avg.toFixed(1)}</b></span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>สูงสุด: <b className="text-slate-200 font-mono">{numStat.max.toLocaleString('th-TH')}</b></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {distributions.map((dist) => (
          <div key={dist.fieldKey} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">สัดส่วนตาม: {dist.fieldLabel}</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {dist.items.length} กลุ่ม
              </span>
            </div>

            {/* Custom SVG / CSS Bar Chart */}
            <div className="space-y-3 pt-1">
              {dist.items.map((item, index) => {
                const colors = [
                  'bg-emerald-500',
                  'bg-blue-500',
                  'bg-amber-500',
                  'bg-purple-500',
                  'bg-rose-500',
                  'bg-cyan-500'
                ];
                const barColor = colors[index % colors.length];

                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[200px]">{item.label}</span>
                      <div className="flex items-center gap-2 text-slate-400 font-mono tabular-nums">
                        <span>{item.count} รายการ</span>
                        <span className="text-slate-200 font-semibold w-10 text-right">{item.percentage}%</span>
                      </div>
                    </div>
                    {/* Progress Track */}
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                      <div
                        className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.max(item.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Data Health & Integration Overview */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">ความสมบูรณ์ของโครงสร้างข้อมูล (Schema Quality)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {fields.map(field => (
            <div key={field.key} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-200">{field.label || field.key}</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  {field.type}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Key: <span className="text-slate-300">{field.key}</span>
                {field.isPrimaryKey && <span className="text-amber-400 ml-1.5">(Primary Key)</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
