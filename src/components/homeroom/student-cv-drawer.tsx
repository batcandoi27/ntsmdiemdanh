"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Users,
  Heart,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Save,
  Printer,
  Sparkles,
  Phone,
  ShieldCheck,
  Edit3,
  FileDown,
  Calendar,
  MapPin,
  HeartHandshake,
  Activity,
  FileText,
  BadgeCheck
} from 'lucide-react';
import {
  StudentCurriculumVitae,
  StudentCurriculumVitaeProfileData,
  CurriculumVitaeStatus
} from '@/types/student-cv';
import { StudentCurriculumVitaeService } from '@/services/student-cv-service';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface StudentCvDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classId: string;
  className?: string;
  onUpdated?: () => void;
}

export function StudentCvDrawer({
  isOpen,
  onClose,
  student,
  classId,
  className,
  onUpdated
}: StudentCvDrawerProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [cvRecord, setCvRecord] = useState<StudentCurriculumVitae | null>(null);
  const [formData, setFormData] = useState<StudentCurriculumVitaeProfileData | null>(null);
  const [teacherNotes, setTeacherNotes] = useState('');

  useEffect(() => {
    async function loadCV() {
      if (!isOpen || !student?.id) return;
      setLoading(true);
      try {
        const res = await StudentCurriculumVitaeService.getStudentCurriculumVitae(student.id);
        const birthParts = (student.birthday || '').split(/[-/]/);
        
        if (res.cv) {
          setCvRecord(res.cv);
          setFormData(res.cv.profile_data);
          setTeacherNotes(res.cv.teacher_notes || '');
        } else {
          // Khởi tạo form mặc định từ dữ liệu học sinh có sẵn (Không để trống màn hình)
          const fallbackData: StudentCurriculumVitaeProfileData = {
            full_name_upper: (student.fullName || (student as any).full_name || (student as any).name || '').toUpperCase(),
            gender: ((student.gender as any) === 'female' || (student.gender as any) === 'Nữ' || student.gender === 'Nữ') ? 'Nữ' : 'Nam',
            birth_day: birthParts[0] || '',
            birth_month: birthParts[1] || '',
            birth_year: birthParts[2] || '',
            birth_order: '1',
            ethnicity: (student as any).ethnicity || 'Kinh',
            nationality: 'Việt Nam',
            religion: 'Không',
            citizen_id: (student as any).gov_id || (student as any).govId || '',
            birth_place_hospital: '',
            birth_place_ward: '',
            birth_place_province: 'TP. Hồ Chí Minh',
            birth_register_ward: '',
            birth_register_province: 'TP. Hồ Chí Minh',
            permanent_residence: {
              street_address: (student as any).address || '',
              ward_name: '',
              province_name: 'TP. Hồ Chí Minh'
            },
            current_residence: {
              street_address: (student as any).address || '',
              ward_name: '',
              province_name: 'TP. Hồ Chí Minh'
            },
            living_with: 'Cha và Mẹ',
            direct_guardian: {
              full_name: (student as any).parent_name || '',
              relationship: 'Cha ruột',
              phone: (student as any).parent_phone || (student as any).phone || ''
            },
            health_notes: 'Bình thường',
            father: {
              full_name: (student as any).parent_name || '',
              birth_year: '',
              phone_numbers: (student as any).parent_phone || '',
              job: '',
              workplace: ''
            },
            mother: {
              full_name: '',
              birth_year: '',
              phone_numbers: '',
              job: '',
              workplace: ''
            },
            siblings: [],
            personalities: {
              kien_nhan: false,
              le_phep: true,
              huong_noi: false,
              canh_tranh: false,
              hoa_dong: true,
              quan_tam: true,
              sang_tao: false,
              noi_loan: false,
              nong_tinh: false,
              trung_thuc: true,
              thu_dong: false,
              lanh_dao: false,
              nhay_cam: false,
              huong_ngoai: true,
              vo_tu: true
            },
            primary_contact_person: 'father',
            parent_signature_name: (student as any).parent_name || (student.fullName || '')
          };

          setCvRecord(null);
          setFormData(fallbackData);
          setTeacherNotes('');
        }
      } catch (err) {
        console.error('Error loading student CV in drawer:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCV();
  }, [isOpen, student?.id]);

  if (!isOpen || !student) return null;

  // Xuất file Word DOCX trực tiếp
  const handleExportDocx = async () => {
    if (!formData) return;
    setExportingDocx(true);
    try {
      const res = await fetch('/api/homeroom/export-student-cv-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: 'TRƯỜNG THCS TRẦN BỘI CƠ',
          className: className || '8A13',
          schoolYear: '2026-2027',
          teacherName: 'Giáo viên chủ nhiệm',
          profileData: formData
        })
      });

      if (!res.ok) throw new Error('Không thể tạo file Word từ server');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `So_Yeu_Ly_Lich_${(student.fullName || 'HS').replace(/\s+/g, '_')}_${className || 'Lop'}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Đã tải xuống file Word Sơ Yếu Lý Lịch thành công!');
    } catch (err: any) {
      toast.error('Lỗi khi xuất file Word: ' + err.message);
    } finally {
      setExportingDocx(false);
    }
  };

  const handleReviewAction = async (newStatus: CurriculumVitaeStatus, isLocked: boolean) => {
    if (!formData) return;
    setSaving(true);
    try {
      if (cvRecord?.id) {
        await StudentCurriculumVitaeService.updateTeacherReview(
          cvRecord.id,
          newStatus,
          isLocked,
          teacherNotes
        );
      } else {
        // Nếu chưa nộp, GVCN bấm lưu hồ sơ trực tiếp
        const saved = await StudentCurriculumVitaeService.saveParentSubmission(
          student.id,
          classId,
          formData,
          newStatus === 'verified' ? 'submitted' : 'draft',
          1,
          'Giáo viên chủ nhiệm'
        );
        if (newStatus === 'verified') {
          await StudentCurriculumVitaeService.updateTeacherReview(
            saved.id,
            'verified',
            isLocked,
            teacherNotes
          );
        }
      }

      toast.success(`Đã cập nhật: ${newStatus === 'verified' ? 'Đã duyệt chính thức' : newStatus === 'needs_update' ? 'Yêu cầu bổ sung' : 'Đã lưu hồ sơ'}`);
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      toast.error('Lỗi khi cập nhật: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden relative">
        {/* Header Drawer */}
        <div className="p-4 sm:p-5 shrink-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black text-lg sm:text-xl border border-white/20 shadow-inner">
              {student.order || '•'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg tracking-tight text-white truncate">{student.fullName}</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 border border-blue-400/40 rounded-full text-[11px] sm:text-xs font-mono font-bold text-blue-200">
                  {student.code}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-200/90 font-medium mt-0.5 truncate">
                Sơ Yếu Lý Lịch • Lớp {className || 'Lớp học'} • Năm học 2026-2027
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors border border-white/10"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar & Top Action Bar (GIẢI PHÁP ĐƯA CÁC NÚT BẤM LÊN TRÊN — 100% KHÔNG BỊ CHE TRÊN MỌI THIẾT BỊ) */}
        <div className="shrink-0 bg-slate-50 border-b border-slate-200 p-3 sm:px-5 space-y-2.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] sm:text-[11px]">Trạng thái:</span>
              {cvRecord?.status === 'verified' && (
                <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full font-bold flex items-center gap-1 shadow-xs text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ĐÃ DUYỆT CHÍNH THỨC
                </span>
              )}
              {cvRecord?.status === 'submitted' && (
                <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-full font-bold flex items-center gap-1 shadow-xs text-[11px]">
                  ⏳ PHỤ HUYNH ĐÃ NỘP (CHỜ DUYỆT)
                </span>
              )}
              {cvRecord?.status === 'needs_update' && (
                <span className="px-2.5 py-0.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-full font-bold flex items-center gap-1 shadow-xs text-[11px]">
                  ⚠️ YÊU CẦU BỔ SUNG
                </span>
              )}
              {(!cvRecord || cvRecord.status === 'draft') && (
                <span className="px-2.5 py-0.5 bg-slate-200 border border-slate-300 text-slate-700 rounded-full font-bold flex items-center gap-1 shadow-xs text-[11px]">
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" /> CHƯA NỘP / ĐANG SOẠN
                </span>
              )}
            </div>

            {cvRecord?.is_locked && (
              <span className="px-2 py-0.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <Lock className="w-3 h-3 text-amber-300" /> ĐÃ KHÓA CHỈNH SỬA
              </span>
            )}
          </div>

          {/* TOP ACTION TOOLBAR: CÁC NÚT TÁC NGHIỆP TRỰC DIỆN NGAY TRÊN ĐẦU */}
          {formData && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={exportingDocx}
                  className="px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg font-bold text-xs border border-blue-200 transition active:scale-95 flex items-center gap-1 shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600" />
                  <span>{exportingDocx ? 'Đang xuất...' : 'Xuất Word (.docx)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewAction('needs_update', false)}
                  disabled={saving}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-xs border border-rose-200 transition active:scale-95 flex items-center gap-1 shadow-xs"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Yêu cầu sửa</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReviewAction(cvRecord?.status || 'draft', !cvRecord?.is_locked)}
                  disabled={saving}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs transition flex items-center gap-1 border border-slate-200 shadow-xs"
                >
                  {cvRecord?.is_locked ? <Unlock className="w-3.5 h-3.5 text-slate-600" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{cvRecord?.is_locked ? 'Mở khóa' : 'Khóa'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleReviewAction(cvRecord?.status || 'submitted', false)}
                  disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu</span>
                </button>

                {/* NÚT DUYỆT NỔI BẬT HÀNG ĐẦU */}
                <button
                  type="button"
                  onClick={() => handleReviewAction('verified', true)}
                  disabled={saving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs shadow-md shadow-emerald-600/30 transition active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{cvRecord?.status === 'verified' ? 'Đã duyệt' : 'Duyệt Sơ Yếu Lý Lịch'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Body: Scroll độc lập với flex-1 min-h-0 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-100/60">
          {loading ? (
            <div className="py-24 text-center">
              <div className="animate-spin w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">Đang tải hồ sơ lý lịch học sinh...</p>
            </div>
          ) : !formData ? null : (
            <div className="space-y-6">

              {/* KHỐI I: BẢN THÂN HỌC SINH (Theme Xanh Dương Nổi Bật) */}
              <div className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm overflow-hidden transition-all hover:border-blue-200">
                <div className="bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                  <div className="font-bold text-blue-900 text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <span>I. BẢN THÂN HỌC SINH</span>
                  </div>
                  <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-md">
                    Khớp với Khai sinh & CCCD
                  </span>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs text-slate-800">
                  <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-100/60">
                    <span className="text-slate-500 block mb-0.5">Họ và tên (IN HOA):</span>
                    <span className="font-black text-blue-950 text-sm tracking-wide">{formData.full_name_upper || '....................'}</span>
                  </div>

                  <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-100/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block mb-0.5">Giới tính & Thứ tự:</span>
                      <span className="font-bold text-slate-900">{formData.gender || 'Nam'} • Là con thứ {formData.birth_order || '1'}</span>
                    </div>
                    <div className="px-2.5 py-1 bg-white rounded-lg border border-blue-200 font-bold text-blue-700">
                      {formData.gender === 'Nữ' ? '👧 Nữ' : '👦 Nam'}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 block mb-0.5">Ngày tháng năm sinh:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formData.birth_day ? `${formData.birth_day} / ${formData.birth_month} / ${formData.birth_year}` : 'Chưa có thông tin'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 block mb-0.5">Dân tộc • Tôn giáo • Quốc tịch:</span>
                    <span className="font-bold text-slate-900">
                      {formData.ethnicity || 'Kinh'}{formData.ethnicity_other ? ` (${formData.ethnicity_other})` : ''} • {formData.religion || 'Không'}{formData.religion_other ? ` (${formData.religion_other})` : ''} • {formData.nationality || 'Việt Nam'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <span className="text-indigo-600 font-bold block mb-0.5">Số CCCD (12 số):</span>
                    <span className="font-mono font-black text-indigo-900 text-sm tracking-wider">{formData.citizen_id || 'Chưa cấp CCCD'}</span>
                    {formData.citizen_id_issue_date && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">Cấp: {formData.citizen_id_issue_date} tại {formData.citizen_id_issue_place}</span>
                    )}
                  </div>

                  <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <span className="text-indigo-600 font-bold block mb-0.5">Mã định danh cá nhân:</span>
                    <span className="font-mono font-bold text-indigo-900">{formData.personal_id_code || 'Chưa có mã định danh'}</span>
                  </div>

                  <div className="col-span-1 md:col-span-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                    <span className="text-slate-500 block mb-0.5">Nơi sinh (Bệnh viện / Trạm y tế):</span>
                    <span className="font-medium text-slate-900">
                      {formData.birth_place_hospital || '....................'}, {formData.birth_place_ward || ''}, {formData.birth_place_province || 'TP. Hồ Chí Minh'}
                    </span>
                  </div>

                  <div className="col-span-1 md:col-span-2 p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/70">
                    <span className="text-amber-800 font-bold flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> Nơi thường trú (Theo đơn vị hành chính mới):
                    </span>
                    <span className="font-bold text-slate-900">
                      {formData.permanent_residence?.street_address || '........................................................'}
                    </span>
                  </div>

                  <div className="col-span-1 md:col-span-2 p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/70">
                    <span className="text-amber-800 font-bold flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> Chỗ ở hiện nay:
                    </span>
                    <span className="font-bold text-slate-900">
                      {formData.current_residence?.street_address || formData.permanent_residence?.street_address || '........................................................'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-rose-50/50 rounded-xl border border-rose-200">
                    <span className="text-rose-700 font-bold flex items-center gap-1 mb-0.5">
                      <Activity className="w-3.5 h-3.5 text-rose-600" /> Sức khỏe cần lưu ý:
                    </span>
                    <span className="font-bold text-rose-900">{formData.health_notes || 'Bình thường'}</span>
                  </div>

                  <div className="p-2.5 bg-teal-50/50 rounded-xl border border-teal-200">
                    <span className="text-teal-700 font-bold flex items-center gap-1 mb-0.5">
                      <BadgeCheck className="w-3.5 h-3.5 text-teal-600" /> BHYT & KCB ban đầu:
                    </span>
                    <span className="font-mono font-bold text-teal-950">{formData.health_insurance_code || 'Chưa có mã'}</span>
                    {formData.health_insurance_hospital && (
                      <span className="text-[10px] text-teal-800 block mt-0.5 truncate">({formData.health_insurance_hospital})</span>
                    )}
                  </div>
                </div>
              </div>

              {/* KHỐI II: GIA ĐÌNH (Phân Tách Thẻ Cha & Thẻ Mẹ Rõ Ràng) */}
              <div className="bg-white rounded-2xl border-2 border-emerald-100 shadow-sm overflow-hidden transition-all hover:border-emerald-200">
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 border-b border-emerald-100 flex items-center justify-between">
                  <div className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <Users className="w-4 h-4" />
                    </div>
                    <span>II. THÔNG TIN GIA ĐÌNH</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                    Sống cùng: {formData.living_with || 'Cha và Mẹ'}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Thẻ Cha */}
                    <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 rounded-2xl border-2 border-blue-200 text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-blue-200 pb-1.5">
                        <span className="font-black text-blue-900 text-sm flex items-center gap-1.5">
                          👨 CHA RUỘT
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                          {formData.father?.birth_year ? `Năm sinh: ${formData.father.birth_year}` : 'Chưa có năm sinh'}
                        </span>
                      </div>
                      <div className="pt-1"><b>Họ và tên:</b> <span className="font-bold text-slate-900">{formData.father?.full_name || '................................'}</span></div>
                      <div><b>Số điện thoại:</b> <span className="text-blue-700 font-bold font-mono text-sm">{formData.father?.phone_numbers || '................'}</span></div>
                      <div><b>Nghề nghiệp:</b> {formData.father?.job || '................................'}</div>
                      <div><b>Nơi làm việc:</b> {formData.father?.workplace || 'Tự do'}</div>
                    </div>

                    {/* Thẻ Mẹ */}
                    <div className="p-4 bg-gradient-to-br from-rose-50/60 to-pink-50/30 rounded-2xl border-2 border-rose-200 text-xs space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between border-b border-rose-200 pb-1.5">
                        <span className="font-black text-rose-900 text-sm flex items-center gap-1.5">
                          👩 MẸ RUỘT
                        </span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                          {formData.mother?.birth_year ? `Năm sinh: ${formData.mother.birth_year}` : 'Chưa có năm sinh'}
                        </span>
                      </div>
                      <div className="pt-1"><b>Họ và tên:</b> <span className="font-bold text-slate-900">{formData.mother?.full_name || '................................'}</span></div>
                      <div><b>Số điện thoại:</b> <span className="text-rose-700 font-bold font-mono text-sm">{formData.mother?.phone_numbers || '................'}</span></div>
                      <div><b>Nghề nghiệp:</b> {formData.mother?.job || '................................'}</div>
                      <div><b>Nơi làm việc:</b> {formData.mother?.workplace || 'Tự do'}</div>
                    </div>
                  </div>

                  {/* Anh chị em ruột */}
                  <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-200 text-xs">
                    <div className="font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-600" /> Danh sách anh, chị, em ruột:
                    </div>
                    {(formData.siblings || []).length === 0 ? (
                      <span className="text-slate-400 italic">Chưa có thông tin anh/chị/em ruột</span>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        {formData.siblings.map((s, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-purple-100 shadow-xs flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800">{idx + 1}. {s.full_name}</span>
                              <span className="text-[10px] text-slate-500 block">Nghề/Trường: {s.job_or_school}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-mono font-bold rounded text-[11px]">
                              {s.birth_year}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KHỐI III: KHẢO SÁT TÍNH CÁCH & Ý KIẾN (Theme Tím & Hồng Độc Đáo) */}
              <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-sm overflow-hidden transition-all hover:border-purple-200">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-3 border-b border-purple-100 flex items-center justify-between">
                  <div className="font-bold text-purple-900 text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Heart className="w-4 h-4" />
                    </div>
                    <span>III. KHẢO SÁT TÍNH CÁCH & Ý KIẾN PHỤ HUYNH</span>
                  </div>
                </div>

                <div className="p-5 space-y-3.5 text-xs text-slate-800">
                  <div>
                    <span className="font-bold text-slate-700 block mb-2">1. Tính cách nổi bật do Phụ huynh đánh giá:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(formData.personalities || {}).map(([key, val]) => {
                        if (!val || key === 'other_traits') return null;
                        const labels: Record<string, string> = {
                          kien_nhan: 'Kiên nhẫn, chịu khó',
                          le_phep: 'Lễ phép, chừng mực',
                          huong_noi: 'Hướng nội',
                          canh_tranh: 'Cạnh tranh, cầu toàn',
                          hoa_dong: 'Hòa đồng, cởi mở',
                          quan_tam: 'Quan tâm người khác',
                          sang_tao: 'Sáng tạo, mơ mộng',
                          noi_loan: 'Nổi loạn, chống đối',
                          nong_tinh: 'Nóng tính',
                          trung_thuc: 'Trung thực',
                          thu_dong: 'Thụ động, thờ ơ',
                          lanh_dao: 'Lãnh đạo, ảnh hưởng',
                          nhay_cam: 'Nhạy cảm, rụt rè',
                          huong_ngoai: 'Hướng ngoại',
                          vo_tu: 'Vô tư, hài hước'
                        };
                        return (
                          <span key={key} className="px-3 py-1 bg-blue-100/80 text-blue-900 border border-blue-200 rounded-lg font-bold shadow-xs flex items-center gap-1">
                            ✓ {labels[key] || key}
                          </span>
                        );
                      })}
                      {formData.personalities?.other_traits && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-bold shadow-xs flex items-center gap-1">
                          ✓ Khác: {formData.personalities.other_traits}
                        </span>
                      )}
                    </div>
                  </div>

                  {formData.special_family_circumstances && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                      <span className="font-bold block mb-0.5">2. Hoàn cảnh đặc biệt của gia đình:</span>
                      <p className="italic">"{formData.special_family_circumstances}"</p>
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <b>Liên lạc chính khi cần:</b> {formData.primary_contact_person === 'father' ? 'Cha' : formData.primary_contact_person === 'mother' ? 'Mẹ' : 'Người giám hộ'}
                    </div>
                    <div>
                      <b>Người ký xác nhận:</b> <span className="font-bold text-blue-900">{formData.parent_signature_name || 'Phụ huynh học sinh'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI TÁC NGHIỆP CỦA GIÁO VIÊN CHỦ NHIỆM */}
              <div className="p-5 bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border-2 border-indigo-200 rounded-2xl space-y-2.5 shadow-sm">
                <div className="font-black text-xs uppercase tracking-wider text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> TÁC NGHIỆP CỦA GIÁO VIÊN CHỦ NHIỆM
                </div>
                <textarea
                  rows={2}
                  value={teacherNotes}
                  onChange={e => setTeacherNotes(e.target.value)}
                  placeholder="Ghi chú nội bộ dành cho GVCN hoặc lời nhắn gửi phụ huynh nếu cần bổ sung hồ sơ..."
                  className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs font-medium"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS CỦA GVCN & ADMIN: LUÔN NỔI BẬT KHÔNG BỊ CHE KHUẤT */}
        {formData && (
          <div className="sticky bottom-0 z-[100] bg-white/98 backdrop-blur-md p-4 pb-6 sm:pb-4 border-t-2 border-slate-200 shadow-[0_-8px_25px_rgba(0,0,0,0.15)] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportDocx}
                disabled={exportingDocx}
                className="px-3.5 py-2.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-xl font-bold text-xs border border-blue-200 transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>{exportingDocx ? 'Đang xuất...' : 'Xuất Word'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction('needs_update', false)}
                disabled={saving}
                className="px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs border border-rose-200 transition-all active:scale-95 flex items-center gap-1.5 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Yêu cầu bổ sung</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReviewAction(cvRecord?.status || 'draft', !cvRecord?.is_locked)}
                disabled={saving}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border border-slate-200 shadow-xs active:scale-95"
              >
                {cvRecord?.is_locked ? <Unlock className="w-3.5 h-3.5 text-slate-600" /> : <Lock className="w-3.5 h-3.5 text-slate-600" />}
                <span>{cvRecord?.is_locked ? 'Mở khóa' : 'Khóa hồ sơ'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleReviewAction(cvRecord?.status || 'submitted', false)}
                disabled={saving}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu hồ sơ</span>
              </button>

              {/* NÚT DUYỆT CHÍNH THỨC NỔI BẬT NHẤT */}
              <button
                type="button"
                onClick={() => handleReviewAction('verified', true)}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{cvRecord?.status === 'verified' ? 'Đã duyệt' : 'Duyệt chính thức'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
