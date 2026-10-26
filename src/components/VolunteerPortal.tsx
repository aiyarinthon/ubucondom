import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Lock, 
  CheckCircle2, 
  Camera, 
  MapPin, 
  Package, 
  User, 
  UserPlus,
  Trash2,
  Users,
  MessageSquare,
  AlertCircle,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UbuLocation, VolunteerFormData } from '../types/ubuCondom';

interface VolunteerMember {
  id: string;
  name: string;
  studentId: string;
  faculty: string;
  year: string;
}

interface VolunteerPortalProps {
  locations: UbuLocation[];
  onSubmitVolunteer: (formData: VolunteerFormData, photoBase64?: string, fileName?: string, mimeType?: string) => Promise<void>;
  isLoading?: boolean;
}

// รายชื่อคณะ/วิทยาลัยอย่างเป็นทางการของมหาวิทยาลัยอุบลราชธานี (ม.อุบลฯ)
export const UBU_FACULTIES = [
  'คณะวิทยาศาสตร์',
  'คณะเกษตรศาสตร์',
  'คณะวิศวกรรมศาสตร์',
  'คณะศิลปศาสตร์',
  'คณะเภสัชศาสตร์',
  'คณะบริหารศาสตร์',
  'คณะพยาบาลศาสตร์',
  'คณะสาธารณสุขศาสตร์',
  'คณะศิลปประยุกต์และสถาปัตยกรรมศาสตร์',
  'คณะนิติศาสตร์',
  'คณะรัฐศาสตร์',
  'คณะศึกษาศาสตร์',
  'วิทยาลัยแพทยศาสตร์และการสาธารณสุข',
  'บัณฑิตวิทยาลัย',
  'บุคลากร / หน่วยงานภายในมหาวิทยาลัยอุบลราชธานี',
];

export const VolunteerPortal: React.FC<VolunteerPortalProps> = ({
  locations,
  onSubmitVolunteer,
  isLoading,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Team Volunteer Members list (รองรับการกรอกข้อมูลจิตอาสาได้หลายคน)
  const [members, setMembers] = useState<VolunteerMember[]>([
    {
      id: 'vol-1',
      name: '',
      studentId: '',
      faculty: 'คณะวิทยาศาสตร์',
      year: '3',
    },
  ]);

  // Form states for location and inventory
  const [selectedLocation, setSelectedLocation] = useState<string>(
    locations[0]?.name || 'อาคารเฉลิมพระเกียรติ 7 รอบฯ (CLB) ชั้น 1'
  );
  const [lubricant, setLubricant] = useState<number>(10);
  const [size49, setSize49] = useState<number>(10);
  const [size52, setSize52] = useState<number>(20);
  const [size54, setSize54] = useState<number>(15);
  const [size56, setSize56] = useState<number>(10);
  const [comment, setComment] = useState<string>('');

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string>('');
  const [photoMimeType, setPhotoMimeType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'volunteer') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('รหัสผ่านเข้าใช้งานจิตอาสาไม่ถูกต้อง โปรดลองใหม่อีกครั้ง');
    }
  };

  // Add new volunteer member
  const handleAddMember = () => {
    if (members.length >= 10) {
      alert('สามารถเพิ่มรายชื่อจิตอาสาได้สูงสุด 10 คนต่อรอบ');
      return;
    }
    const newId = `vol-${Date.now()}-${members.length + 1}`;
    setMembers(prev => [
      ...prev,
      {
        id: newId,
        name: '',
        studentId: '',
        faculty: 'คณะวิทยาศาสตร์',
        year: '3',
      },
    ]);
  };

  // Remove volunteer member
  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) {
      alert('ต้องมีข้อมูลจิตอาสาอย่างน้อย 1 ท่าน');
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  // Update member field
  const handleMemberChange = (id: string, field: keyof VolunteerMember, value: string) => {
    setMembers(prev =>
      prev.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFileName(file.name);
    setPhotoMimeType(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPhotoPreview(result);
      const base64 = result.split(',')[1];
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate members
    const invalidMemberIndex = members.findIndex(m => !m.name.trim() || !m.studentId.trim());
    if (invalidMemberIndex !== -1) {
      alert(`โปรดกรอก "ชื่อ - นามสกุล" และ "รหัสนักศึกษา" ของจิตอาสาลำดับที่ ${invalidMemberIndex + 1} ให้ครบถ้วน`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Aggregates for database / Google Sheet
      const namesStr = members.map(m => m.name.trim()).join(', ');
      const studentIdsStr = members.map(m => m.studentId.trim()).join(', ');
      const facultiesStr = members.map(m => m.faculty).join(', ');
      const yearsStr = members.map(m => (m.year === 'บัณฑิตศึกษา' ? 'บัณฑิตศึกษา' : `ปี ${m.year}`)).join(', ');

      const formData: VolunteerFormData = {
        name: namesStr,
        studentId: studentIdsStr,
        faculty: facultiesStr,
        year: yearsStr,
        location: selectedLocation,
        lubricant,
        size49,
        size52,
        size54,
        size56,
        comment: comment.trim(),
      };

      await onSubmitVolunteer(
        formData,
        photoBase64 || undefined,
        photoFileName || undefined,
        photoMimeType || undefined
      );

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSubmitSuccess(true);
      // Reset form
      setComment('');
      setLubricant(0);
      setSize49(0);
      setSize52(0);
      setSize54(0);
      setSize56(0);
      setPhotoPreview(null);
      setPhotoBase64(null);
      // Keep primary member or reset
      setMembers([
        {
          id: 'vol-1',
          name: '',
          studentId: '',
          faculty: 'คณะวิทยาศาสตร์',
          year: '3',
        },
      ]);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลจิตอาสา');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-200 rounded-3xl p-8 custom-shadow text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center text-4xl mx-auto shadow-sm">
          💛
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">เข้าสู่ระบบสำหรับหน่วยจิตอาสา</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            ล็อกอินเพื่อเข้าสู่ฟอร์มกระจายและเติมสินค้าถุงยาง
          </p>
        </div>

        {loginError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-700 flex items-center gap-2.5 text-left font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{loginError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-xs sm:text-sm font-semibold text-slate-700">รหัสผ่านสำหรับจิตอาสา:</label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่านจิตอาสา"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full text-center text-base sm:text-lg px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm sm:text-base py-3.5 rounded-2xl shadow-md transition-all cursor-pointer"
          >
            ตรวจสอบรหัสผ่าน
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 custom-shadow space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl text-blue-600">
              🤝
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-blue-900 tracking-tight">
                บันทึกสต็อกข้อมูลจัดส่งโดยจิตอาสา
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                กรุณากรอกข้อมูลส่วนตัวเพื่อบันทึกประวัติการทำจิตอาสา
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 self-start sm:self-auto px-3.5 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>

        {submitSuccess && (
          <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-3 text-sm font-bold">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>บันทึกข้อมูลและอัปเดตสถานะจุดบริการเป็น "มีอยู่" สำเร็จ! ขอบคุณจิตอาสาทุกท่านครับ</span>
            </div>
            <button
              onClick={() => setSubmitSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Volunteer Members Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>ข้อมูลผู้ปฏิบัติงานจิตอาสา (ทั้งหมด {members.length} ท่าน)</span>
              </div>

              <button
                type="button"
                onClick={handleAddMember}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ เพิ่มรายชื่อจิตอาสา</span>
              </button>
            </div>

            {/* List of Volunteer Members Cards */}
            <div className="space-y-4">
              {members.map((member, index) => (
                <div
                  key={member.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 relative"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-700">
                        {index === 0 ? 'จิตอาสาคนที่ 1 (ผู้บันทึกหลัก)' : `จิตอาสาคนที่ ${index + 1} (ผู้ร่วมงาน)`}
                      </span>
                    </div>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบรายชื่อนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm text-slate-600 font-semibold">ชื่อ - นามสกุล *</label>
                      <input
                        type="text"
                        required
                        placeholder="กรอกชื่อ - นามสกุล"
                        value={member.name}
                        onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm text-slate-600 font-semibold">รหัสนักศึกษา *</label>
                      <input
                        type="text"
                        required
                        placeholder="กรอกรหัสนักศึกษา"
                        value={member.studentId}
                        onChange={(e) => handleMemberChange(member.id, 'studentId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-mono placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm text-slate-600 font-semibold">คณะ / หน่วยงาน (ม.อุบลฯ) *</label>
                      <select
                        value={member.faculty}
                        onChange={(e) => handleMemberChange(member.id, 'faculty', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        {UBU_FACULTIES.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm text-slate-600 font-semibold">ชั้นปีการศึกษา *</label>
                      <select
                        value={member.year}
                        onChange={(e) => handleMemberChange(member.id, 'year', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="1">ปี 1</option>
                        <option value="2">ปี 2</option>
                        <option value="3">ปี 3</option>
                        <option value="4">ปี 4</option>
                        <option value="5">ปี 5</option>
                        <option value="6">ปี 6</option>
                        <option value="บัณฑิตศึกษา">ปริญญาโท / ปริญญาเอก (บัณฑิตศึกษา)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>📍 เลือกจุดตู้บริการที่นำสินค้าเข้าบรรจุ *</span>
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 font-bold focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.name}>
                  {loc.name} ({loc.status})
                </option>
              ))}
            </select>
          </div>

          {/* Product Quantities Grid */}
          <div className="bg-slate-50 p-5 sm:p-6 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>📦 จำนวนผลิตภัณฑ์ที่นำเข้าบรรจุใหม่ (ชิ้น)</span>
              </span>
              <span className="text-xs sm:text-sm font-bold font-mono text-slate-600">
                รวม: {Number(lubricant || 0) + Number(size49 || 0) + Number(size52 || 0) + Number(size54 || 0) + Number(size56 || 0)} ชิ้น
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-center shadow-xs">
                <label className="text-xs font-bold text-slate-600 block">เจลหล่อลื่น</label>
                <input
                  type="number"
                  min="0"
                  value={lubricant}
                  onChange={(e) => setLubricant(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-extrabold font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-white border border-rose-100 rounded-xl space-y-1 text-center shadow-xs">
                <label className="text-xs font-bold text-rose-500 block">ไซส์ 49</label>
                <input
                  type="number"
                  min="0"
                  value={size49}
                  onChange={(e) => setSize49(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-extrabold font-mono text-rose-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="p-3 bg-white border border-amber-100 rounded-xl space-y-1 text-center shadow-xs">
                <label className="text-xs font-bold text-amber-500 block">ไซส์ 52</label>
                <input
                  type="number"
                  min="0"
                  value={size52}
                  onChange={(e) => setSize52(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-extrabold font-mono text-amber-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-white border border-emerald-100 rounded-xl space-y-1 text-center shadow-xs">
                <label className="text-xs font-bold text-emerald-500 block">ไซส์ 54</label>
                <input
                  type="number"
                  min="0"
                  value={size54}
                  onChange={(e) => setSize54(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-extrabold font-mono text-emerald-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-white border border-blue-100 rounded-xl space-y-1 text-center shadow-xs">
                <label className="text-xs font-bold text-blue-500 block">ไซส์ 56</label>
                <input
                  type="number"
                  min="0"
                  value={size56}
                  onChange={(e) => setSize56(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center text-sm font-extrabold font-mono text-blue-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Comment & Image Upload */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span>💬 ความคิดเห็นหรือหมายเหตุเพิ่มเติมสำหรับการเติมครั้งนี้</span>
              </label>
              <textarea
                rows={2}
                placeholder="ระบุข้อความหรือหมายเหตุเพิ่มเติม (ถ้ามี)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Photo Upload / Drive Storage */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>📸 ถ่ายภาพ/อัพโหลดหลักฐานการเติมสินค้า (จัดเก็บลง Google Drive)</span>
              </label>

              <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50 rounded-2xl p-5 text-center transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {photoPreview ? (
                  <div className="space-y-2">
                    <img
                      src={photoPreview}
                      alt="หลักฐานการเติม"
                      className="max-h-44 rounded-xl mx-auto shadow-md border border-slate-200"
                    />
                    <p className="text-xs sm:text-sm text-emerald-600 font-bold">✓ เลือกรูปภาพเรียบร้อย: {photoFileName}</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    <span className="text-3xl">📸</span>
                    <p className="text-xs sm:text-sm font-semibold text-slate-600">กดที่นี่เพื่อเปิดกล้องถ่ายภาพ หรือเลือกรูปภาพ</p>
                    <p className="text-xs text-slate-400">รองรับไฟล์ JPG, PNG</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base py-4 rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>⏳ กำลังดำเนินการส่งรูปเข้า Drive และบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <HeartHandshake className="w-5 h-5" />
                <span>ยืนยันส่งข้อมูลสต็อกและปรับปรุงสถานะจุดรับบริการ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
