import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  BookOpen, 
  ExternalLink, 
  Layers, 
  ShieldCheck, 
  AlertTriangle,
  Lightbulb,
  FileSpreadsheet,
  Settings2,
  Sparkles
} from 'lucide-react';
import { SCRIPT_TEMPLATES, ScriptTemplate } from '../data/templates';

interface ScriptGeneratorViewProps {
  onApplyEndpointUrl?: (url: string) => void;
}

export const ScriptGeneratorView: React.FC<ScriptGeneratorViewProps> = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(SCRIPT_TEMPLATES[0].id);
  const [copied, setCopied] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState<number>(1);
  const [customSheetName, setCustomSheetName] = useState('Sheet1');
  const [customPrimaryKey, setCustomPrimaryKey] = useState('id');

  const currentTemplate = SCRIPT_TEMPLATES.find(t => t.id === selectedTemplateId) || SCRIPT_TEMPLATES[0];

  // Dynamically replace sheet name in template if customized
  const customizedCode = currentTemplate.code
    .replace(/var SHEET_NAME = ".*?";/, `var SHEET_NAME = "${customSheetName}";`)
    .replace(/var primaryKey = requestData\.primaryKey \|\| '.*?';/, `var primaryKey = requestData.primaryKey || '${customPrimaryKey}';`);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(customizedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      step: 1,
      title: '1. สร้าง Google Sheet และตั้งชื่อหัวตาราง',
      titleTh: '1. สร้าง Google Sheet และตั้งชื่อหัวตาราง (Header)',
      desc: 'เปิด sheets.new สร้างตารางแถวที่ 1 ให้เป็นชื่อคอลัมน์ภาษาอังกฤษ เช่น id, name, category, price, status, date',
      tip: 'แนะนำให้คอลัมน์แรกเป็น id หรือรหัสอ้างอิงเพื่อใช้ในการแก้ไขและลบ',
    },
    {
      step: 2,
      title: '2. เปิดเมนู Google Apps Script',
      titleTh: '2. เปิดเมนู ส่วนขยาย (Extensions) > Apps Script',
      desc: 'ที่แถบเมนูด้านบนของ Google Sheets คลิก "ส่วนขยาย (Extensions)" แล้วเลือก "Apps Script"',
      tip: 'จะเปิดแท็บหน้าต่างเขียนโค้ด Google Apps Script ขึ้นมา',
    },
    {
      step: 3,
      title: '3. วางโค้ด Google Apps Script',
      titleTh: '3. ลบโค้ดเดิมใน Code.gs แล้ววางโค้ดจากหน้านี้',
      desc: 'ลบฟังก์ชัน myFunction() เดิมออกทั้งหมด แล้วกดปุ่ม "คัดลอกโค้ดสคริปต์" ด้านขวานี้มาวางลงไป',
      tip: 'กดบันทึกโครงการ (รูปแผ่นดิสก์ หรือ Ctrl+S)',
    },
    {
      step: 4,
      title: '4. Deploy เป็น Web App (สำคัญมาก)',
      titleTh: '4. กด Deploy > New Deployment (การทำให้ใช้งานได้ใหม่)',
      desc: 'คลิกปุ่มสีน้ำเงิน "การทำให้ใช้งานได้ (Deploy)" มุมขวาบน -> เลือก "การทำให้ใช้งานได้ใหม่ (New deployment)" -> เลือกประเภทรูปฟันเฟือง "เว็บแอป (Web app)"',
      tip: 'ตั้งค่า: ดำเนินการในฐานะ (Execute as) = "ฉัน (Me)" และ ผู้มีสิทธิ์เข้าถึง (Who has access) = "ทุกคน (Anyone)"',
    },
    {
      step: 5,
      title: '5. คัดลอก Web App URL มาใส่ในแอปนี้',
      titleTh: '5. คัดลอก URL ของเว็บแอป (Web App URL)',
      desc: 'กด Deploy แล้วอนุญาตสิทธิ์เข้าถึง (Authorize access) จากนั้นคัดลอก URL ที่ลงท้ายด้วย /exec นำมาวางที่ปุ่ม "ตั้งค่า Endpoint" ในแอปนี้ได้ทันที!',
      tip: 'ระบบจะเริ่มดึงข้อมูลและซิงค์ข้อมูลกับ Google Sheet ของคุณแบบเรียลไทม์!',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">
                ศูนย์สร้างโค้ด Google Apps Script & คู่มือการเชื่อมต่อ
              </span>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                พร้อมใช้งาน 100%
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              คุณสามารถเปลี่ยน Google Sheets ทุกไฟล์ให้กลายเป็น <b>REST API Database</b> ได้ฟรี ไม่มีค่าใช้จ่าย โดยใช้ Google Apps Script คัดลอกโค้ดด้านล่างแล้วนำไปวางใน Sheet ของคุณเพื่อเชื่อมต่อได้ทันที
            </p>
          </div>

          <a
            href="https://sheets.new"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>เปิด Google Sheets ใหม่ (sheets.new)</span>
            <ExternalLink className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Step-by-Step Interactive Visual Guide */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">5 ขั้นตอนง่ายๆ ในการเชื่อมต่อ Google Sheets กับแอป</h3>
        </div>

        {/* Step Tabs / Numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {steps.map((s) => {
            const isActive = activeGuideStep === s.step;
            return (
              <button
                key={s.step}
                onClick={() => setActiveGuideStep(s.step)}
                className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 border-emerald-500/50 text-white shadow-xs'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/40'
                }`}
              >
                <div className={`font-mono text-xs font-bold mb-1 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                  ขั้นตอนที่ {s.step}
                </div>
                <div className="text-[11px] font-medium line-clamp-1 text-slate-300">
                  {s.titleTh.split('. ')[1]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Card */}
        {(() => {
          const currentStepObj = steps.find(s => s.step === activeGuideStep) || steps[0];
          return (
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-emerald-400">
                  {currentStepObj.titleTh}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  ขั้นตอนที่ {currentStepObj.step} จาก 5
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentStepObj.desc}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-amber-300/90">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                <span><b>คำแนะนำ:</b> {currentStepObj.tip}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Code Template Selector & Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Templates & Settings */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>เลือกเทมเพลตสคริปต์ (Script Templates)</span>
            </h3>

            <div className="space-y-2">
              {SCRIPT_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedTemplateId === tmpl.id
                      ? 'bg-slate-800 border-emerald-500/50 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-200">
                    {tmpl.titleTh}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {tmpl.descriptionTh}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Script Customizer */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              <span>ปรับแต่งตัวแปรในโค้ด (Customize)</span>
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">ชื่อแท็บ Sheet (Sheet Name):</label>
                <input
                  type="text"
                  value={customSheetName}
                  onChange={(e) => setCustomSheetName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">คอลัมน์ Primary Key สำหรับค้นหา/แก้ไข/ลบ:</label>
                <input
                  type="text"
                  value={customPrimaryKey}
                  onChange={(e) => setCustomPrimaryKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Permissions Warning Callout */}
          <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-200/90 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>การให้สิทธิ์เข้าถึง (Authorization)</span>
            </div>
            <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">
              เมื่อกด Deploy ครั้งแรก Google จะแสดงหน้าต่างแจ้งเตือนสิทธิ์ ให้คลิก <b>"Advanced (ขั้นสูง)"</b> แล้วกด <b>"Go to Untitled project (unsafe) / ไปที่โปรเจกต์ (ไม่ปลอดภัย)"</b> แล้วกดยอมรับ (Allow) เพื่อให้เว็บแอปอ่านเขียน Google Sheets ได้
            </p>
          </div>
        </div>

        {/* Right Column: Code Editor View with Copy button */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {/* Code Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono text-slate-300">Code.gs</span>
              <span className="text-[10px] text-slate-500">({customizedCode.split('\n').length} lines)</span>
            </div>

            <button
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>คัดลอกสำเร็จแล้ว!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกโค้ดสคริปต์ (Copy Code)</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-4 overflow-x-auto flex-1 max-h-[600px] font-mono text-[11px] leading-relaxed text-slate-300 bg-slate-950 select-all">
            <pre>
              <code>{customizedCode}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
