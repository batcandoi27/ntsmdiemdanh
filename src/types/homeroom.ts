// ============================================
// HOMEROOM MODULE TYPES (Phân hệ Giáo Viên Chủ Nhiệm)
// ============================================

export type HomeroomEventType = 
  | 'positive'    // Ghi nhận tích cực, việc tốt, thành tích
  | 'attendance'  // Vấn đề chuyên cần, đi muộn, trốn tiết
  | 'academic'    // Học tập, bài tập, kiểm tra
  | 'behavior'    // Kỷ luật, tác phong, đồng phục, nề nếp
  | 'activity'    // Hoạt động đoàn đội, ngoại khóa, phong trào
  | 'other';      // Khác

export type HomeroomEventSeverity = 'info' | 'attention' | 'urgent';

export type HomeroomEventStatus = 'open' | 'monitoring' | 'resolved' | 'closed';

export type HomeroomEventSource = 'gvcn' | 'gvbm' | 'parent' | 'student' | 'school';

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
export type InterventionStatus = 'planned' | 'in_progress' | 'successful' | 'needs_revision';

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
  problem: string; // Vấn đề gặp phải
  goal: string; // Mục tiêu rèn luyện
  measures: string[]; // Các biện pháp áp dụng
  coordinated_with: InterventionCoordination[]; // Phối hợp cùng ai
  start_date: string; // YYYY-MM-DD
  review_date?: string; // YYYY-MM-DD
  result?: string; // Đánh giá kết quả
  status: InterventionStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------
// Sơ đồ chỗ ngồi & Cơ cấu lớp
// --------------------------------------------
export interface DeskSeat {
  seat_key: string; // vd: "r1_c1_s1"
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
  seating_chart: SeatingChartConfig;
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
  id: string;
  class_id: string;
  academic_year: string;
  plan_type: HomeroomPlanType;
  period_key: string; // 'week_01', 'month_09', 'full_year'
  title?: string;
  content: {
    focus_points?: string[]; // Trọng tâm công việc
    measures?: string[]; // Biện pháp thực hiện
    checklist?: WeeklyChecklistItem[]; // Cho kế hoạch tuần
    strengths?: string; // Thuận lợi
    challenges?: string; // Khó khăn
    targets?: {
      academic_good_percent?: number; // % Học lực Giỏi/Tốt
      conduct_good_percent?: number; // % Hạnh kiểm Tốt
      competitions?: string; // Danh hiệu thi đua đăng ký
    };
    notes?: string;
    review_summary?: string; // Đánh giá cuối tuần / cuối tháng / cuối kỳ
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------
// Nhật ký Phối hợp Phụ huynh & Phản hồi GVBM
// --------------------------------------------
export type ParentContactType = 'call' | 'meeting' | 'zalo' | 'portal_feedback' | 'gvbm_note';

export interface HomeroomParentContact {
  id: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  contact_type: ParentContactType;
  contact_date: string; // YYYY-MM-DD
  title?: string;
  content: string; // Nội dung trao đổi
  parent_feedback?: string; // Ý kiến / Cam kết của phụ huynh
  status: 'pending' | 'resolved';
  created_by: string;
  created_at: string;
}

// --------------------------------------------
// Cổng Tra cứu Phụ huynh (Parent Portal)
// --------------------------------------------
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
    total_school_days: number;
    present_days: number;
    excused_absences: number;
    unexcused_absences: number;
    late_days: number;
    attendance_rate: number; // %
  };
  events: HomeroomEvent[];
  announcement?: string;
  timetable?: any;
}
