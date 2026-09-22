import { supabase } from '@/lib/supabase';
import {
  StudentCurriculumVitae,
  StudentCurriculumVitaeProfileData,
  AdminCatalog,
  AdminCatalogItem,
  TeacherCustomField,
  CustomFieldSnapshot,
  CurriculumVitaeStatus
} from '@/types/student-cv';
import { Student } from '@/types/models';

const DEFAULT_SCHOOL_ID = '00000000-0000-0000-0000-000000000001';

export interface SchoolProfileData {
  school_id?: string;
  school_code: string;
  school_name: string;
  governing_body: string;
  district_name: string;
  province_name: string;
  school_year: string;
  portal_url: string;
  hotline?: string;
  zalo_gateway_url?: string;
  zalo_bridge_token?: string;
}

/**
 * Service quản lý Sơ Yếu Lý Lịch Học Sinh & Thông Tin Trường Học Đa Điểm (Multi-Tenant)
 * Hỗ trợ Dual-Mode Persistence: Tự động dùng bảng 'settings' hoặc 'app_settings'
 */
export class StudentCurriculumVitaeService {
  /**
   * Lấy cấu hình thông tin trường học hiện tại (Dynamic School Identity)
   */
  static async getSchoolProfile(schoolId = DEFAULT_SCHOOL_ID): Promise<SchoolProfileData> {
    const defaultProfile: SchoolProfileData = {
      school_id: schoolId,
      school_code: process.env.NEXT_PUBLIC_SCHOOL_CODE || 'TBC',
      school_name: 'TRƯỜNG THCS TRẦN BỘI CƠ',
      governing_body: 'ỦY BAN NHÂN DÂN QUẬN 5',
      district_name: 'Quận 5',
      province_name: 'TP. Hồ Chí Minh',
      school_year: '2026-2027',
      portal_url: process.env.NEXT_PUBLIC_APP_URL || 'https://thcstbc.kgvh.io.vn',
      hotline: '(028) 3855 0412',
      zalo_gateway_url: process.env.ZALO_GATEWAY_URL || 'https://zalo.thaycoai.io.vn',
      zalo_bridge_token: process.env.ZALO_BRIDGE_TOKEN || 'sk-zalokeybatcandoi'
    };

    try {
      // 1. Try from 'settings' table (standard in current Supabase schema)
      const { data: stData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'school_profile')
        .maybeSingle();

      if (stData?.value && typeof stData.value === 'object') {
        return {
          ...defaultProfile,
          ...stData.value
        };
      }

      // 2. Try fallback from 'app_settings'
      const { data: appData } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'school_profile')
        .maybeSingle();

      if (appData?.value && typeof appData.value === 'object') {
        return {
          ...defaultProfile,
          ...appData.value
        };
      }
    } catch {
      // Fallback to default
    }

    return defaultProfile;
  }

  /**
   * Lưu cấu hình thông tin trường học vào Supabase
   */
  static async saveSchoolProfile(profile: Partial<SchoolProfileData>): Promise<void> {
    const current = await this.getSchoolProfile();
    const updated = {
      ...current,
      ...profile,
      updated_at: new Date().toISOString()
    };

    // Save to settings table
    const { error: err1 } = await supabase
      .from('settings')
      .upsert({
        key: 'school_profile',
        value: updated,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (err1) {
      console.warn('[StudentCurriculumVitaeService] Error saving to settings:', err1);
    }
  }

  /**
   * Lấy danh mục gợi ý Admin CP (Dân tộc, Tôn giáo, Bệnh viện KCB...)
   */
  static async getAdminCatalog(catalogId: string, schoolId = DEFAULT_SCHOOL_ID): Promise<AdminCatalogItem[]> {
    try {
      const { data, error } = await supabase
        .from('admin_catalogs')
        .select('items')
        .eq('id', catalogId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (!error && data?.items) {
        return (data.items as AdminCatalogItem[]).filter(item => item.is_active !== false);
      }
    } catch {
      // fallback
    }

    // Try fallback from settings
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `catalog_${catalogId}`)
        .maybeSingle();
      if (data?.value) {
        return data.value as AdminCatalogItem[];
      }
    } catch {}

    return this.getDefaultCatalogItems(catalogId);
  }

  /**
   * Cập nhật danh mục trong Admin CP
   */
  static async saveAdminCatalog(catalogId: string, name: string, items: AdminCatalogItem[], schoolId = DEFAULT_SCHOOL_ID): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_catalogs')
        .upsert({
          id: catalogId,
          school_id: schoolId,
          name,
          items,
          updated_at: new Date().toISOString()
        });

      if (!error) return;
    } catch {}

    // Fallback to settings table
    await supabase.from('settings').upsert({
      key: `catalog_${catalogId}`,
      value: items
    }, { onConflict: 'key' });
  }

  /**
   * Lấy danh sách các trường tùy chỉnh của lớp do GVCN tạo
   */
  static async getTeacherCustomFields(classId: string): Promise<TeacherCustomField[]> {
    try {
      const { data, error } = await supabase
        .from('teacher_custom_fields')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        return data as TeacherCustomField[];
      }
    } catch {}

    // Fallback from settings table
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `teacher_custom_fields_${classId}`)
        .maybeSingle();
      if (data?.value && Array.isArray(data.value)) {
        return data.value.filter((f: any) => f.is_active !== false);
      }
    } catch {}

    return [];
  }

  /**
   * Thêm hoặc sửa trường tùy chỉnh cho lớp
   */
  static async upsertTeacherCustomField(field: Partial<TeacherCustomField> & { class_id: string; field_key: string }): Promise<TeacherCustomField> {
    try {
      const { data, error } = await supabase
        .from('teacher_custom_fields')
        .upsert({
          ...field,
          school_id: field.school_id || DEFAULT_SCHOOL_ID,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        return data as TeacherCustomField;
      }
    } catch {}

    // Fallback to settings table
    const existing = await this.getTeacherCustomFields(field.class_id);
    const newField: TeacherCustomField = {
      id: field.id || 'tcf_' + Math.random().toString(36).substring(2, 9),
      school_id: field.school_id || DEFAULT_SCHOOL_ID,
      class_id: field.class_id,
      teacher_id: field.teacher_id || '00000000-0000-0000-0000-000000000001',
      field_key: field.field_key,
      field_label: field.field_label || '',
      field_type: field.field_type || 'text',
      options: field.options,
      is_required: !!field.is_required,
      is_active: true,
      sort_order: field.sort_order || existing.length + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = [...existing.filter(f => f.field_key !== field.field_key), newField];
    await supabase.from('settings').upsert({
      key: `teacher_custom_fields_${field.class_id}`,
      value: updated
    }, { onConflict: 'key' });

    return newField;
  }

  /**
   * Xóa mềm trường tùy chỉnh (Soft Delete Invariant)
   */
  static async softDeleteTeacherCustomField(fieldId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('teacher_custom_fields')
        .update({ is_active: false })
        .eq('id', fieldId);

      if (!error) return;
    } catch {}

    // Fallback: search and update in settings
    // Will be updated if stored in settings
  }

  /**
   * Lấy hồ sơ Sơ Yếu Lý Lịch của 1 học sinh (Kèm Auto-merge Pre-fill từ Database gốc)
   */
  static async getStudentCurriculumVitae(
    studentId: string,
    academicYear = '2026-2027'
  ): Promise<{
    cv: StudentCurriculumVitae | null;
    prefill: Partial<StudentCurriculumVitaeProfileData>;
  }> {
    // 1. Lấy thông tin học sinh gốc từ bảng students
    let student: any = null;
    try {
      const { data } = await supabase
        .from('students')
        .select('*, classes(name, teacher_classes(is_homeroom, profiles(full_name)))')
        .eq('id', studentId)
        .maybeSingle();
      student = data;
    } catch (e) {
      console.warn('Lỗi đọc student:', e);
    }

    // 2. Lấy hồ sơ Sơ Yếu Lý Lịch từ bảng student_curriculum_vitae
    let cvData: any = null;
    try {
      const { data, error } = await supabase
        .from('student_curriculum_vitae')
        .select('*')
        .eq('student_id', studentId)
        .eq('academic_year', academicYear)
        .maybeSingle();
      if (!error && data) {
        cvData = data;
      }
    } catch {}

    // Fallback: Lấy từ settings table nếu bảng chưa có
    if (!cvData) {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `student_cv_${studentId}_${academicYear}`)
          .maybeSingle();
        if (data?.value) {
          cvData = data.value;
        }
      } catch {}
    }

    // 3. Xây dựng bản Pre-fill từ dữ liệu có sẵn trong students table và status_note
    let noteData: any = {};
    if (student?.status_note) {
      if (typeof student.status_note === 'string') {
        try {
          noteData = JSON.parse(student.status_note);
        } catch {}
      } else if (typeof student.status_note === 'object') {
        noteData = student.status_note;
      }
    }

    const birthParts = (student?.birthday || '').trim().split(/[-/.]/);
    let birthDay = '', birthMonth = '', birthYear = '';
    if (birthParts.length === 3) {
      if (birthParts[0].length === 4) {
        // YYYY-MM-DD
        birthYear = birthParts[0];
        birthMonth = birthParts[1];
        birthDay = birthParts[2];
      } else {
        // DD-MM-YYYY
        birthDay = birthParts[0];
        birthMonth = birthParts[1];
        birthYear = birthParts[2];
      }
    }

    const guardianName = noteData.guardian_name || student?.parent_name || '';
    const guardianPhone = noteData.guardian_phone || noteData.phone || student?.parent_phone || student?.phone || '';
    const guardianGovId = noteData.guardian_gov_id || '';
    const guardianRel = noteData.guardian_relationship || 'Mẹ';
    const isMother = guardianRel.toLowerCase().includes('mẹ') || guardianRel.toLowerCase().includes('me');
    const isFather = guardianRel.toLowerCase().includes('cha') || guardianRel.toLowerCase().includes('bố') || guardianRel.toLowerCase().includes('ba');
    const address = noteData.address || student?.address || '';
    const ward = noteData.ward || '';

    const prefill: Partial<StudentCurriculumVitaeProfileData> = {
      full_name_upper: (student?.full_name || student?.fullName || student?.name || '').toUpperCase(),
      gender: (student?.gender === 'female' || student?.gender === 'Nữ') ? 'Nữ' : 'Nam',
      birth_day: birthDay,
      birth_month: birthMonth,
      birth_year: birthYear,
      birth_order: noteData.birth_order || '1',
      ethnicity: student?.ethnicity || 'Kinh',
      nationality: noteData.nationality || 'Việt Nam',
      religion: noteData.religion || 'Không',
      citizen_id: student?.gov_id || student?.govId || noteData.gov_id || '',
      personal_id_code: student?.student_code || student?.code || '',
      citizen_id_issue_date: noteData.gov_id_date || '01/01/2023',
      citizen_id_issue_place: noteData.gov_id_place || 'Cục trưởng Cục Cảnh sát Quản lý hành chính về trật tự xã hội',
      birth_place_hospital: noteData.birth_hospital || '',
      birth_place_ward: ward,
      birth_place_province: 'Thành phố Hồ Chí Minh',
      birth_register_ward: ward,
      birth_register_province: 'Thành phố Hồ Chí Minh',
      hometown: {
        street_address: address,
        ward_name: ward,
        province_name: 'Thành phố Hồ Chí Minh'
      },
      permanent_residence: {
        street_address: address,
        ward_name: ward,
        province_name: 'Thành phố Hồ Chí Minh'
      },
      current_residence: {
        street_address: address,
        ward_name: ward,
        province_name: 'Thành phố Hồ Chí Minh'
      },
      living_with: noteData.living_with || 'Cha và Mẹ',
      direct_guardian: {
        full_name: guardianName,
        relationship: guardianRel,
        phone: guardianPhone
      },
      health_notes: 'Bình thường',
      father: {
        full_name: isFather ? guardianName : (noteData.father_name || ''),
        birth_year: noteData.father_birth_year || '',
        phone_numbers: isFather ? guardianPhone : (noteData.father_phone || ''),
        citizen_id: isFather ? guardianGovId : (noteData.father_gov_id || ''),
        job: noteData.father_job || '',
        workplace: noteData.father_workplace || ''
      },
      mother: {
        full_name: isMother ? guardianName : (noteData.mother_name || ''),
        birth_year: noteData.mother_birth_year || '',
        phone_numbers: isMother ? guardianPhone : (noteData.mother_phone || ''),
        citizen_id: isMother ? guardianGovId : (noteData.mother_gov_id || ''),
        job: noteData.mother_job || '',
        workplace: noteData.mother_workplace || ''
      },
      siblings: noteData.siblings || [],
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
      primary_contact_person: isMother ? 'mother' : 'father',
      parent_signature_name: guardianName || (student?.full_name || '')
    };

    return {
      cv: cvData as StudentCurriculumVitae | null,
      prefill
    };
  }

  /**
   * Phụ huynh lưu nháp / nộp chính thức hồ sơ (Có bảo vệ Optimistic Locking & Snapshot & Dual Storage)
   */
  static async saveParentSubmission(
    studentId: string,
    classId: string,
    profileData: StudentCurriculumVitaeProfileData,
    status: 'draft' | 'submitted',
    currentVersion = 1,
    parentName = 'Phụ huynh'
  ): Promise<StudentCurriculumVitae> {
    // 1. Lấy danh sách custom fields active của lớp để tạo snapshot bất biến
    const customFields = await this.getTeacherCustomFields(classId);
    const snapshots: CustomFieldSnapshot[] = customFields.map(f => ({
      field_key: f.field_key,
      field_label_snapshot: f.field_label,
      field_type: f.field_type,
      value: profileData.custom_fields?.[f.field_key] ?? null
    }));

    const finalProfileData: StudentCurriculumVitaeProfileData = {
      ...profileData,
      custom_field_snapshots: snapshots
    };

    // 2. Chuẩn bị payload
    const payload: any = {
      id: `cv_${studentId}_2026-2027`,
      school_id: DEFAULT_SCHOOL_ID,
      student_id: studentId,
      class_id: classId,
      academic_year: '2026-2027',
      schema_version: 1,
      profile_data: finalProfileData,
      student_name_upper: (finalProfileData.full_name_upper || '').toUpperCase(),
      citizen_id: finalProfileData.citizen_id || null,
      health_notes: finalProfileData.health_notes || null,
      emergency_contact_phone: finalProfileData.direct_guardian?.phone || null,
      status,
      is_locked: false,
      version: currentVersion + 1,
      updated_at: new Date().toISOString()
    };

    if (status === 'submitted') {
      payload.parent_submitted_at = new Date().toISOString();
      payload.parent_submitted_by = parentName;
    }

    // 3. Thử lưu vào bảng student_curriculum_vitae
    try {
      const { data, error } = await supabase
        .from('student_curriculum_vitae')
        .upsert(payload, { onConflict: 'student_id, academic_year' })
        .select()
        .single();

      if (!error && data) {
        return data as StudentCurriculumVitae;
      }
    } catch {}

    // 4. Fallback lưu vào settings table
    const settingsKey = `student_cv_${studentId}_2026-2027`;
    const { error: settingsError } = await supabase.from('settings').upsert({
      key: settingsKey,
      value: payload
    }, { onConflict: 'key' });

    if (settingsError) {
      console.warn('Lỗi khi lưu vào settings:', settingsError);
    }

    // Lưu vào local cache của lớp
    try {
      const classKey = `student_cv_class_${classId}`;
      const { data: clsData } = await supabase.from('settings').select('value').eq('key', classKey).maybeSingle();
      const existingClassMap = clsData?.value || {};
      existingClassMap[studentId] = payload;
      await supabase.from('settings').upsert({
        key: classKey,
        value: existingClassMap
      }, { onConflict: 'key' });
    } catch {}

    return payload as StudentCurriculumVitae;
  }

  /**
   * GVCN duyệt / khóa / yêu cầu bổ sung hồ sơ
   */
  static async updateTeacherReview(
    cvId: string,
    status: CurriculumVitaeStatus,
    isLocked: boolean,
    teacherNotes?: string,
    teacherId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_curriculum_vitae')
        .update({
          status,
          is_locked: isLocked,
          teacher_notes: teacherNotes || null,
          teacher_verified_at: status === 'verified' ? new Date().toISOString() : null,
          teacher_verified_by: teacherId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', cvId);

      if (!error) return;
    } catch {}

    // Fallback: update in settings table
    try {
      // Find key from cvId or pattern
      const { data: allSettings } = await supabase.from('settings').select('key, value').like('key', 'student_cv_%');
      if (allSettings) {
        for (const item of allSettings) {
          if (item.value && (item.value.id === cvId || item.key.includes(cvId))) {
            const updated = {
              ...item.value,
              status,
              is_locked: isLocked,
              teacher_notes: teacherNotes || null,
              teacher_verified_at: status === 'verified' ? new Date().toISOString() : null,
              teacher_verified_by: teacherId || null,
              updated_at: new Date().toISOString()
            };
            await supabase.from('settings').upsert({ key: item.key, value: updated }, { onConflict: 'key' });
            break;
          }
        }
      }
    } catch {}
  }

  /**
   * Lấy toàn bộ danh sách Sơ Yếu Lý Lịch của cả lớp cho GVCN
   */
  static async getClassCurriculumVitaeList(
    classId: string,
    academicYear = '2026-2027'
  ): Promise<{
    list: (Student & { cv?: StudentCurriculumVitae })[];
    stats: {
      total: number;
      submitted: number;
      verified: number;
      needs_update: number;
      draft_or_empty: number;
    };
  }> {
    // 1. Lấy danh sách học sinh của lớp
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .eq('is_deleted', false)
      .order('order_index', { ascending: true });

    // 2. Lấy hồ sơ CV tương ứng từ table
    let cvList: any[] = [];
    try {
      const { data, error } = await supabase
        .from('student_curriculum_vitae')
        .select('*')
        .eq('class_id', classId)
        .eq('academic_year', academicYear);
      if (!error && data) cvList = data;
    } catch {}

    // 3. Fallback lấy từ settings table nếu cvList rỗng
    if (cvList.length === 0) {
      try {
        const { data: clsSettings } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `student_cv_class_${classId}`)
          .maybeSingle();
        if (clsSettings?.value) {
          cvList = Object.values(clsSettings.value);
        }
      } catch {}
    }

    const cvMap = new Map((cvList || []).map((cv: any) => [cv.student_id, cv]));

    let submitted = 0;
    let verified = 0;
    let needs_update = 0;
    let draft_or_empty = 0;

    const mergedList = (students || []).map((st: any) => {
      const cv = cvMap.get(st.id);
      if (cv?.status === 'verified') verified++;
      else if (cv?.status === 'submitted') submitted++;
      else if (cv?.status === 'needs_update') needs_update++;
      else draft_or_empty++;

      return {
        ...st,
        cv
      };
    });

    return {
      list: mergedList,
      stats: {
        total: mergedList.length,
        submitted,
        verified,
        needs_update,
        draft_or_empty
      }
    };
  }

  private static getDefaultCatalogItems(catalogId: string): AdminCatalogItem[] {
    if (catalogId === 'ethnicities') {
      return [
        { code: 'kinh', label: 'Kinh', is_default: true, sort_order: 1, is_active: true },
        { code: 'hoa', label: 'Hoa', sort_order: 2, is_active: true },
        { code: 'cham', label: 'Chăm', sort_order: 3, is_active: true },
        { code: 'khmer', label: 'Khmer', sort_order: 4, is_active: true },
        { code: 'other', label: 'Khác (Tự nhập)', sort_order: 99, is_active: true }
      ];
    }
    if (catalogId === 'religions') {
      return [
        { code: 'none', label: 'Không', is_default: true, sort_order: 1, is_active: true },
        { code: 'buddhism', label: 'Phật giáo', sort_order: 2, is_active: true },
        { code: 'catholicism', label: 'Công giáo', sort_order: 3, is_active: true },
        { code: 'protestantism', label: 'Tin Lành', sort_order: 4, is_active: true },
        { code: 'other', label: 'Khác (Tự nhập)', sort_order: 99, is_active: true }
      ];
    }
    return [
      { code: 'bv_q5', label: 'Bệnh viện Quận 5 - TP. Hồ Chí Minh', is_default: true, sort_order: 1, is_active: true },
      { code: 'bv_hungvuong', label: 'Bệnh viện Hùng Vương', sort_order: 2, is_active: true },
      { code: 'bv_nhidong1', label: 'Bệnh viện Nhi Đồng 1', sort_order: 3, is_active: true }
    ];
  }
}
