import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  ArrowRightCircle, 
  Calendar,
  User,
  DollarSign,
  Tag
} from 'lucide-react';
import { FieldDefinition, GasRecord } from '../types/gas';

interface KanbanViewProps {
  records: GasRecord[];
  fields: FieldDefinition[];
  primaryKey: string;
  onEditRecord: (record: GasRecord) => void;
  onDeleteRecord: (id: string | number) => void;
  onUpdateStatus: (id: string | number, newStatus: string) => void;
  onAddNew: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  records,
  fields,
  primaryKey,
  onEditRecord,
  onDeleteRecord,
  onUpdateStatus,
  onAddNew,
}) => {
  // Find potential grouping field (status, category, year, priority)
  const statusField = fields.find(f => f.type === 'status' || f.key.toLowerCase().includes('status')) ||
    fields.find(f => f.type === 'select') ||
    fields[2] ||
    { key: 'status', label: 'สถานะ', type: 'status' as const };

  const [selectedGroupBy, setSelectedGroupBy] = useState<string>(statusField.key);

  // Group columns
  const currentFieldDef = fields.find(f => f.key === selectedGroupBy) || statusField;
  
  const distinctValues = Array.from(
    new Set(
      records.map(r => String(r[selectedGroupBy] || 'ไม่มีระบุ'))
    )
  );

  const columns = currentFieldDef.options && currentFieldDef.options.length > 0
    ? currentFieldDef.options
    : distinctValues.length > 0 ? distinctValues : ['รอดำเนินการ', 'กำลังดำเนินการ', 'เสร็จสิ้น'];

  const getColumnColor = (col: string) => {
    const s = col.toLowerCase();
    if (s.includes('พร้อม') || s.includes('active') || s.includes('resolved') || s.includes('เสร็จ') || s.includes('success')) {
      return { border: 'border-emerald-500/40', text: 'text-emerald-400', badge: 'bg-emerald-500/10' };
    }
    if (s.includes('กำลัง') || s.includes('progress') || s.includes('ใกล้หมด') || s.includes('medium') || s.includes('พัก')) {
      return { border: 'border-amber-500/40', text: 'text-amber-400', badge: 'bg-amber-500/10' };
    }
    if (s.includes('หมด') || s.includes('critical') || s.includes('รอ') || s.includes('ด่วน')) {
      return { border: 'border-rose-500/40', text: 'text-rose-400', badge: 'bg-rose-500/10' };
    }
    return { border: 'border-slate-700', text: 'text-slate-300', badge: 'bg-slate-800' };
  };

  return (
    <div className="space-y-4">
      {/* Top Bar for Group By Selector */}
      <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-medium text-slate-300">จัดกลุ่มการ์ดตาม:</span>
          <select
            value={selectedGroupBy}
            onChange={(e) => setSelectedGroupBy(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {fields.map(f => (
              <option key={f.key} value={f.key}>
                {f.label || f.key} {f.type === 'status' ? '(สถานะ)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onAddNew}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>เพิ่มการ์ดใหม่</span>
        </button>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
        {columns.map((columnName) => {
          const colTheme = getColumnColor(columnName);
          const colRecords = records.filter(r => String(r[selectedGroupBy] || 'ไม่มีระบุ') === columnName);

          return (
            <div
              key={columnName}
              className={`bg-slate-900/40 border ${colTheme.border} rounded-xl p-3 flex flex-col min-h-[420px] shadow-sm`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${colTheme.text.replace('text-', 'bg-')}`} />
                  <h3 className="text-xs font-semibold text-slate-200 truncate max-w-[150px]">{columnName}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${colTheme.badge} ${colTheme.text}`}>
                  {colRecords.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5">
                {colRecords.length === 0 ? (
                  <div className="h-24 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500">
                    ไม่มีรายการในสถานะนี้
                  </div>
                ) : (
                  colRecords.map((record) => {
                    const recordId = record[primaryKey] || record.id;
                    const primaryTitle = record.name || record.title || record.fullName || record[primaryKey] || `Item #${record.id}`;
                    const secondaryInfo = record.category || record.department || record.faculty || record.supplier || record.requester;

                    return (
                      <div
                        key={recordId}
                        className="bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-lg p-3 space-y-2.5 transition-all shadow-xs group"
                      >
                        {/* Card Top Title & Actions */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-mono text-emerald-400 font-medium">
                              {String(recordId)}
                            </div>
                            <h4 className="text-xs font-semibold text-slate-200 mt-0.5 line-clamp-2">
                              {String(primaryTitle)}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={() => onEditRecord(record)}
                              title="แก้ไข"
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteRecord(recordId)}
                              title="ลบ"
                              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Card Body Attributes */}
                        <div className="text-[11px] text-slate-400 space-y-1">
                          {secondaryInfo && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{String(secondaryInfo)}</span>
                            </div>
                          )}

                          {record.price !== undefined && (
                            <div className="flex items-center gap-1.5 font-mono tabular-nums text-slate-300">
                              <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>฿{Number(record.price).toLocaleString('th-TH')}</span>
                              {record.stock !== undefined && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">·</span>
                                  <span>คงเหลือ {record.stock} ชิ้น</span>
                                </>
                              )}
                            </div>
                          )}

                          {record.gpa !== undefined && (
                            <div className="text-slate-300 font-mono text-[11px]">
                              GPA: <span className="text-emerald-400 font-semibold">{record.gpa}</span> ({record.year || '-'})
                            </div>
                          )}

                          {record.assignedTo && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <User className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{String(record.assignedTo)}</span>
                            </div>
                          )}

                          {record.lastUpdated || record.createdAt || record.enrollmentDate ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>{String(record.lastUpdated || record.createdAt || record.enrollmentDate)}</span>
                            </div>
                          ) : null}
                        </div>

                        {/* Quick Move Status Selector */}
                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between gap-1">
                          <span className="text-[10px] text-slate-500">ย้ายไป:</span>
                          <select
                            value={String(record[selectedGroupBy] || '')}
                            onChange={(e) => onUpdateStatus(recordId, e.target.value)}
                            className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                          >
                            {columns.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
