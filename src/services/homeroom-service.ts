import { supabase } from '@/lib/supabase';
import {
  HomeroomClassSettings,
  HomeroomEvent,
  HomeroomIntervention,
  HomeroomPlan,
  HomeroomParentContact,
  ParentStudentOverview,
  ClassStructure,
  SeatingChartConfig
} from '@/types/homeroom';
import { Student } from '@/types/models';
import { transformDbToStudent } from '@/utils/transformers';

/**
 * Lấy cấu hình lớp, sơ đồ chỗ ngồi, ban cán sự và mã PIN của lớp
 */
export async function getHomeroomClassSettings(classId: string): Promise<HomeroomClassSettings> {
  const defaultSettings: HomeroomClassSettings = {
    class_id: classId,
    pin_code: '123456',
    seating_chart: {
      rows: 5,
      cols: 2,
      seats_per_desk: 2,
      seats: {}
    },
    class_structure: {
      groups: [
        { id: 'group_1', name: 'Tổ 1', member_ids: [] },
        { id: 'group_2', name: 'Tổ 2', member_ids: [] },
        { id: 'group_3', name: 'Tổ 3', member_ids: [] },
        { id: 'group_4', name: 'Tổ 4', member_ids: [] },
      ]
    },
    announcement: '',
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('homeroom_class_settings')
      .select('*')
      .eq('class_id', classId)
      .maybeSingle();

    if (error || !data) {
      return defaultSettings;
    }

    return {
      class_id: data.class_id,
      pin_code: data.pin_code || '123456',
      seating_chart: data.seating_chart || defaultSettings.seating_chart,
      class_structure: data.class_structure || defaultSettings.class_structure,
      announcement: data.announcement || '',
      updated_at: data.updated_at || new Date().toISOString()
    };
  } catch (err) {
    console.error('Error fetching homeroom class settings:', err);
    return defaultSettings;
  }
}

/**
 * Lưu cấu hình lớp, sơ đồ chỗ ngồi, ban cán sự
 */
export async function saveHomeroomClassSettings(settings: Partial<HomeroomClassSettings> & { class_id: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('homeroom_class_settings')
      .upsert({
        class_id: settings.class_id,
        pin_code: settings.pin_code || '123456',
        seating_chart: settings.seating_chart,
        class_structure: settings.class_structure,
        announcement: settings.announcement,
        updated_at: new Date().toISOString()
      }, { onConflict: 'class_id' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error saving homeroom settings:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Lấy dữ liệu Tổng quan Dashboard lớp cho GVCN
 */
export async function getHomeroomDashboardData(classId: string, targetDate: string) {
  try {
    // 1. Lấy danh sách học sinh lớp
    const { data: studentClasses } = await supabase
      .from('student_classes')
      .select('student_id, students(*)')
      .eq('class_id', classId);

    const students: Student[] = (studentClasses || [])
      .map((sc: any) => sc.students)
      .filter(Boolean);

    const totalStudents = students.length;

    // 2. Lấy điểm danh hôm nay từ attendance_records_v3
    const { data: attendanceToday } = await supabase
      .from('attendance_records_v3')
      .select('*')
      .eq('class_id', classId)
      .eq('date', targetDate);

    let presentCount = 0;
    let lateCount = 0;
    let excusedAbsenceCount = 0;
    let unexcusedAbsenceCount = 0;

    const studentAttendanceMap = new Map<string, any>();
    (attendanceToday || []).forEach(record => {
      studentAttendanceMap.set(record.student_id, record);
      if (record.status === 'present') presentCount++;
      else if (record.status === 'late') lateCount++;
      else if (record.status === 'excused_absence' || record.status === 'p') excusedAbsenceCount++;
      else if (record.status === 'unexcused_absence' || record.status === 'kp') unexcusedAbsenceCount++;
    });

    // Nếu chưa điểm danh toàn bộ, tính số còn lại là chưa điểm danh / tạm coi là có mặt
    if ((attendanceToday || []).length === 0) {
      presentCount = totalStudents;
    }

    // 3. Lấy sự việc cần theo dõi (open/monitoring/urgent)
    const { data: attentionEvents } = await supabase
      .from('homeroom_events')
      .select('*')
      .eq('class_id', classId)
      .in('status', ['open', 'monitoring'])
      .order('date', { ascending: false })
      .limit(10);

    // 4. Lấy sự việc tích cực / tiến bộ gần nhất
    const { data: positiveEvents } = await supabase
      .from('homeroom_events')
      .select('*')
      .eq('class_id', classId)
      .eq('type', 'positive')
      .order('date', { ascending: false })
      .limit(6);

    // 5. Lấy kế hoạch tuần gần nhất
    const { data: currentWeeklyPlan } = await supabase
      .from('homeroom_plans')
      .select('*')
      .eq('class_id', classId)
      .eq('plan_type', 'weekly')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      totalStudents,
      presentCount,
      lateCount,
      excusedAbsenceCount,
      unexcusedAbsenceCount,
      attentionEvents: attentionEvents || [],
      positiveEvents: positiveEvents || [],
      weeklyPlan: currentWeeklyPlan || null,
      students
    };
  } catch (err) {
    console.error('Error fetching homeroom dashboard data:', err);
    return {
      totalStudents: 0,
      presentCount: 0,
      lateCount: 0,
      excusedAbsenceCount: 0,
      unexcusedAbsenceCount: 0,
      attentionEvents: [],
      positiveEvents: [],
      weeklyPlan: null,
      students: []
    };
  }
}

/**
 * Lấy danh sách sự việc / nề nếp / tiến bộ
 */
export async function getHomeroomEvents(classId: string, filters?: {
  studentId?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<HomeroomEvent[]> {
  try {
    let query = supabase
      .from('homeroom_events')
      .select('*')
      .eq('class_id', classId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.studentId) query = query.eq('student_id', filters.studentId);
    if (filters?.type && filters.type !== 'all') query = query.eq('type', filters.type);
    if (filters?.status && filters.status !== 'all') query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('date', filters.startDate);
    if (filters?.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HomeroomEvent[];
  } catch (err) {
    console.error('Error fetching homeroom events:', err);
    return [];
  }
}

/**
 * Thêm mới sự việc / ghi nhận nề nếp
 */
export async function createHomeroomEvent(event: Omit<HomeroomEvent, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: HomeroomEvent; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('homeroom_events')
      .insert([{
        class_id: event.class_id,
        student_id: event.student_id,
        date: event.date,
        type: event.type,
        category: event.category,
        severity: event.severity || 'info',
        points_delta: event.points_delta || 0,
        description: event.description,
        source: event.source || 'gvcn',
        action_taken: event.action_taken || '',
        result: event.result || '',
        follow_up_date: event.follow_up_date || null,
        status: event.status || 'open',
        is_visible_to_parent: event.is_visible_to_parent !== false,
        created_by: event.created_by || 'system'
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as HomeroomEvent };
  } catch (err: any) {
    console.error('Error creating homeroom event:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Cập nhật sự việc
 */
export async function updateHomeroomEvent(id: string, updates: Partial<HomeroomEvent>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('homeroom_events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating homeroom event:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Xóa sự việc
 */
export async function deleteHomeroomEvent(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('homeroom_events')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting homeroom event:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Lấy Hồ sơ giáo dục cá nhân & Timeline của 1 học sinh
 */
export async function getStudentEducationalProfile(studentId: string, classId: string) {
  try {
    // 1. Học sinh info
    const { data: student } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    // 2. Điểm danh statuses & records từ bảng attendance thực tế của trường
    const [{ data: statuses }, { data: attendanceRecords }] = await Promise.all([
      supabase.from('attendance_statuses').select('*'),
      supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
    ]);

    const statusMap = new Map((statuses || []).map(s => [s.id, s]));

    let pCount = 0;
    let kCount = 0;
    let tCount = 0;
    let vpCount = 0;
    let khCount = 0;
    let vCount = 0;

    const history: any[] = [];

    (attendanceRecords || []).forEach(r => {
      const st = statusMap.get(r.status_id);
      const code = st?.code || '';
      if (code === 'P') pCount++;
      else if (code === 'K') kCount++;
      else if (code === 'T') tCount++;
      else if (code === 'VP') vpCount++;
      else if (code === 'KH') khCount++;
      else vCount++;

      // Đếm thêm ghi chú vi phạm / khen thưởng nếu có
      if (r.violation_notes && Object.keys(r.violation_notes).length > 0 && code !== 'VP') {
        vpCount += Object.keys(r.violation_notes).length;
      }
      if (r.reward_notes && Object.keys(r.reward_notes).length > 0 && code !== 'KH') {
        khCount += Object.keys(r.reward_notes).length;
      }

      history.push({
        id: r.id,
        date: r.date,
        session: r.session === 'morning' ? 'Buổi sáng' : r.session === 'afternoon' ? 'Buổi chiều' : (r.session || 'Cả ngày'),
        period: r.period ? `Tiết ${r.period}` : '',
        statusCode: code || 'V',
        statusLabel: st?.label || 'Vắng',
        color: st?.color || '#64748b',
        note: r.note || ''
      });
    });

    // 3. Sự việc & Tiến bộ
    const { data: events } = await supabase
      .from('homeroom_events')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    // Cộng thêm sự việc vào VP / KH nếu có
    (events || []).forEach((e: any) => {
      if (e.category === 'violation' || e.type === 'violation') vpCount++;
      else if (e.category === 'reward' || e.type === 'praise') khCount++;
    });

    // Tính tỷ lệ chuyên cần (%)
    const penalty = kCount * 3 + pCount * 1 + tCount * 0.5;
    const attendanceRate = Math.max(0, Math.min(100, Math.round(100 - penalty)));

    // 4. Kế hoạch can thiệp
    const { data: interventions } = await supabase
      .from('homeroom_interventions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    // 5. Nhật ký phụ huynh
    const { data: parentContacts } = await supabase
      .from('homeroom_parent_contacts')
      .select('*')
      .eq('student_id', studentId)
      .order('contact_date', { ascending: false });

    return {
      student,
      attendanceStats: {
        totalDays: (attendanceRecords || []).length,
        presentCount: (attendanceRecords || []).length,
        lateCount: tCount,
        excusedAbsenceCount: pCount,
        unexcusedAbsenceCount: kCount,
        p_count: pCount,
        k_count: kCount,
        t_count: tCount,
        vp_count: vpCount,
        kh_count: khCount,
        v_count: vCount,
        attendanceRate,
        history
      },
      events: (events || []) as HomeroomEvent[],
      interventions: (interventions || []) as HomeroomIntervention[],
      parentContacts: (parentContacts || []) as HomeroomParentContact[]
    };
  } catch (err) {
    console.error('Error fetching student educational profile:', err);
    return null;
  }
}

/**
 * Lấy danh sách kế hoạch can thiệp
 */
export async function getHomeroomInterventions(classId: string, studentId?: string): Promise<HomeroomIntervention[]> {
  try {
    let query = supabase
      .from('homeroom_interventions')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HomeroomIntervention[];
  } catch (err) {
    console.error('Error fetching interventions:', err);
    return [];
  }
}

/**
 * Tạo hoặc cập nhật kế hoạch can thiệp
 */
export async function saveHomeroomIntervention(intervention: Partial<HomeroomIntervention> & { class_id: string; student_id: string; problem: string; goal: string }): Promise<{ success: boolean; error?: string }> {
  try {
    if (intervention.id) {
      const { error } = await supabase
        .from('homeroom_interventions')
        .update({
          problem: intervention.problem,
          goal: intervention.goal,
          measures: intervention.measures || [],
          coordinated_with: intervention.coordinated_with || [],
          start_date: intervention.start_date || new Date().toISOString().split('T')[0],
          review_date: intervention.review_date,
          result: intervention.result,
          status: intervention.status || 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', intervention.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('homeroom_interventions')
        .insert([{
          class_id: intervention.class_id,
          student_id: intervention.student_id,
          problem: intervention.problem,
          goal: intervention.goal,
          measures: intervention.measures || [],
          coordinated_with: intervention.coordinated_with || [],
          start_date: intervention.start_date || new Date().toISOString().split('T')[0],
          review_date: intervention.review_date,
          result: intervention.result || '',
          status: intervention.status || 'in_progress',
          created_by: intervention.created_by || 'system'
        }]);
      if (error) throw error;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving intervention:', err);
    return { success: false, error: err.message };
  }
}

export const createHomeroomIntervention = saveHomeroomIntervention;

/**
 * Lấy kế hoạch tuần / tháng / năm của lớp
 */
export async function getHomeroomPlans(classId: string, academicYear: string, planType?: string): Promise<HomeroomPlan[]> {
  try {
    let query = supabase
      .from('homeroom_plans')
      .select('*')
      .eq('class_id', classId)
      .eq('academic_year', academicYear);

    if (planType && planType !== 'all') {
      query = query.eq('plan_type', planType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as HomeroomPlan[];
  } catch (err) {
    console.error('Error fetching homeroom plans:', err);
    return [];
  }
}

/**
 * Lưu kế hoạch tuần / năm
 */
export async function saveHomeroomPlan(plan: {
  id?: string;
  class_id: string;
  academic_year: string;
  plan_type: string;
  period_key: string;
  title?: string;
  content: any;
  created_by?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('homeroom_plans')
      .upsert({
        ...(plan.id ? { id: plan.id } : {}),
        class_id: plan.class_id,
        academic_year: plan.academic_year,
        plan_type: plan.plan_type,
        period_key: plan.period_key,
        title: plan.title || '',
        content: plan.content,
        created_by: plan.created_by || 'system',
        updated_at: new Date().toISOString()
      }, { onConflict: 'class_id, academic_year, plan_type, period_key' });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error saving plan:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Lấy danh sách liên hệ phụ huynh
 */
export async function getHomeroomParentContacts(classId: string, studentId?: string): Promise<HomeroomParentContact[]> {
  try {
    let query = supabase
      .from('homeroom_parent_contacts')
      .select('*')
      .eq('class_id', classId)
      .order('contact_date', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as HomeroomParentContact[];
  } catch (err) {
    console.error('Error fetching parent contacts:', err);
    return [];
  }
}

/**
 * Tạo ghi nhận liên hệ phụ huynh / phản hồi GVBM
 */
export async function createHomeroomParentContact(contact: Omit<HomeroomParentContact, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('homeroom_parent_contacts')
      .insert([{
        class_id: contact.class_id,
        student_id: contact.student_id,
        contact_type: contact.contact_type,
        contact_date: contact.contact_date,
        title: contact.title || '',
        content: contact.content,
        parent_feedback: contact.parent_feedback || '',
        status: contact.status || 'resolved',
        created_by: contact.created_by || 'system'
      }]);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error creating parent contact:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Xác thực Phụ huynh tra cứu Cổng Tra cứu Phụ huynh (/portal)
 * Yêu cầu:
 * - Chọn Lớp (class_id)
 * - Nhập Số CCCD / Mã định danh HS (code hoặc cccd trong bảng students)
 * - Nhập Mã PIN lớp (do GVCN đặt)
 */
export async function verifyParentPortalAccess(
  classId: string,
  studentIdentifier: string, // Mã học sinh, Mã định danh Bộ hoặc CCCD
  pinCode: string
): Promise<{ success: boolean; student?: Student; error?: string }> {
  try {
    // 1. Kiểm tra PIN lớp
    const settings = await getHomeroomClassSettings(classId);
    if ((settings.pin_code || '123456').trim() !== pinCode.trim()) {
      return { success: false, error: 'Mã PIN của lớp không chính xác. Vui lòng liên hệ GVCN.' };
    }

    // 2. Tìm học sinh trong lớp theo Mã định danh / CCCD / Mã học sinh
    const cleanId = studentIdentifier.trim().toLowerCase();

    // Query từ bảng quan hệ student_classes
    const { data: studentClasses } = await supabase
      .from('student_classes')
      .select('student_id, students(*)')
      .eq('class_id', classId);

    let matchedStudent: any = null;

    if (studentClasses && studentClasses.length > 0) {
      const found = studentClasses.find((sc: any) => {
        const s = sc.students;
        if (!s) return false;
        const govIdMatch = (s.gov_id || '').toLowerCase().trim() === cleanId;
        const studentCodeMatch = (s.student_code || '').toLowerCase().trim() === cleanId;
        const firebaseIdMatch = (s.firebase_id || '').toLowerCase().trim() === cleanId;
        const codeMatch = (s.code || '').toLowerCase().trim() === cleanId;
        const cccdMatch = (s.cccd || '').toLowerCase().trim() === cleanId;
        const parentCccdMatch = (s.parent_cccd || '').toLowerCase().trim() === cleanId;
        const phoneMatch = (s.parent_phone || '').toLowerCase().trim() === cleanId;
        const uuidMatch = (s.id || '').toLowerCase().trim() === cleanId;
        return govIdMatch || studentCodeMatch || firebaseIdMatch || codeMatch || cccdMatch || parentCccdMatch || phoneMatch || uuidMatch;
      });
      if (found) matchedStudent = found.students;
    }

    // Fallback: Query trực tiếp từ view v_student_list nếu chưa tìm thấy
    if (!matchedStudent) {
      const { data: viewStudents } = await supabase
        .from('v_student_list' as any)
        .select('*')
        .eq('class_id', classId);

      if (viewStudents && viewStudents.length > 0) {
        matchedStudent = viewStudents.find((s: any) => {
          const govIdMatch = (s.gov_id || '').toLowerCase().trim() === cleanId;
          const studentCodeMatch = (s.student_code || '').toLowerCase().trim() === cleanId;
          const firebaseIdMatch = (s.firebase_id || '').toLowerCase().trim() === cleanId;
          const codeMatch = (s.code || '').toLowerCase().trim() === cleanId;
          const cccdMatch = (s.cccd || '').toLowerCase().trim() === cleanId;
          const uuidMatch = (s.id || '').toLowerCase().trim() === cleanId;
          return govIdMatch || studentCodeMatch || firebaseIdMatch || codeMatch || cccdMatch || uuidMatch;
        });
      }
    }

    if (!matchedStudent) {
      return {
        success: false,
        error: 'Không tìm thấy học sinh với thông tin tra cứu trên. Vui lòng kiểm tra lại Mã học sinh, Mã định danh hoặc CCCD.'
      };
    }

    return {
      success: true,
      student: transformDbToStudent(matchedStudent)
    };
  } catch (err: any) {
    console.error('Error verifying parent portal access:', err);
    return { success: false, error: err.message };
  }
}

import { getSharedColumnsForClass } from '@/services/column-service';
import { getSchoolBankInfo, getUserBankInfo } from '@/services/user-service';

/**
 * Lấy dữ liệu đầy đủ cho màn hình Cổng Phụ huynh (bao gồm Chuyên cần, Nề nếp, Sổ theo dõi chia sẻ & Mã VietQR)
 */
export async function getParentStudentOverview(studentId: string, classId: string): Promise<ParentStudentOverview | null> {
  try {
    const profile = await getStudentEducationalProfile(studentId, classId);
    if (!profile || !profile.student) return null;

    const settings = await getHomeroomClassSettings(classId);

    // Lấy tên lớp và GVCN
    const { data: classData } = await supabase
      .from('classes')
      .select('name, teacher_classes(is_homeroom, profiles(full_name))')
      .eq('id', classId)
      .maybeSingle();

    const homeroomTc: any = (classData?.teacher_classes || []).find((tc: any) => tc.is_homeroom);
    const homeroomTeacherName = Array.isArray(homeroomTc?.profiles)
      ? homeroomTc.profiles[0]?.full_name
      : homeroomTc?.profiles?.full_name;

    // Lấy thời khóa biểu
    const { data: timetable } = await supabase
      .from('timetables')
      .select('*')
      .eq('class_id', classId)
      .eq('is_active', true)
      .maybeSingle();

    // Lọc sự kiện cho phụ huynh xem (chỉ lấy is_visible_to_parent = true)
    const parentVisibleEvents = profile.events.filter(e => e.is_visible_to_parent !== false);

    // Lấy Sổ Theo Dõi được chia sẻ (is_shared_with_parents = true)
    const sharedCols = await getSharedColumnsForClass(classId);
    const schoolBank = await getSchoolBankInfo();
    const stCode = (profile.student.code || (profile.student as any).student_code || '').trim();

    const sharedMonitorItems: any[] = [];

    for (const col of sharedCols) {
      // Query column records của học sinh này
      const { data: colRecords } = await supabase
        .from('column_records')
        .select('*')
        .eq('column_id', col.id)
        .eq('student_code', stCode);

      const recordMap: Record<string, any> = {};

      if (col.frequency === 'period') {
        (colRecords || []).forEach((r: any) => {
          if (r.period_key) {
            recordMap[r.period_key] = {
              completed: r.status === 'completed' || !!r.completed_at || !!r.value,
              value: r.value,
              note: r.note,
              updatedAt: r.updated_at
            };
          }
        });
      } else if (col.frequency === 'one_time') {
        const r: any = (colRecords || [])[0];
        if (r) {
          recordMap['one_time'] = {
            completed: r.status === 'completed' || !!r.completed_at || r.value === true || (typeof r.value === 'string' && r.value.trim() !== ''),
            value: r.value,
            note: r.note,
            updatedAt: r.updated_at
          };
        }
      }

      // Xác định STK ngân hàng thụ hưởng (Trường / Giáo viên / Tùy chỉnh)
      let resolvedBank: any = schoolBank;
      if (col.paymentConfig?.recipientType === 'teacher' && col.userId) {
        const teacherBank = await getUserBankInfo(col.userId);
        if (teacherBank && teacherBank.accountNumber) {
          resolvedBank = teacherBank;
        }
      } else if (col.paymentConfig?.recipientType === 'custom' && col.paymentConfig.customBankInfo) {
        resolvedBank = col.paymentConfig.customBankInfo;
      }

      sharedMonitorItems.push({
        column: col,
        records: recordMap,
        bankInfo: resolvedBank || undefined
      });
    }

    return {
      student: {
        id: profile.student.id,
        code: stCode,
        full_name: profile.student.full_name || (profile.student as any).name,
        birthday: profile.student.birthday,
        gender: profile.student.gender,
        class_name: classData?.name || classId,
        class_id: classId,
        homeroom_teacher_name: homeroomTeacherName || 'Giáo viên chủ nhiệm'
      },
      attendance: {
        p_count: profile.attendanceStats.p_count,
        k_count: profile.attendanceStats.k_count,
        t_count: profile.attendanceStats.t_count,
        vp_count: profile.attendanceStats.vp_count,
        kh_count: profile.attendanceStats.kh_count,
        v_count: profile.attendanceStats.v_count,
        attendance_rate: profile.attendanceStats.attendanceRate,
        history: profile.attendanceStats.history,
        total_school_days: profile.attendanceStats.totalDays,
        present_days: profile.attendanceStats.presentCount,
        excused_absences: profile.attendanceStats.excusedAbsenceCount,
        unexcused_absences: profile.attendanceStats.unexcusedAbsenceCount,
        late_days: profile.attendanceStats.lateCount
      },
      events: parentVisibleEvents,
      sharedMonitorColumns: sharedMonitorItems,
      announcement: settings.announcement || '',
      timetable: timetable ? timetable.schedule : null
    };
  } catch (err) {
    console.error('Error fetching parent student overview:', err);
    return null;
  }
}
