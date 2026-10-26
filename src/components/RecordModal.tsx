import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  PlusCircle, 
  Edit3, 
  Send, 
  AlertCircle,
  Calendar,
  Hash,
  Mail,
  Type
} from 'lucide-react';
import { FieldDefinition, GasRecord } from '../types/gas';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: GasRecord | null;
  fields: FieldDefinition[];
  primaryKey: string;
  onSave: (recordData: GasRecord, isEdit: boolean) => Promise<void>;
  isLiveGAS: boolean;
}

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  fields,
  primaryKey,
  onSave,
  isLiveGAS,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEdit = Boolean(recordToEdit);

  useEffect(() => {
    if (recordToEdit) {
      setFormData({ ...recordToEdit });
    } else {
      // Initialize default values
      const initial: Record<string, any> = {};
      fields.forEach(field => {
        if (field.isPrimaryKey) {
          initial[field.key] = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
        } else if (field.type === 'number') {
          initial[field.key] = 0;
        } else if (field.type === 'date') {
          initial[field.key] = new Date().toISOString().split('T')[0];
        } else if (field.options && field.options.length > 0) {
          initial[field.key] = field.options[0];
        } else {
          initial[field.key] = '';
        }
      });
      setFormData(initial);
    }
    setErrors({});
    setSubmitError(null);
  }, [recordToEdit, fields, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};

    fields.forEach(field => {
      const val = formData[field.key];
      if (field.isRequired && (val === undefined || val === null || String(val).trim() === '')) {
        newErrors[field.key] = `กรุณากรอก ${field.label || field.key}`;
      }
      if (field.type === 'number' && val !== '' && isNaN(Number(val))) {
        newErrors[field.key] = 'ต้องเป็นตัวเลขเท่านั้น';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSave(formData, isEdit);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [key]: value,
    }));
    if (errors[key]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isEdit ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {isEdit ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isEdit ? 'แก้ไขข้อมูลรายการ' : 'เพิ่มข้อมูลใหม่'}
              </h2>
              <p className="text-xs text-slate-400">
                {isLiveGAS ? 'ข้อมูลจะถูกส่งไปยัง Google Sheet ผ่าน Google Apps Script โดยตรง' : 'โหมดจำลองข้อมูล (Demo Dataset)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {submitError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(field => {
                const isFieldPrimaryKey = field.isPrimaryKey;
                const value = formData[field.key] !== undefined ? formData[field.key] : '';
                const error = errors[field.key];

                return (
                  <div
                    key={field.key}
                    className={`space-y-1.5 ${field.type === 'string' && (field.key.includes('name') || field.key.includes('title')) ? 'sm:col-span-2' : ''}`}
                  >
                    <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {field.label || field.key}
                        {field.isRequired && <span className="text-rose-400">*</span>}
                      </span>
                      {isFieldPrimaryKey && (
                        <span className="text-[10px] font-mono text-emerald-400">Primary Key</span>
                      )}
                    </label>

                    {/* Dynamic Inputs based on type */}
                    {field.options && field.options.length > 0 ? (
                      <select
                        value={value}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer ${
                          error ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                        }`}
                      >
                        {field.options.map(opt => (
                          <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'date' ? (
                      <input
                        type="date"
                        value={value}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none ${
                          error ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                    ) : field.type === 'number' ? (
                      <input
                        type="number"
                        step="any"
                        value={value}
                        onChange={(e) => handleInputChange(field.key, Number(e.target.value))}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none ${
                          error ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                    ) : field.type === 'email' ? (
                      <input
                        type="email"
                        value={value}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none ${
                          error ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        disabled={isEdit && isFieldPrimaryKey}
                        className={`w-full bg-slate-950 border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none ${
                          isEdit && isFieldPrimaryKey ? 'opacity-60 bg-slate-900 cursor-not-allowed' : ''
                        } ${error ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'}`}
                      />
                    )}

                    {error && (
                      <p className="text-[11px] text-rose-400">{error}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/40">
            <div className="text-[11px] text-slate-400">
              {isLiveGAS ? 'Action: ' + (isEdit ? 'update (POST)' : 'create (POST)') : 'แก้ไขในข้อมูลตัวอย่าง'}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
