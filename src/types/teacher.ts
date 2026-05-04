export type TeacherGroupType = 'fixed' | 'custom';
export type TeacherGroupCategory = 'department' | 'organization' | 'admin' | 'event';
export type TeacherGroupLevel = 'tieu_hoc' | 'thcs' | 'thpt' | 'all';

export type TeacherAttendanceStatus = 'present' | 'absent' | 'on_duty' | 'substitute' | 'leave';

export interface Teacher {
  id: string;
  profile_id?: string;
  full_name: string;
  cccd?: string;
  issued_date?: string;
  issued_place?: string;
  address?: string;
  position?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  extra_info?: Record<string, any>;
  groups?: TeacherGroup[];
  created_at: string;
  updated_at: string;
}

export interface TeacherFieldConfig {
  id: string;
  name: string;
  code: string;
  type: string;
  is_active: boolean;
}

export interface TeacherGroup {
  id: string;
  name: string;
  type: TeacherGroupType;
  category: TeacherGroupCategory;
  level: TeacherGroupLevel;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeacherEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  recurrence: 'once' | 'daily' | 'weekly' | 'monthly';
  qr_secret?: string;
  attendance_officer_ids?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  groups?: TeacherGroup[]; // For UI convenience
}

export interface TeacherAttendance {
  id: string;
  teacher_id: string;
  event_id: string;
  check_in_date: string;
  status: TeacherAttendanceStatus;
  note?: string;
  is_verified: boolean;
  marked_by?: string;
  created_at: string;
  updated_at: string;
  teacher?: Teacher; // For UI convenience
}
