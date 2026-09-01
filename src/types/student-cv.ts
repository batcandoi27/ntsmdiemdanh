/**
 * DOMAIN MODELS & TYPES CHO PHÂN HỆ SƠ YẾU LÝ LỊCH HỌC SINH (STUDENT CURRICULUM VITAE)
 * Tuân thủ 6 Enterprise Architecture Invariants (P0 Hardening Gates)
 */

export type CurriculumVitaeStatus = 'draft' | 'submitted' | 'verified' | 'needs_update';

/**
 * Cấu trúc địa chỉ phân cấp chuẩn phục vụ thống kê báo cáo lên Sở/Phòng GD&ĐT
 */
export interface HierarchicalAddress {
  province_code?: string;
  province_name: string;
  district_code?: string;
  district_name?: string;
  ward_code?: string;
  ward_name: string;
  street_address: string;     // Số nhà, tên đường, tổ/thôn/xóm/khu phố
  display_address?: string;   // Chuỗi địa chỉ ghép đầy đủ để in ấn
}

/**
 * Thành viên gia đình (Cha / Mẹ / Giám hộ)
 */
export interface FamilyMemberInfo {
  full_name: string;          // Theo giấy khai sinh
  birth_year: string;
  citizen_id?: string;        // Số CCCD
  phone_numbers: string;      // Các số điện thoại liên lạc
  job: string;                // Nghề nghiệp
  position?: string;          // Chức vụ
  workplace?: string;         // Nơi làm việc
}

/**
 * Anh / Chị / Em ruột
 */
export interface SiblingInfo {
  full_name: string;
  birth_year: string;
  job_or_school: string;      // Nghề nghiệp hoặc trường lớp đang học
}

/**
 * Khảo sát 16 tiêu chí tính cách học sinh
 */
export interface PersonalityTraitsSurvey {
  kien_nhan: boolean;         // Kiên nhẫn, chịu khó
  le_phep: boolean;           // Lễ phép, chừng mực
  huong_noi: boolean;         // Hướng nội
  canh_tranh: boolean;        // Cạnh tranh, cầu toàn
  hoa_dong: boolean;          // Hòa đồng, cởi mở
  quan_tam: boolean;          // Quan tâm đến người khác
  sang_tao: boolean;          // Sáng tạo, mơ mộng
  noi_loan: boolean;          // Nổi loạn, chống đối
  nong_tinh: boolean;         // Nóng tính
  trung_thuc: boolean;        // Trung thực
  thu_dong: boolean;          // Thụ động, thờ ơ
  lanh_dao: boolean;          // Lãnh đạo, có ảnh hưởng
  nhay_cam: boolean;          // Nhạy cảm, rụt rè
  huong_ngoai: boolean;       // Hướng ngoại
  vo_tu: boolean;             // Vô tư, hài hước
  other_traits?: string;      // Khác (ghi rõ)
}

/**
 * Snapshot trường tùy chỉnh của GVCN tại thời điểm Phụ huynh nộp hồ sơ (Bảo toàn lịch sử in ấn)
 */
export interface CustomFieldSnapshot {
  field_key: string;
  field_label_snapshot: string;
  field_type: 'text' | 'select' | 'checkbox' | 'number';
  value: any;
}

/**
 * Toàn bộ dữ liệu hồ sơ cá nhân do Phụ huynh khai báo (Lưu trong cột JSONB profile_data)
 */
export interface StudentCurriculumVitaeProfileData {
  // --- I. BẢN THÂN ---
  full_name_upper: string;
  gender: 'Nam' | 'Nữ' | string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  birth_order: string;        // Là con thứ mấy trong gia đình
  ethnicity?: string;
  ethnicity_other?: string;
  nationality?: string;
  nationality_other?: string;
  religion?: string;
  religion_other?: string;
  citizen_id?: string;        // Số CCCD
  citizen_id_issue_date?: string;
  citizen_id_issue_place?: string;
  personal_id_code?: string;  // Mã số định danh cá nhân (nếu chưa có CCCD)
  
  birth_place_hospital?: string; // Tên bệnh viện / trạm y tế nơi sinh
  birth_place_ward?: string;
  birth_place_province?: string;
  
  birth_register_ward?: string;  // Nơi đăng ký khai sinh
  birth_register_province?: string;
  
  hometown?: HierarchicalAddress; // Quê quán chi tiết
  permanent_residence?: HierarchicalAddress; // Nơi thường trú
  current_residence?: HierarchicalAddress;   // Chỗ ở hiện nay
  is_same_residence?: boolean; // Chỗ ở hiện nay giống thường trú
  
  // Diện chính sách (10)
  policy_category?: {
    is_wounded_soldier: boolean;      // Con thương binh
    wounded_soldier_type?: string;    // Loại thương binh
    is_poor_household: boolean;       // Hộ nghèo, cận nghèo
    poor_household_code?: string;     // Mã số hộ nghèo
    is_martyr_child: boolean;         // Con liệt sĩ
    is_orphan: boolean;               // Con mồ côi cả cha lẫn mẹ
    other_policy?: string;            // Diện khác
  };
  
  living_with: string;                // Hiện đang ở với ai
  direct_guardian: {                  // Người trực tiếp quản lý HS
    full_name: string;
    relationship: string;
    phone: string;
  };
  hobbies_and_talents?: string;       // Sở thích, năng khiếu (max 150 ký tự)
  health_notes?: string;              // Vấn đề sức khỏe cần lưu ý (max 150 ký tự)
  class_position?: string;            // Chức vụ trong lớp / chi đội
  health_insurance_code?: string;     // Mã số BHYT
  health_insurance_hospital?: string; // Nơi đăng ký KCB ban đầu
  
  // --- II. GIA ĐÌNH ---
  father: FamilyMemberInfo;
  mother: FamilyMemberInfo;
  guardian?: FamilyMemberInfo;
  siblings: SiblingInfo[];            // Tối đa 5 dòng
  
  // --- III. THAM KHẢO Ý KIẾN PHỤ HUYNH ---
  personalities: PersonalityTraitsSurvey;
  special_family_circumstances?: string; // Hoàn cảnh gia đình ảnh hưởng học tập (max 250 ký tự)
  primary_contact_person: 'father' | 'mother' | 'guardian' | string;
  parent_signature_name: string;
  
  // --- IV. CÁC TRƯỜNG TÙY CHỈNH DO GVCN THÊM (SNAPSHOT) ---
  custom_fields?: Record<string, any>;
  custom_field_snapshots?: CustomFieldSnapshot[];
}

/**
 * Entity đầy đủ của bảng student_curriculum_vitae trong Database
 */
export interface StudentCurriculumVitae {
  id: string;
  school_id: string;                  // Multi-tenant Tenant Isolation
  student_id: string;
  class_id: string;
  academic_year: string;              // '2026-2027'
  schema_version: number;             // Mặc định 1
  version: number;                    // Optimistic Locking counter
  
  profile_data: StudentCurriculumVitaeProfileData;
  
  // Fast query index columns
  student_name_upper?: string;
  citizen_id?: string;
  health_notes?: string;
  policy_category?: string;
  emergency_contact_phone?: string;
  
  // Workflow Status
  status: CurriculumVitaeStatus;
  is_locked: boolean;
  
  // Tác nghiệp của GVCN (Tách biệt khỏi profile_data)
  teacher_notes?: string;
  teacher_verified_at?: string;
  teacher_verified_by?: string;
  
  // Thời gian phụ huynh nộp
  parent_submitted_at?: string;
  parent_submitted_by?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * Danh mục gợi ý trong Admin CP
 */
export interface AdminCatalogItem {
  code: string;
  label: string;
  is_default?: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface AdminCatalog {
  id: string; // 'ethnicities' | 'religions' | 'hospitals' | 'policy_types' | 'provinces'
  school_id: string;
  name: string;
  description?: string;
  items: AdminCatalogItem[];
  updated_at: string;
}

/**
 * Định nghĩa trường tùy chỉnh do GVCN tạo cho lớp
 */
export interface TeacherCustomField {
  id: string;
  school_id: string;
  class_id: string;
  teacher_id: string;
  field_key: string;
  field_label: string;
  field_type: 'text' | 'select' | 'checkbox' | 'number';
  options?: string[];                 // Cho field_type = 'select'
  is_required: boolean;
  max_length?: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * ViewModel chuẩn bị sẵn cho Bộ Render In Ấn / Batch PDF (Đúng 2 trang A4 vật lý)
 */
export interface StudentCVPrintViewModel {
  student_id: string;
  school_name: string;
  governing_body: string;
  class_name: string;
  school_year: string;
  homeroom_teacher_name: string;
  stt: string;
  profile: StudentCurriculumVitaeProfileData;
  formatted_addresses: {
    birth_place: string;
    birth_register: string;
    hometown: string;
    permanent: string;
    current: string;
  };
  policy_badges: string[];
  personality_checks: { label: string; checked: boolean }[];
  is_overflow_risk?: boolean;
  page_count_expected: 2;
}
