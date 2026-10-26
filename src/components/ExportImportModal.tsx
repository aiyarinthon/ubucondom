import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  FileSpreadsheet, 
  FileCode, 
  Table
} from 'lucide-react';
import { FieldDefinition, GasRecord } from '../types/gas';

interface ExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: GasRecord[];
  fields: FieldDefinition[];
  onImportRecords: (importedRecords: GasRecord[]) => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  onClose,
  records,
  fields,
  onImportRecords,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  // CSV Generator
  const generateCSV = () => {
    const headers = fields.map(f => f.key);
    const headerRow = headers.join(',');
    const rows = records.map(r => {
      return headers.map(h => {
        const val = r[h] !== undefined ? String(r[h]) : '';
        // Escape quotes
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });
    return [headerRow, ...rows].join('\n');
  };

  const handleDownloadCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gas_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(records, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gas_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (type: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleProcessImport = () => {
    setImportError(null);
    if (!importText.trim()) {
      setImportError('กรุณาวางข้อมูล CSV หรือ JSON');
      return;
    }

    try {
      // Try JSON first
      if (importText.trim().startsWith('[') || importText.trim().startsWith('{')) {
        const parsed = JSON.parse(importText);
        const list = Array.isArray(parsed) ? parsed : (parsed.data || [parsed]);
        onImportRecords(list);
        onClose();
        return;
      }

      // Try CSV
      const lines = importText.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV ต้องมีอย่างน้อย 2 แถว (Header + ข้อมูล)');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const parsedRecords: GasRecord[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj: any = { id: `imp-${i}` };
        headers.forEach((h, idx) => {
          obj[h] = values[idx] !== undefined ? values[idx] : '';
        });
        parsedRecords.push(obj);
      }

      onImportRecords(parsedRecords);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'ไม่สามารถแปลงข้อมูลได้ ตรวจสอบโครงสร้าง CSV หรือ JSON');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">นำเข้าและส่งออกข้อมูล (Export / Import)</h2>
              <p className="text-xs text-slate-400">จัดการข้อมูลระหว่าง Google Sheets, CSV และ JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออกข้อมูล (Export Data)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>นำเข้าข้อมูล (Import CSV / JSON)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {activeTab === 'export' ? (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                เลือกรูปแบบไฟล์ที่ต้องการส่งออกจากชุดข้อมูลปัจจุบัน ({records.length} แถว):
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* CSV Box */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-emerald-400" />
                      <span>ไฟล์ CSV (Excel / Sheets)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">UTF-8 BOM</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    เหมาะสำหรับเปิดด้วย Microsoft Excel หรือ Import กลับเข้า Google Sheets โดยไม่ติดปัญหาภาษาไทย
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDownloadCSV}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด .CSV</span>
                    </button>
                    <button
                      onClick={() => handleCopy('csv', generateCSV())}
                      className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    >
                      {copiedType === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* JSON Box */}
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-blue-400" />
                      <span>ไฟล์ JSON (API Format)</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Array of Objects</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    เหมาะสำหรับการนำไปพัฒนา API, Webhook หรือเก็บเป็น Database Backup
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDownloadJSON}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ดาวน์โหลด .JSON</span>
                    </button>
                    <button
                      onClick={() => handleCopy('json', JSON.stringify(records, null, 2))}
                      className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    >
                      {copiedType === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  วางข้อความ CSV หรือ JSON Data:
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="id,name,category,price&#10;101,สินค้า A,ทั่วไป,150&#10;102,สินค้า B,อุปกรณ์,350"
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {importError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 text-xs text-rose-300 rounded-lg">
                  {importError}
                </div>
              )}

              <button
                onClick={handleProcessImport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ประมวลผลและนำเข้าสู่ตาราง</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
