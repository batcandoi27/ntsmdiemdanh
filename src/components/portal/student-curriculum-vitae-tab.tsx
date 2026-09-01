"use client";

import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Heart,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Lock,
  Sparkles,
  Plus,
  Trash2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import {
  StudentCurriculumVitae,
  StudentCurriculumVitaeProfileData,
  AdminCatalogItem,
  TeacherCustomField,
  SiblingInfo
} from '@/types/student-cv';
import { StudentCurriculumVitaeService } from '@/services/student-cv-service';
import { Student } from '@/types/models';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface StudentCurriculumVitaeTabProps {
  student: Student;
  classId: string;
  className?: string;
}

const DEFAULT_PROFILE: StudentCurriculumVitaeProfileData = {
  full_name_upper: '',
  gender: 'Nam',
  birth_day: '',
  birth_month: '',
  birth_year: '',
  birth_order: '1',
  ethnicity: 'Kinh',
  nationality: 'Việt Nam',
  religion: 'Không',
  citizen_id: '',
  personal_id_code: '',
  birth_place_hospital: '',
  birth_place_ward: '',
  birth_place_province: 'TP. Hồ Chí Minh',
  birth_register_ward: '',
  birth_register_province: 'TP. Hồ Chí Minh',
  hometown: { province_name: 'TP. Hồ Chí Minh', ward_name: '', street_address: '' },
  permanent_residence: { province_name: 'TP. Hồ Chí Minh', ward_name: '', street_address: '' },
  current_residence: { province_name: 'TP. Hồ Chí Minh', ward_name: '', street_address: '' },
  living_with: 'Cha và Mẹ',
  direct_guardian: { full_name: '', relationship: 'Cha', phone: '' },
  hobbies_and_talents: '',
  health_notes: '',
  class_position: '',
  health_insurance_code: '',
  health_insurance_hospital: '',
  father: { full_name: '', birth_year: '', phone_numbers: '', job: '' },
  mother: { full_name: '', birth_year: '', phone_numbers: '', job: '' },
  guardian: { full_name: '', birth_year: '', phone_numbers: '', job: '' },
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
    huong_ngoai: false,
    vo_tu: false
  },
  special_family_circumstances: '',
  primary_contact_person: 'father',
  parent_signature_name: '',
  custom_fields: {}
};

export function StudentCurriculumVitaeTab({ student, classId, className }: StudentCurriculumVitaeTabProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvRecord, setCvRecord] = useState<StudentCurriculumVitae | null>(null);
  const [formData, setFormData] = useState<StudentCurriculumVitaeProfileData>(DEFAULT_PROFILE);

  // Catalogs & Teacher custom fields
  const [ethnicities, setEthnicities] = useState<AdminCatalogItem[]>([]);
  const [religions, setReligions] = useState<AdminCatalogItem[]>([]);
  const [hospitals, setHospitals] = useState<AdminCatalogItem[]>([]);
  const [teacherCustomFields, setTeacherCustomFields] = useState<TeacherCustomField[]>([]);

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!student.id) return;
      setLoading(true);
      try {
        const [cvRes, ethRes, relRes, hospRes, tcfRes] = await Promise.all([
          StudentCurriculumVitaeService.getStudentCurriculumVitae(student.id),
          StudentCurriculumVitaeService.getAdminCatalog('ethnicities'),
          StudentCurriculumVitaeService.getAdminCatalog('religions'),
          StudentCurriculumVitaeService.getAdminCatalog('hospitals'),
          StudentCurriculumVitaeService.getTeacherCustomFields(classId)
        ]);

        setEthnicities(ethRes);
        setReligions(relRes);
        setHospitals(hospRes);
        setTeacherCustomFields(tcfRes);

        if (cvRes.cv) {
          setCvRecord(cvRes.cv);
          setFormData({
            ...DEFAULT_PROFILE,
            ...cvRes.cv.profile_data,
            custom_fields: cvRes.cv.profile_data.custom_fields || {}
          });
        } else {
          // Pre-fill từ dữ liệu có sẵn
          setFormData(prev => ({
            ...prev,
            ...cvRes.prefill,
            full_name_upper: (student.fullName || '').toUpperCase(),
            gender: student.gender || 'Nam',
            parent_signature_name: prev.parent_signature_name || 'Phụ huynh học sinh'
          }));
        }
      } catch (err) {
        console.error('Error loading curriculum vitae:', err);
        toast.error('Lỗi tải dữ liệu sơ yếu lý lịch');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [student.id, classId]);

  const isLocked = cvRecord?.is_locked || cvRecord?.status === 'verified';

  // Handler update field
  const updateField = (field: keyof StudentCurriculumVitaeProfileData, value: any) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateFather = (field: string, value: any) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, father: { ...prev.father, [field]: value } }));
  };

  const updateMother = (field: string, value: any) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, mother: { ...prev.mother, [field]: value } }));
  };

  const updatePersonality = (key: keyof typeof DEFAULT_PROFILE.personalities) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      personalities: {
        ...prev.personalities,
        [key]: !prev.personalities[key]
      }
    }));
  };

  const updateCustomField = (fieldKey: string, value: any) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      custom_fields: {
        ...(prev.custom_fields || {}),
        [fieldKey]: value
      }
    }));
  };

  // Add / Remove Sibling
  const addSibling = () => {
    if (isLocked || (formData.siblings?.length || 0) >= 5) return;
    setFormData(prev => ({
      ...prev,
      siblings: [...(prev.siblings || []), { full_name: '', birth_year: '', job_or_school: '' }]
    }));
  };

  const removeSibling = (index: number) => {
    if (isLocked) return;
    setFormData(prev => ({
      ...prev,
      siblings: prev.siblings.filter((_, i) => i !== index)
    }));
  };

  const updateSibling = (index: number, field: keyof SiblingInfo, value: string) => {
    if (isLocked) return;
    setFormData(prev => {
      const list = [...(prev.siblings || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, siblings: list };
    });
  };

  // Helper kiểm tra các trường còn thiếu để nhắc nhở phụ huynh (vẫn cho phép nộp)
  const getMissingFieldsForStep = (step: number) => {
    const missing: string[] = [];
    if (step === 1) {
      if (!formData.full_name_upper?.trim()) missing.push('Họ tên HS');
      if (!formData.birth_day || !formData.birth_month || !formData.birth_year) missing.push('Ngày sinh');
      if (!formData.birth_place_hospital?.trim()) missing.push('Nơi sinh (BV/Trạm)');
      if (!formData.permanent_residence?.street_address?.trim()) missing.push('Nơi thường trú');
      if (!formData.citizen_id?.trim() && !formData.personal_id_code?.trim()) missing.push('CCCD/Mã định danh');
    } else if (step === 2) {
      if (!formData.father?.full_name?.trim() && !formData.mother?.full_name?.trim()) missing.push('Họ tên Cha/Mẹ');
      if (!formData.father?.phone_numbers?.trim() && !formData.mother?.phone_numbers?.trim()) missing.push('SĐT liên lạc');
    } else if (step === 3) {
      if (!formData.parent_signature_name?.trim()) missing.push('Tên PH ký');
    }
    return missing;
  };

  const handleNextStep = (currentStep: number) => {
    const missing = getMissingFieldsForStep(currentStep);
    if (missing.length > 0) {
      toast(`💡 Lưu ý các mục chưa điền: ${missing.join(', ')} (PH có thể bổ sung sau)`, {
        icon: '📝',
        duration: 4000
      });
    }
    setActiveStep(Math.min(3, currentStep + 1) as 1 | 2 | 3);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  // Save draft / Submit
  const handleSave = async (submitStatus: 'draft' | 'submitted') => {
    if (isLocked) {
      toast.error('Hồ sơ đã được GVCN duyệt và khóa, không thể chỉnh sửa.');
      return;
    }

    // Nhắc nhở nếu nộp mà còn thiếu trường, nhưng VẪN CHO PHÉP NỘP
    if (submitStatus === 'submitted') {
      const allMissing = [
        ...getMissingFieldsForStep(1),
        ...getMissingFieldsForStep(2),
        ...getMissingFieldsForStep(3)
      ];
      if (allMissing.length > 0) {
        toast(`⚠️ Hồ sơ còn trống: ${allMissing.slice(0, 3).join(', ')}. Hệ thống vẫn tiếp nhận để GVCN hỗ trợ!`, {
          icon: 'ℹ️',
          duration: 4000
        });
      }
    }

    setSaving(true);
    try {
      const saved = await StudentCurriculumVitaeService.saveParentSubmission(
        student.id,
        classId,
        formData,
        submitStatus,
        cvRecord?.version || 1,
        formData.parent_signature_name || 'Phụ huynh'
      );
      setCvRecord(saved);
      if (submitStatus === 'submitted') {
        toast.success('🎉 Đã nộp Sơ Yếu Lý Lịch thành công đến Giáo viên Chủ nhiệm!');
      } else {
        toast.success('💾 Đã lưu bản nháp sơ yếu lý lịch!');
      }
    } catch (err: any) {
      console.error('Error saving CV:', err);
      toast.error('Lỗi khi lưu: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-slate-500 font-medium">Đang tải hồ sơ Sơ Yếu Lý Lịch...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header trạng thái */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
              {className || 'Lớp học'} • Niên khóa 2026-2027
            </span>
            {cvRecord?.status === 'verified' && (
              <span className="px-3 py-1 bg-emerald-500/90 text-white rounded-full text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt chính thức
              </span>
            )}
            {cvRecord?.status === 'submitted' && (
              <span className="px-3 py-1 bg-amber-500/90 text-white rounded-full text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Đã nộp (Chờ GVCN duyệt)
              </span>
            )}
            {cvRecord?.status === 'needs_update' && (
              <span className="px-3 py-1 bg-rose-500/90 text-white rounded-full text-xs font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> GVCN yêu cầu bổ sung
              </span>
            )}
            {(!cvRecord || cvRecord?.status === 'draft') && (
              <span className="px-3 py-1 bg-slate-500/80 text-white rounded-full text-xs font-medium">
                Bản nháp (Chưa nộp)
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold">{formData.full_name_upper || student.fullName}</h2>
          <p className="text-blue-200 text-xs mt-0.5">
            Sơ yếu lý lịch học sinh theo chuẩn biểu mẫu chính thức của nhà trường.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {!isLocked && (
            <>
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2 border border-white/20"
              >
                <Save className="w-4 h-4" /> Lưu nháp
              </button>
              <button
                onClick={() => handleSave('submitted')}
                disabled={saving}
                className="flex-1 md:flex-initial px-5 py-2.5 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Nộp cho GVCN
              </button>
            </>
          )}
          {isLocked && (
            <div className="px-4 py-2 bg-emerald-500/20 text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2 border border-emerald-400/30">
              <Lock className="w-4 h-4 text-emerald-300" /> Hồ sơ đã được khóa an toàn
            </div>
          )}
        </div>
      </div>

      {/* Lời nhắn yêu cầu bổ sung của GVCN nếu có */}
      {cvRecord?.teacher_notes && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Ghi chú từ Giáo viên Chủ nhiệm:</div>
            <div className="text-sm mt-0.5">{cvRecord.teacher_notes}</div>
          </div>
        </div>
      )}

      {/* Step Tabs Navigation (3 Bước) */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm">
        <button
          onClick={() => setActiveStep(1)}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all",
            activeStep === 1 ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <User className="w-4 h-4" /> I. Bản thân HS
        </button>
        <button
          onClick={() => setActiveStep(2)}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all",
            activeStep === 2 ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Users className="w-4 h-4" /> II. Gia đình
        </button>
        <button
          onClick={() => setActiveStep(3)}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all",
            activeStep === 3 ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <Heart className="w-4 h-4" /> III. Tính cách & Ý kiến
        </button>
      </div>

      {/* ==================== BƯỚC 1: BẢN THÂN ==================== */}
      {activeStep === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2 text-blue-900">
            <User className="w-5 h-5 text-blue-600" /> PHẦN I. THÔNG TIN BẢN THÂN HỌC SINH
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">1. Họ tên HS (IN HOA) *</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.full_name_upper}
                onChange={e => updateField('full_name_upper', e.target.value.toUpperCase())}
                placeholder="NGUYỄN VĂN A"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-bold uppercase text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giới tính *</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="gender"
                    disabled={isLocked}
                    checked={formData.gender === 'Nam'}
                    onChange={() => updateField('gender', 'Nam')}
                    className="w-4 h-4 text-blue-600"
                  />
                  Nam
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="gender"
                    disabled={isLocked}
                    checked={formData.gender === 'Nữ'}
                    onChange={() => updateField('gender', 'Nữ')}
                    className="w-4 h-4 text-blue-600"
                  />
                  Nữ
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Là con thứ mấy *</label>
              <input
                type="number"
                disabled={isLocked}
                value={formData.birth_order}
                onChange={e => updateField('birth_order', e.target.value)}
                placeholder="1, 2, 3..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ngày sinh & Dân tộc / Tôn giáo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">2. Ngày sinh (Ngày/Tháng/Năm) *</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={2}
                  disabled={isLocked}
                  value={formData.birth_day}
                  onChange={e => updateField('birth_day', e.target.value)}
                  placeholder="Ngày"
                  className="w-1/3 px-2 py-2.5 border border-slate-200 rounded-xl text-center text-sm font-medium"
                />
                <input
                  type="text"
                  maxLength={2}
                  disabled={isLocked}
                  value={formData.birth_month}
                  onChange={e => updateField('birth_month', e.target.value)}
                  placeholder="Tháng"
                  className="w-1/3 px-2 py-2.5 border border-slate-200 rounded-xl text-center text-sm font-medium"
                />
                <input
                  type="text"
                  maxLength={4}
                  disabled={isLocked}
                  value={formData.birth_year}
                  onChange={e => updateField('birth_year', e.target.value)}
                  placeholder="Năm"
                  className="w-1/3 px-2 py-2.5 border border-slate-200 rounded-xl text-center text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">3. Dân tộc</label>
              <select
                disabled={isLocked}
                value={formData.ethnicity}
                onChange={e => updateField('ethnicity', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {ethnicities.map(e => (
                  <option key={e.code} value={e.label}>{e.label}</option>
                ))}
              </select>
              {(formData.ethnicity?.toLowerCase().includes('khác') || formData.ethnicity === 'Khác') && (
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.ethnicity_other || ''}
                  onChange={e => updateField('ethnicity_other', e.target.value)}
                  placeholder="Ghi rõ dân tộc..."
                  className="w-full mt-1.5 px-3 py-1.5 border border-blue-300 rounded-lg text-xs bg-blue-50/50"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tôn giáo</label>
              <select
                disabled={isLocked}
                value={formData.religion}
                onChange={e => updateField('religion', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {religions.map(r => (
                  <option key={r.code} value={r.label}>{r.label}</option>
                ))}
              </select>
              {(formData.religion?.toLowerCase().includes('khác') || formData.religion === 'Khác') && (
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.religion_other || ''}
                  onChange={e => updateField('religion_other', e.target.value)}
                  placeholder="Ghi rõ tôn giáo..."
                  className="w-full mt-1.5 px-3 py-1.5 border border-blue-300 rounded-lg text-xs bg-blue-50/50"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quốc tịch</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.nationality}
                onChange={e => updateField('nationality', e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* 4. CCCD & Định danh */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">4. Số CCCD (12 số)</label>
              <input
                type="text"
                maxLength={12}
                disabled={isLocked}
                value={formData.citizen_id}
                onChange={e => updateField('citizen_id', e.target.value.replace(/\D/g, ''))}
                placeholder="079..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-slate-900 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày cấp</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.citizen_id_issue_date || ''}
                onChange={e => updateField('citizen_id_issue_date', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nơi cấp</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.citizen_id_issue_place || ''}
                onChange={e => updateField('citizen_id_issue_place', e.target.value)}
                placeholder="Cục CS QLHC..."
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mã định danh (nếu chưa có CCCD)</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.personal_id_code || ''}
                onChange={e => updateField('personal_id_code', e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* 5. Nơi sinh & Khai sinh */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">5. Nơi sinh (Tên bệnh viện, trạm y tế) *</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.birth_place_hospital}
                onChange={e => updateField('birth_place_hospital', e.target.value)}
                placeholder="Bệnh viện Hùng Vương / BV Từ Dũ..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Xã/Phường, Tỉnh/TP nơi sinh *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.birth_place_ward}
                  onChange={e => updateField('birth_place_ward', e.target.value)}
                  placeholder="Phường/Xã"
                  className="w-1/2 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.birth_place_province}
                  onChange={e => updateField('birth_place_province', e.target.value)}
                  placeholder="Tỉnh/Thành phố"
                  className="w-1/2 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* 8 & 9. Nơi thường trú & Chỗ ở hiện nay */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">8. Nơi thường trú (Số nhà, đường, khu phố, phường, quận/tỉnh) *</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.permanent_residence?.street_address || ''}
                onChange={e => updateField('permanent_residence', { ...formData.permanent_residence, street_address: e.target.value })}
                placeholder="Số 123 Đường Nguyễn Tri Phương, Phường 9, Quận 5, TP.HCM"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">9. Chỗ ở hiện nay (nếu khác thường trú)</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.current_residence?.street_address || ''}
                onChange={e => updateField('current_residence', { ...formData.current_residence, street_address: e.target.value })}
                placeholder="Để trống nếu giống nơi thường trú"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Sức khỏe & BHYT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">14. Vấn đề sức khỏe cần lưu ý (Dị ứng, cận thị, tim mạch...)</label>
              <input
                type="text"
                maxLength={150}
                disabled={isLocked}
                value={formData.health_notes || ''}
                onChange={e => updateField('health_notes', e.target.value)}
                placeholder="Cận 2 độ, dị ứng phấn hoa..."
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm text-red-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">16. Mã số BHYT & Nơi ĐK khám chữa bệnh</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.health_insurance_code || ''}
                  onChange={e => updateField('health_insurance_code', e.target.value.toUpperCase())}
                  placeholder="GD479..."
                  className="w-1/2 px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                />
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.health_insurance_hospital || ''}
                  onChange={e => updateField('health_insurance_hospital', e.target.value)}
                  placeholder="BV Quận 5..."
                  className="w-1/2 px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* Thanh điều hướng nhanh cuối Bước 1 */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving || isLocked}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" /> Lưu bản nháp
            </button>
            <button
              type="button"
              onClick={() => handleNextStep(1)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-600/25 flex items-center gap-2 active:scale-95"
            >
              <span>Điền tiếp Phần II. Gia đình</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== BƯỚC 2: GIA ĐÌNH ==================== */}
      {activeStep === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2 text-blue-900">
            <Users className="w-5 h-5 text-blue-600" /> PHẦN II. THÔNG TIN GIA ĐÌNH
          </h3>

          {/* 1. THÔNG TIN CHA */}
          <div className="p-5 bg-gradient-to-br from-blue-50/80 via-sky-50/40 to-white rounded-2xl border-2 border-blue-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
              <div className="font-black text-blue-900 text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  👨
                </div>
                <span>1. THÔNG TIN CHA (Theo giấy khai sinh)</span>
              </div>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-md">
                Cha ruột
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">Họ và tên cha *</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.father?.full_name || ''}
                  onChange={e => updateFather('full_name', e.target.value)}
                  placeholder="NGUYỄN VĂN A"
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">Năm sinh</label>
                <input
                  type="text"
                  maxLength={4}
                  disabled={isLocked}
                  value={formData.father?.birth_year || ''}
                  onChange={e => updateFather('birth_year', e.target.value)}
                  placeholder="1980"
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-950 mb-1">Số điện thoại liên lạc *</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.father?.phone_numbers || ''}
                  onChange={e => updateFather('phone_numbers', e.target.value)}
                  placeholder="0903..."
                  className="w-full px-3 py-2 border border-blue-300 rounded-xl text-sm font-mono font-bold text-blue-700 bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nghề nghiệp & Chức vụ</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.father?.job || ''}
                  onChange={e => updateFather('job', e.target.value)}
                  placeholder="Kỹ sư, Trưởng phòng..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nơi làm việc</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.father?.workplace || ''}
                  onChange={e => updateFather('workplace', e.target.value)}
                  placeholder="Công ty TNHH ABC..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* 2. THÔNG TIN MẸ */}
          <div className="p-5 bg-gradient-to-br from-rose-50/80 via-pink-50/40 to-white rounded-2xl border-2 border-rose-200/90 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
              <div className="font-black text-rose-900 text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  👩
                </div>
                <span>2. THÔNG TIN MẸ (Theo giấy khai sinh)</span>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-md">
                Mẹ ruột
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-rose-950 mb-1">Họ và tên mẹ *</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.mother?.full_name || ''}
                  onChange={e => updateMother('full_name', e.target.value)}
                  placeholder="TRẦN THỊ B"
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm font-bold bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-950 mb-1">Năm sinh</label>
                <input
                  type="text"
                  maxLength={4}
                  disabled={isLocked}
                  value={formData.mother?.birth_year || ''}
                  onChange={e => updateMother('birth_year', e.target.value)}
                  placeholder="1982"
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm bg-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-rose-950 mb-1">Số điện thoại liên lạc *</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.mother?.phone_numbers || ''}
                  onChange={e => updateMother('phone_numbers', e.target.value)}
                  placeholder="0918..."
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl text-sm font-mono font-bold text-rose-700 bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nghề nghiệp & Chức vụ</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.mother?.job || ''}
                  onChange={e => updateMother('job', e.target.value)}
                  placeholder="Giáo viên, Bác sĩ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nơi làm việc</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.mother?.workplace || ''}
                  onChange={e => updateMother('workplace', e.target.value)}
                  placeholder="Trường THCS XYZ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* 3. NGƯỜI GIÁM HỘ (NẾU CÓ) */}
          <div className="p-4 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white rounded-2xl border border-amber-200 space-y-3">
            <div className="font-bold text-amber-900 text-sm flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                🛡️
              </div>
              <span>3. THÔNG TIN NGƯỜI GIÁM HỘ (Nếu có)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Họ tên người giám hộ</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.guardian?.full_name || ''}
                  onChange={e => setFormData(prev => ({ ...prev, guardian: { ...(prev.guardian || { full_name: '', birth_year: '', phone_numbers: '', job: '', workplace: '' }), full_name: e.target.value } }))}
                  placeholder="Để trống nếu ở với Cha/Mẹ"
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Số điện thoại liên lạc</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.guardian?.phone_numbers || ''}
                  onChange={e => setFormData(prev => ({ ...prev, guardian: { ...(prev.guardian || { full_name: '', birth_year: '', phone_numbers: '', job: '', workplace: '' }), phone_numbers: e.target.value } }))}
                  placeholder="09..."
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm font-mono bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quan hệ với HS</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.guardian?.job || ''}
                  onChange={e => setFormData(prev => ({ ...prev, guardian: { ...(prev.guardian || { full_name: '', birth_year: '', phone_numbers: '', job: '', workplace: '' }), job: e.target.value } }))}
                  placeholder="Ông/Bà/Cô/Chú/Bác..."
                  className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* 4. ANH CHỊ EM RUỘT */}
          <div className="p-5 bg-gradient-to-br from-purple-50/80 via-violet-50/40 to-white rounded-2xl border-2 border-purple-200/90 shadow-xs space-y-3">
            <div className="flex justify-between items-center border-b border-purple-200/80 pb-2">
              <div className="font-black text-purple-900 text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  👨‍👩‍👧‍👦
                </div>
                <span>4. Danh sách anh, chị, em ruột (Tối đa 5 người)</span>
              </div>
              {!isLocked && (formData.siblings?.length || 0) < 5 && (
                <button
                  type="button"
                  onClick={addSibling}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm người
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {(formData.siblings || []).map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center p-2.5 bg-white rounded-xl border border-purple-200 shadow-xs">
                  <span className="w-6 text-xs font-black text-purple-600">{idx + 1}/</span>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={s.full_name}
                    onChange={e => updateSibling(idx, 'full_name', e.target.value)}
                    placeholder="Họ và tên anh/chị/em"
                    className="flex-1 px-3 py-1.5 border border-purple-100 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                  <input
                    type="text"
                    maxLength={4}
                    disabled={isLocked}
                    value={s.birth_year}
                    onChange={e => updateSibling(idx, 'birth_year', e.target.value)}
                    placeholder="Năm sinh"
                    className="w-24 px-2 py-1.5 border border-purple-100 rounded-lg text-sm text-center font-mono"
                  />
                  <input
                    type="text"
                    disabled={isLocked}
                    value={s.job_or_school}
                    onChange={e => updateSibling(idx, 'job_or_school', e.target.value)}
                    placeholder="Nghề nghiệp / Lớp đang học"
                    className="w-1/3 px-3 py-1.5 border border-purple-100 rounded-lg text-sm"
                  />
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => removeSibling(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa dòng"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {(!formData.siblings || formData.siblings.length === 0) && (
                <div className="text-xs text-slate-400 italic py-2 text-center bg-white/70 rounded-xl border border-dashed border-purple-200">
                  Chưa thêm anh/chị/em ruột nào. Bấm nút "+ Thêm người" nếu có.
                </div>
              )}
            </div>
          </div>

          {/* Thanh điều hướng nhanh cuối Bước 2 */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { setActiveStep(1); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>⬅ Quay lại Phần I</span>
            </button>
            <button
              type="button"
              onClick={() => handleNextStep(2)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-600/25 flex items-center gap-2 active:scale-95"
            >
              <span>Điền tiếp Phần III. Tính cách & Ý kiến</span>
              <span>➔</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================== BƯỚC 3: TÍNH CÁCH & Ý KIẾN ==================== */}
      {activeStep === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3 flex items-center gap-2 text-blue-900">
            <Heart className="w-5 h-5 text-blue-600" /> PHẦN III. THAM KHẢO Ý KIẾN PHỤ HUYNH HỌC SINH
          </h3>

          {/* 16 Checkboxes Tính cách */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              1. Đánh dấu [X] vào những ô phù hợp với tính cách của con:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {[
                { key: 'kien_nhan', label: 'Kiên nhẫn, chịu khó' },
                { key: 'le_phep', label: 'Lễ phép, chừng mực' },
                { key: 'huong_noi', label: 'Hướng nội' },
                { key: 'canh_tranh', label: 'Cạnh tranh, cầu toàn' },
                { key: 'hoa_dong', label: 'Hòa đồng, cởi mở' },
                { key: 'quan_tam', label: 'Quan tâm người khác' },
                { key: 'sang_tao', label: 'Sáng tạo, mơ mộng' },
                { key: 'noi_loan', label: 'Nổi loạn, chống đối' },
                { key: 'nong_tinh', label: 'Nóng tính' },
                { key: 'trung_thuc', label: 'Trung thực' },
                { key: 'thu_dong', label: 'Thụ động, thờ ơ' },
                { key: 'lanh_dao', label: 'Lãnh đạo, ảnh hưởng' },
                { key: 'nhay_cam', label: 'Nhạy cảm, rụt rè' },
                { key: 'huong_ngoai', label: 'Hướng ngoại' },
                { key: 'vo_tu', label: 'Vô tư, hài hước' }
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  disabled={isLocked}
                  onClick={() => updatePersonality(item.key as any)}
                  className={cn(
                    "p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all",
                    (formData.personalities as any)?.[item.key]
                      ? "border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center text-xs font-bold",
                    (formData.personalities as any)?.[item.key]
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300"
                  )}>
                    {(formData.personalities as any)?.[item.key] ? "✓" : ""}
                  </div>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mục Khác (Tự nhập) */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tính cách / Đặc điểm khác của con (Phụ huynh tự nhập nếu có):
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.personalities?.other_traits || ''}
                onChange={e => setFormData(prev => ({
                  ...prev,
                  personalities: {
                    ...prev.personalities,
                    other_traits: e.target.value
                  }
                }))}
                placeholder="VD: Rất đam mê vẽ tranh, ham học hỏi nhưng đôi lúc còn nhút nhát..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Hoàn cảnh đặc biệt */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Hoàn cảnh đặc biệt của gia đình có thể ảnh hưởng đến việc học tập của HS (nếu có):
            </label>
            <textarea
              rows={3}
              maxLength={250}
              disabled={isLocked}
              value={formData.special_family_circumstances || ''}
              onChange={e => updateField('special_family_circumstances', e.target.value)}
              placeholder="Gia đình nề nếp, cha mẹ luôn phối hợp chặt chẽ với nhà trường..."
              className="w-full p-3 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Các trường mở rộng do GVCN tạo nếu có */}
          {teacherCustomFields.length > 0 && (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
              <div className="font-bold text-xs uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> CÂU HỎI BỔ SUNG TỪ GIÁO VIÊN CHỦ NHIỆM
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {teacherCustomFields.map(tcf => (
                  <div key={tcf.id}>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {tcf.field_label} {tcf.is_required && <span className="text-rose-500">*</span>}
                    </label>
                    {tcf.field_type === 'select' ? (
                      <select
                        disabled={isLocked}
                        value={formData.custom_fields?.[tcf.field_key] || ''}
                        onChange={e => updateCustomField(tcf.field_key, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">-- Chọn --</option>
                        {(tcf.options || []).map((opt, oIdx) => (
                          <option key={oIdx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled={isLocked}
                        value={formData.custom_fields?.[tcf.field_key] || ''}
                        onChange={e => updateCustomField(tcf.field_key, e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Người liên lạc & Chữ ký */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">3. Khi cần, nhà trường sẽ liên lạc chính với: *</label>
              <select
                disabled={isLocked}
                value={formData.primary_contact_person}
                onChange={e => updateField('primary_contact_person', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold text-blue-900 bg-white"
              >
                <option value="father">Cha ({formData.father?.full_name || 'Họ tên cha'} - {formData.father?.phone_numbers})</option>
                <option value="mother">Mẹ ({formData.mother?.full_name || 'Họ tên mẹ'} - {formData.mother?.phone_numbers})</option>
                <option value="guardian">Người giám hộ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên người khai / Phụ huynh ký tên *</label>
              <input
                type="text"
                disabled={isLocked}
                value={formData.parent_signature_name}
                onChange={e => updateField('parent_signature_name', e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold bg-white"
              />
            </div>
          </div>

          {/* Thanh điều hướng và nút nộp cuối Bước 3 */}
          <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => { setActiveStep(2); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>⬅ Quay lại Phần II</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSave('draft')}
                disabled={saving || isLocked}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Save className="w-4 h-4" /> Lưu bản nháp
              </button>

              {!isLocked && (
                <button
                  type="button"
                  onClick={() => handleSave('submitted')}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>HOÀN TẤT & NỘP CHO GVCN</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
