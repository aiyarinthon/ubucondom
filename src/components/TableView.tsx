import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  Eye, 
  Filter, 
  Download, 
  Columns3, 
  ChevronLeft, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { FieldDefinition, GasRecord } from '../types/gas';

interface TableViewProps {
  records: GasRecord[];
  fields: FieldDefinition[];
  primaryKey: string;
  onEditRecord: (record: GasRecord) => void;
  onDeleteRecord: (id: string | number) => void;
  onDuplicateRecord: (record: GasRecord) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  records,
  fields,
  primaryKey,
  onEditRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onAddNew,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>(primaryKey || (fields[0] ? fields[0].key : ''));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | number | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<GasRecord | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(fields.slice(0, 7).map(f => f.key))
  );
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Update visible columns if fields change and set is empty
  React.useEffect(() => {
    if (fields.length > 0 && visibleColumns.size === 0) {
      setVisibleColumns(new Set(fields.slice(0, 7).map(f => f.key)));
    }
  }, [fields]);

  // Find status field if any
  const statusFieldDef = fields.find(f => f.type === 'status' || f.key.toLowerCase().includes('status'));
  const statusOptions = statusFieldDef?.options || Array.from(
    new Set(records.map(r => String(r[statusFieldDef?.key || 'status'] || '')).filter(Boolean))
  );

  // Sorting handler
  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(key);
      setSortOrder('asc');
    }
  };

  // Filtered & Sorted Records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search across all fields
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches = Object.values(record).some(val => 
          String(val || '').toLowerCase().includes(query)
        );
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && statusFieldDef) {
        const val = String(record[statusFieldDef.key] || '');
        if (val !== statusFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      if (!sortField) return 0;
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      const numA = Number(valA);
      const numB = Number(valB);

      let comparison = 0;
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
        comparison = numA - numB;
      } else {
        comparison = String(valA).localeCompare(String(valB), 'th');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [records, searchTerm, statusFilter, statusFieldDef, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRecords.slice(start, start + rowsPerPage);
  }, [filteredRecords, currentPage, rowsPerPage]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 2) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes('active') || s.includes('พร้อม') || s.includes('resolved') || s.includes('เสร็จ') || s.includes('success')) {
      return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
    }
    if (s.includes('low') || s.includes('ใกล้หมด') || s.includes('progress') || s.includes('กำลัง') || s.includes('medium') || s.includes('พัก')) {
      return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
    }
    if (s.includes('out') || s.includes('หมด') || s.includes('critical') || s.includes('ด่วนมาก') || s.includes('error') || s.includes('รอ')) {
      return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
    }
    return 'text-slate-300 bg-slate-800 border-slate-700';
  };

  const renderCellContent = (record: GasRecord, field: FieldDefinition) => {
    const val = record[field.key];
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-600 font-mono">-</span>;
    }

    if (field.type === 'status') {
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusBadgeClass(String(val))}`}>
          {String(val)}
        </span>
      );
    }

    if (field.type === 'number') {
      return (
        <span className="font-mono tabular-nums text-slate-200">
          {Number(val).toLocaleString('th-TH')}
        </span>
      );
    }

    if (field.type === 'date') {
      return (
        <span className="font-mono tabular-nums text-slate-300 text-xs">
          {String(val)}
        </span>
      );
    }

    if (field.type === 'email') {
      return (
        <a 
          href={`mailto:${val}`} 
          className="text-emerald-400 hover:text-emerald-300 hover:underline truncate max-w-[200px] inline-block"
        >
          {String(val)}
        </a>
      );
    }

    if (field.isPrimaryKey) {
      return (
        <span className="font-mono text-emerald-400 font-medium">
          {String(val)}
        </span>
      );
    }

    return <span className="text-slate-200">{String(val)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาทุกคอลัมน์ (ID, ชื่อ, แผนก, สินค้า...)"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Right: Status Filter & Column Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          {statusOptions.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">สถานะทั้งหมด</option>
                {statusOptions.map(opt => (
                  <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                ))}
              </select>
            </div>
          )}

          {/* Column Visibility Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 transition-colors cursor-pointer"
            >
              <Columns3 className="w-3.5 h-3.5 text-slate-400" />
              <span>คอลัมน์ ({visibleColumns.size})</span>
            </button>

            {showColumnManager && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-lg shadow-xl p-3 z-30 space-y-2 animate-in fade-in">
                <div className="text-xs font-semibold text-slate-200 pb-1 border-b border-slate-800">
                  เลือกคอลัมน์ที่แสดง
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {fields.map(field => (
                    <label key={field.key} className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(field.key)}
                        onChange={() => toggleColumn(field.key)}
                        className="accent-emerald-500 rounded"
                      />
                      <span className="truncate">{field.label || field.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row count info */}
          <div className="text-xs text-slate-400 pl-2 hidden md:block">
            แสดง <span className="font-mono tabular-nums text-slate-200">{filteredRecords.length}</span> จาก <span className="font-mono tabular-nums text-slate-200">{records.length}</span> รายการ
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            {/* Table Header */}
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 select-none">
              <tr>
                <th className="py-3 px-4 font-medium w-12 text-center text-slate-500">#</th>
                {fields
                  .filter(f => visibleColumns.has(f.key))
                  .map(field => {
                    const isSorted = sortField === field.key;
                    return (
                      <th
                        key={field.key}
                        onClick={() => handleSort(field.key)}
                        className={`py-3 px-4 font-medium transition-colors hover:text-white cursor-pointer ${
                          field.type === 'number' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div className={`flex items-center gap-1.5 ${field.type === 'number' ? 'justify-end' : 'justify-start'}`}>
                          <span>{field.label || field.key}</span>
                          <span className="text-slate-500">
                            {isSorted ? (
                              sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />
                            )}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                <th className="py-3 px-4 font-medium text-right w-20">จัดการ</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/60 font-normal">
              {isLoading ? (
                <tr>
                  <td colSpan={visibleColumns.size + 2} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span>กำลังโหลดข้อมูลจาก Google Apps Script...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.size + 2} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <p className="text-sm">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                      <button
                        onClick={onAddNew}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg hover:bg-emerald-900/40 cursor-pointer transition-colors mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มรายการแรก</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const actualIndex = (currentPage - 1) * rowsPerPage + index + 1;
                  const rowId = record[primaryKey] || record.id || `row-${index}`;
                  const isMenuOpen = activeMenuRowId === rowId;

                  return (
                    <tr
                      key={rowId}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Row index */}
                      <td className="py-3 px-4 text-center text-slate-500 font-mono tabular-nums text-[11px]">
                        {actualIndex}
                      </td>

                      {/* Dynamic Cells */}
                      {fields
                        .filter(f => visibleColumns.has(f.key))
                        .map(field => (
                          <td
                            key={field.key}
                            className={`py-3 px-4 ${field.type === 'number' ? 'text-right' : 'text-left'}`}
                          >
                            {renderCellContent(record, field)}
                          </td>
                        ))}

                      {/* Action Menu Column */}
                      <td className="py-3 px-4 text-right relative">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedRecordForDetail(record)}
                            title="ดูรายละเอียด"
                            className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditRecord(record)}
                            title="แก้ไข"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setActiveMenuRowId(isMenuOpen ? null : rowId)}
                            title="ตัวเลือกเพิ่มเติม"
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Floating Action Dropdown */}
                        {isMenuOpen && (
                          <div className="absolute right-4 top-10 w-36 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-20 text-left animate-in fade-in">
                            <button
                              onClick={() => {
                                onDuplicateRecord(record);
                                setActiveMenuRowId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>คัดลอกรายการ</span>
                            </button>
                            <button
                              onClick={() => {
                                onDeleteRecord(record[primaryKey] || record.id);
                                setActiveMenuRowId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>ลบรายการ</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>แสดงแถวต่อหน้า:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-500 pl-2">
              หน้า <span className="font-mono tabular-nums text-slate-200">{currentPage}</span> จาก <span className="font-mono tabular-nums text-slate-200">{totalPages}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 rounded text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = Math.min(totalPages - 4 + i, currentPage - 2 + i);
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 flex items-center justify-center font-mono text-xs rounded transition-colors cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-semibold'
                        : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 border border-slate-800 rounded text-slate-300 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
              <h3 className="text-sm font-semibold text-white">รายละเอียดข้อมูลรายการ</h3>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ปิด
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
              {fields.map(field => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-baseline justify-between py-1.5 border-b border-slate-800/60 gap-1 text-xs">
                  <span className="text-slate-400 font-medium">{field.label || field.key}:</span>
                  <span className="font-mono text-slate-200 break-all text-right">
                    {String(selectedRecordForDetail[field.key] ?? '-')}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-slate-950/40">
              <button
                onClick={() => {
                  onEditRecord(selectedRecordForDetail);
                  setSelectedRecordForDetail(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg cursor-pointer transition-colors"
              >
                แก้ไขข้อมูลนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
