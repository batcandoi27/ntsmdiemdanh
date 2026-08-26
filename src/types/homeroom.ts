// ============================================
// HOMEROOM MODULE TYPES (Phân hệ Giáo Viên Chủ Nhiệm)
// ============================================

import { Student, Column, BankInfo } from './models';

export type HomeroomEventType = 
  | 'positive'    // Ghi nhận tích cực, việc tốt, thành tích
  | 'violation'   // Vi phạm nề nếp, kỷ luật
  | 'attendance'  // Vấn đề chuyên cần, đi muộn, trốn tiết
  | 'academic'    // Học tập, bài tập, kiểm tra
  | 'behavior'    // Kỷ luật, tác phong, đồng phục, nề nếp
  | 'activity'    // Hoạt động đoàn đội, ngoại khóa, phong trào
  | 'other';      // Khác

export type HomeroomEventSeverity = 'minor' | 'medium' | 'serious' | 'info' | 'attention' | 'urgent';

export type HomeroomEventStatus = 'open' | 'monitoring' | 'resolved' | 'closed';

export type HomeroomEventSource = 'gvcn' | 'gvbm' | 'parent' | 'student' | 'cadre' | 'school';

export interface HomeroomEvent {
  id: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  date: string; // YYYY-MM-DD
  type: HomeroomEventType;
  category: string; // Đi muộn, Phát biểu tích cực, Nhặt được của rơi, Chưa làm bài tập...
  severity: HomeroomEventSeverity;
  points_delta: number; // Điểm cộng/trừ linh hoạt (vd: +3, -2, 0)
  description: string;
  source: HomeroomEventSource;
  action_taken?: string; // Biện pháp đã thực hiện của GVCN
  result?: string; // Kết quả theo dõi
  follow_up_date?: string; // YYYY-MM-DD
  status: HomeroomEventStatus;
  is_visible_to_parent: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------
// Kế hoạch Can thiệp & Hỗ trợ học sinh cá nhân
// --------------------------------------------
export type InterventionStatus = 'planned' | 'in_progress' | 'successful' | 'improved' | 'needs_revision';

export interface InterventionCoordination {
  type: 'parent' | 'gvbm' | 'school' | 'student';
  name: string;
  role?: string;
}

export interface HomeroomIntervention {
  id: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  problem?: string; // Vấn đề gặp phải
  issue_summary?: string;
  goal?: string; // Mục tiêu rèn luyện
  goals?: string;
  measures: string[] | string; // Các biện pháp áp dụng
  coordinated_with?: InterventionCoordination[]; // Phối hợp cùng ai
  parent_cooperation?: string;
  start_date: string; // YYYY-MM-DD
  review_date?: string; // YYYY-MM-DD
  result?: string; // Đánh giá kết quả
  status: InterventionStatus;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

// --------------------------------------------
// Sơ đồ chỗ ngồi & Cơ cấu lớp
// --------------------------------------------
export interface DeskSeat {
  seat_key: string;
  student_id: string | null;
  student_name?: string;
  student_code?: string;
  gender?: 'M' | 'F' | 'male' | 'female';
}

export interface SeatingChartConfig {
  rows: number; // Số dãy bàn (mặc định 4 hoặc 5)
  cols: number; // Số cột dãy (mặc định 2 hoặc 4)
  seats_per_desk: number; // 2 học sinh / bàn
  seats: Record<string, string>; // seat_key -> student_id
  notes?: string;
}

export type SeatingChart = SeatingChartConfig;

export interface ClassGroup {
  id: string;
  name: string; // Tổ 1, Tổ 2...
  leader_id?: string; // Tổ trưởng
  leader_name?: string;
  vice_id?: string; // Tổ phó
  vice_name?: string;
  member_ids: string[]; // Danh sách student_id
}

export interface ClassStructure {
  monitor_id?: string; // Lớp trưởng
  monitor_name?: string;
  vice_academic_id?: string; // Lớp phó học tập
  vice_academic_name?: string;
  vice_discipline_id?: string; // Lớp phó kỷ luật / trật tự
  vice_discipline_name?: string;
  vice_activity_id?: string; // Lớp phó phong trào / văn thể mỹ
  vice_activity_name?: string;
  treasurer_id?: string; // Thủ quỹ
  treasurer_name?: string;
  groups: ClassGroup[]; // Danh sách 4 tổ
}

export interface HomeroomClassSettings {
  class_id: string;
  pin_code: string; // Mã PIN 6 số cho phụ huynh tra cứu (mặc định '123456')
  seating_chart: SeatingChartConfig | any;
  classroom_layout?: any; // Seat Layout Editor ClassroomLayout
  class_structure: ClassStructure;
  announcement?: string; // Thông báo chung của GVCN gửi phụ huynh
  updated_at: string;
}

// --------------------------------------------
// Kế hoạch Tuần & Sổ Chủ Nhiệm Số
// --------------------------------------------
export type HomeroomPlanType = 'yearly' | 'monthly' | 'weekly';

export interface WeeklyChecklistItem {
  id: string;
  task: string;
  is_completed: boolean;
  note?: string;
}

export interface HomeroomPlan {
  id?: string;
  class_id: string;
  academic_year: string;
  plan_type: HomeroomPlanType | string;
  period_key?: string; // 'week_01', 'month_09', 'yearly'
  title?: string;
  content: {
    focus_points?: string[];
    measures?: string[] | string;
    checklist?: WeeklyChecklistItem[];
    tasks?: { id: string; text: string; done: boolean }[];
    strengths?: string;
    challenges?: string;
    targets?: {
      academic_good_percent?: number;
      conduct_good_percent?: number;
      competitions?: string;
    };
    notes?: string;
    review_summary?: string;
  };
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// --------------------------------------------
// Nhật ký Phối hợp Phụ huynh & Phản hồi GVBM
// --------------------------------------------
export type ParentContactType = 'call' | 'meeting' | 'zalo' | 'portal_feedback' | 'gvbm_note' | 'subject_teacher_feedback';

export interface HomeroomParentContact {
  id?: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  contact_type: ParentContactType;
  contact_date: string; // YYYY-MM-DD
  title?: string;
  content: string; // Nội dung trao đổi
  agreed_solution?: string;
  parent_feedback?: string; // Ý kiến / Cam kết của phụ huynh
  status: 'pending' | 'resolved' | 'completed';
  created_by?: string;
  created_at?: string;
}

// --------------------------------------------
// Hồ sơ giáo dục học sinh cá nhân
// --------------------------------------------
export interface StudentEducationalProfile {
  student: Student;
  attendanceStats: {
    totalDays: number;
    presentCount: number;
    lateCount: number;
    excusedCount: number;
    unexcusedCount: number;
    excusedAbsenceCount: number;
    unexcusedAbsenceCount: number;
    p_count?: number;
    k_count?: number;
    t_count?: number;
    vp_count?: number;
    kh_count?: number;
    v_count?: number;
    attendanceRate: number;
    history?: AttendanceHistoryItem[];
  };
  events: HomeroomEvent[];
  interventions: HomeroomIntervention[];
  parentContacts: HomeroomParentContact[];
}

// --------------------------------------------
// Cổng Tra cứu Phụ huynh (Parent Portal)
// --------------------------------------------
export interface ParentMonitorItem {
  column: Column;
  records: Record<string, { completed?: boolean; value?: any; note?: string; updatedAt?: string }>;
  bankInfo?: BankInfo;
}

export interface AttendanceHistoryItem {
  id?: string;
  date: string;
  session?: string;
  period?: string;
  statusCode: string; // P, K, T, VP, KH, V
  statusLabel: string;
  color?: string;
  note?: string;
}

export interface ParentStudentOverview {
  student: {
    id: string;
    code: string;
    full_name: string;
    birthday?: string;
    gender?: string;
    class_name: string;
    class_id: string;
    homeroom_teacher_name?: string;
  };
  attendance: {
    p_count: number; // PHÉP (P) - Vắng có phép
    k_count: number; // KHÔNG (K) - Vắng không phép
    t_count: number; // TRỄ (T) - Đi muộn
    vp_count: number; // VI PHẠM (VP) - Vi phạm
    kh_count: number; // KHEN THƯỞNG (KH) - Khen thưởng
    v_count: number; // Vắng khác
    attendance_rate: number; // % Tỷ lệ chuyên cần
    history?: AttendanceHistoryItem[];
    // Legacy fields for backward compatibility
    total_school_days?: number;
    present_days?: number;
    excused_absences?: number;
    unexcused_absences?: number;
    late_days?: number;
  };
  events: HomeroomEvent[];
  sharedMonitorColumns?: ParentMonitorItem[];
  announcement?: string;
  timetable?: any;
  leaveRequests?: LeaveRequest[];
  todayPulse?: {
    is_present_today: boolean;
    status_label: string;
    status_color: string;
    has_pending_leave: boolean;
    recent_praise?: string;
    action_required?: string;
  };
}

// --------------------------------------------
// Đơn Xin Nghỉ Phép Trực Tuyến (Leave Request)
// --------------------------------------------
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface LeaveRequest {
  id: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  student_code?: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  session?: 'morning' | 'afternoon' | 'all_day'; // Sáng / Chiều / Cả ngày
  reason: string;
  attachment_url?: string;
  parent_name?: string;
  parent_phone?: string;
  status: LeaveRequestStatus;
  gvcn_note?: string;
  created_at: string;
  updated_at?: string;
}

// --------------------------------------------
// Radar Cảnh Báo Sớm Học Sinh Nguy Cơ (Risk Radar)
// --------------------------------------------
export type RiskLevel = 'high' | 'medium' | 'low' | 'stable';

export interface RiskRadarStudent {
  student_id: string;
  student_name: string;
  student_code: string;
  gender?: string;
  risk_level: RiskLevel;
  risk_score: number; // 0 - 100
  factors: string[];  // ['3 buổi vắng không phép', '2 lần đi muộn', 'GVBM Toán phản ánh']
  trend: 'increasing' | 'decreasing' | 'stable';
  suggested_action: string;
  last_event_date?: string;
}

// --------------------------------------------
// Dòng Thời Gian Học Sinh 360 (Student 360 Event)
// --------------------------------------------
export type Student360Category = 
  | 'attendance' 
  | 'conduct' 
  | 'achievement' 
  | 'subject_teacher' 
  | 'parent_contact' 
  | 'leave_request';

export interface Student360Event {
  id: string;
  timestamp: string;
  date: string;
  category: Student360Category;
  title: string;
  description: string;
  badge_label: string;
  badge_color: string;
  icon_name: string;
  meta?: Record<string, any>;
}

// --------------------------------------------
// Kịch Bản & Biên Bản Sinh Hoạt Lớp Thứ 7
// --------------------------------------------
export interface WeeklyMeetingDraft {
  week_number: number;
  academic_year: string;
  class_id: string;
  class_name: string;
  teacher_name: string;
  date_range: string;
  summary: {
    total_students: number;
    attendance_rate: number;
    total_violations: number;
    total_achievements: number;
    excused_count: number;
    unexcused_count: number;
    late_count: number;
  };
  top_achieving_students: Array<{ name: string; reason: string }>;
  students_needing_attention: Array<{ name: string; reason: string }>;
  group_rankings: Array<{ group_name: string; score: number; rank: number }>;
  key_focus_next_week: string[];
  full_script_markdown: string;
  created_at: string;
}

// --------------------------------------------
// Phối Hợp Giáo Viên Bộ Môn (Subject Teacher Feedback)
// --------------------------------------------
export interface SubjectTeacherFeedback {
  id: string;
  class_id: string;
  subject_name: string;
  teacher_name: string;
  period_number: number;
  date: string;
  lesson_evaluation: 'good' | 'average' | 'poor';
  praised_students: Array<{ student_id: string; student_name: string; note: string }>;
  reminded_students: Array<{ student_id: string; student_name: string; note: string }>;
  general_comment?: string;
  status: 'unread' | 'acknowledged' | 'converted_to_event';
  created_at: string;
}

// --------------------------------------------
// Nhật Ký Nề Nếp Ban Cán Sự Lớp (Cadre Log Entry)
// --------------------------------------------
export type CadreRole = 
  | 'monitor' 
  | 'vice_monitor' 
  | 'group_leader_1' 
  | 'group_leader_2' 
  | 'group_leader_3' 
  | 'group_leader_4';

export interface CadreLogEntry {
  id: string;
  class_id: string;
  cadre_role: CadreRole;
  cadre_name: string;
  target_student_id: string;
  target_student_name: string;
  date: string;
  type: 'positive' | 'violation';
  category: string;
  description: string;
  points_delta: number;
  status: 'pending_review' | 'approved' | 'rejected';
  gvcn_review_note?: string;
  created_at: string;
}

// --------------------------------------------
// Đối Soát Thu Phí Tự Động (Payment Transaction Record)
// --------------------------------------------
export interface PaymentTransactionRecord {
  id: string;
  provider: 'sepay' | 'vietqr' | 'manual';
  provider_transaction_id: string; // Khóa Idempotency chống trùng
  class_id: string;
  student_id: string;
  column_id: string;
  period_key?: string;
  amount: number;
  transfer_content: string;
  transaction_time: string;
  status: 'success' | 'duplicate_ignored' | 'unmatched';
  created_at: string;
}

// --------------------------------------------
// PHASE 3: BÁO CÁO TỔNG HỢP THÁNG & ĐỀ XUẤT CAN THIỆP CÁ NHÂN HÓA
// --------------------------------------------
export interface MonthlySynthesisStudentGroup {
  group_type: 'praise' | 'attendance_warning' | 'discipline_intervention' | 'stable';
  group_name: string;
  students: {
    student_id: string;
    student_name: string;
    reason: string;
    points_delta?: number;
    absent_count?: number;
    violation_count?: number;
  }[];
}

export interface MonthlySynthesisReport {
  class_id: string;
  month_year: string; // YYYY-MM
  total_students: number;
  attendance_rate: number;
  total_positive_events: number;
  total_violations: number;
  student_groups: MonthlySynthesisStudentGroup[];
  recommended_interventions: {
    student_id: string;
    student_name: string;
    category: string;
    suggested_action: string;
    coordination_target: 'parent' | 'gvbm' | 'cadre';
  }[];
}

export interface ReportCardEvaluationPreset {
  level: 'good' | 'fair' | 'pass' | 'need_improvement';
  title: string;
  conduct_comments: string[];
  academic_comments: string[];
}


