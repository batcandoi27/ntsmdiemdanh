// Types for Timetable & Daily Homework Reports (Phân Hệ Báo Bài & Thời Khóa Biểu)

export type SchoolSession = 'MORNING' | 'AFTERNOON';

export interface TimetablePeriod {
    period: number; // 1 -> 5
    subject_name: string;
    teacher_name?: string;
    room_name?: string;
    color?: string;
}

export interface DayTimetable {
    day_of_week: number; // 2: Thứ Hai -> 7: Thứ Bảy
    day_label: string; // "Thứ Hai", "Thứ Ba"...
    morning: TimetablePeriod[];
    afternoon: TimetablePeriod[];
}

export interface ClassTimetable {
    class_id: string;
    class_name: string;
    days: DayTimetable[];
    updated_at: string;
}

export function getSubjectBadgeStyle(subject: string): { bg: string; text: string; border: string; accent: string; icon: string } {
    const s = (subject || '').toLowerCase().trim();
    if (s.includes('toán')) return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-600', icon: '📐' };
    if (s.includes('văn') || s.includes('ngữ văn')) return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-600', icon: '📖' };
    if (s.includes('anh') || s.includes('ngoại ngữ') || s.includes('english')) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-600', icon: '🇬🇧' };
    if (s.includes('lý') || s.includes('vật lí') || s.includes('vật lý') || s.includes('khtn (lý)')) return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-600', icon: '⚡' };
    if (s.includes('hóa') || s.includes('khtn (hóa)')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-600', icon: '🧪' };
    if (s.includes('sinh') || s.includes('khtn (sinh)')) return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', accent: 'bg-green-600', icon: '🌱' };
    if (s.includes('sử') || s.includes('lịch sử')) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-600', icon: '📜' };
    if (s.includes('địa') || s.includes('địa lý')) return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-600', icon: '🌏' };
    if (s.includes('tin') || s.includes('tin học')) return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-600', icon: '💻' };
    if (s.includes('gdcd') || s.includes('công dân') || s.includes('gdđp')) return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-600', icon: '⚖️' };
    if (s.includes('thể dục') || s.includes('thể chất')) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', accent: 'bg-red-600', icon: '🏃' };
    if (s.includes('nhạc') || s.includes('âm nhạc') || s.includes('mỹ thuật') || s.includes('nghệ thuật')) return { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: 'bg-fuchsia-600', icon: '🎨' };
    if (s.includes('công nghệ')) return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', accent: 'bg-slate-600', icon: '⚙️' };
    return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', accent: 'bg-slate-600', icon: '📚' };
}

export interface HomeworkSubjectEntry {
    subject_name: string;
    period?: number;
    lesson_title?: string;
    homework_tasks: string; // Nội dung bài tập về nhà
    notes_and_tools?: string; // Dặn dò mang dụng cụ, sách vở, chuẩn bị bài
    is_test_scheduled?: boolean; // Có kiểm tra 15p / 1 tiết
    test_type?: '15P' | '1TIET' | 'MIENG' | 'HOCKY';
}

export interface DailyHomeworkReport {
    id: string;
    class_id: string;
    class_name: string;
    report_date: string; // YYYY-MM-DD
    created_by_role: 'STUDENT_BCS' | 'TEACHER_GVCN';
    created_by_name: string;
    entries: HomeworkSubjectEntry[];
    general_announcement?: string; // Dặn dò chung của GVCN / Lớp trưởng
    is_published: boolean;
    sent_to_zalo_group: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClassReporter {
    id: string;
    class_id: string;
    student_id: string;
    student_name: string;
    student_code: string;
    role_title: 'Lớp Trưởng' | 'Lớp Phó Học Tập' | 'Bí Thư' | 'Tổ Trưởng' | 'Ban Cán Sự';
    is_active: boolean;
    assigned_at: string;
}

// Smart Presets for Zero-Touch Homework Editing
export interface SubjectSmartPreset {
    subject: string;
    quick_tasks: string[];
    quick_tools: string[];
    default_color: string;
}

export const COMMON_SUBJECT_PRESETS: SubjectSmartPreset[] = [
    {
        subject: 'Toán',
        default_color: '#3B82F6',
        quick_tasks: [
            'Làm bài 1, 2, 3 trang SGK',
            'Hoàn thành phiếu bài tập đại số',
            'Vẽ hình và làm bài tập hình học',
            'Ôn tập công thức chuẩn bị kiểm tra 15p',
            'Học thuộc định lý và hệ quả'
        ],
        quick_tools: ['Mang com-pa, thước ê-ke', 'Mang máy tính cầm tay Casio', 'Mang vở bài tập hình học']
    },
    {
        subject: 'Ngữ Văn',
        default_color: '#EC4899',
        quick_tasks: [
            'Soạn bài văn bản tiếp theo vào vở soạn',
            'Học thuộc lòng bài thơ và phân tích 2 khổ đầu',
            'Viết đoạn văn nghị luận xã hội 200 chữ',
            'Làm bài tập phần Tiếng Việt trong SGK',
            'Đọc trước phần Tri thức Ngữ văn'
        ],
        quick_tools: ['Mang sách bài tập Ngữ văn', 'Mang vở bài soạn', 'Mang tài liệu tham khảo']
    },
    {
        subject: 'Tiếng Anh',
        default_color: '#10B981',
        quick_tasks: [
            'Học thuộc 10 từ vựng Unit mới',
            'Làm bài tập Grammar trong Workbook',
            'Luyện phát âm đoạn hội thoại và ghi âm',
            'Viết đoạn văn ngắn 80-100 từ theo chủ đề',
            'Chuẩn bị phần thuyết trình nhóm'
        ],
        quick_tools: ['Mang sách Workbook', 'Mang sổ tay từ vựng', 'Chuẩn bị bài nghe trên điện thoại']
    },
    {
        subject: 'Vật Lý',
        default_color: '#8B5CF6',
        quick_tasks: [
            'Giải bài tập phần Vận dụng trong SGK',
            'Tóm tắt lý thuyết bài học vào sơ đồ tư duy',
            'Chuẩn bị báo cáo thực hành thí nghiệm',
            'Ôn tập công thức tính lực và công suất'
        ],
        quick_tools: ['Mang máy tính Casio', 'Mang bảng ghi chép số liệu thực hành']
    },
    {
        subject: 'Hóa Học',
        default_color: '#F59E0B',
        quick_tasks: [
            'Viết và cân bằng 5 phương trình hóa học',
            'Giải bài toán tính theo phương trình hóa học',
            'Học thuộc dãy hoạt động hóa học của kim loại',
            'Lập bảng tính tan của các muối'
        ],
        quick_tools: ['Mang Bảng tuần hoàn nguyên tố hóa học', 'Mang máy tính Casio']
    },
    {
        subject: 'Sinh Học',
        default_color: '#14B8A6',
        quick_tasks: [
            'Vẽ và chú thích sơ đồ cấu tạo tế bào/cơ quan',
            'Trả lời câu hỏi lệnh và bài tập cuối bài',
            'Sưu tầm mẫu vật thực vật/động vật theo nhóm'
        ],
        quick_tools: ['Mang mẫu lá cây/tiêu bản', 'Mang bút chì màu vẽ sơ đồ']
    },
    {
        subject: 'Lịch Sử & Địa Lí',
        default_color: '#F97316',
        quick_tasks: [
            'Vẽ trục thời gian các sự kiện lịch sử chính',
            'Đọc và phân tích lược đồ/bản đồ trong SGK',
            'Trả lời câu hỏi ôn tập chương',
            'Làm bài tập Atlat Địa lí'
        ],
        quick_tools: ['Mang Tập bản đồ / Atlat Địa lí Việt Nam', 'Mang thước kẻ và bút dạ quang']
    },
    {
        subject: 'Tin Học',
        default_color: '#06B6D4',
        quick_tasks: [
            'Viết thuật toán/chương trình vào sổ tay',
            'Chuẩn bị file slide trình chiếu cho tiết sau',
            'Luyện gõ phím và thực hành phần mềm bảng tính'
        ],
        quick_tools: ['Mang USB lưu bài thực hành', 'Mang sổ tay mã code']
    },
    {
        subject: 'GDCD',
        default_color: '#6366F1',
        quick_tasks: [
            'Xử lý tình huống đạo đức/pháp luật trong SGK',
            'Chuẩn bị tiểu phẩm đóng vai theo nhóm',
            'Sưu tầm tấm gương người tốt việc tốt'
        ],
        quick_tools: ['Mang tài liệu Luật liên quan', 'Chuẩn bị đạo cụ diễn']
    },
    {
        subject: 'Thể Dục / GDTC',
        default_color: '#EF4444',
        quick_tasks: [
            'Tự tập động tác chạy ngắn/nhảy cao tại nhà',
            'Tập các bài thể dục phát triển chung'
        ],
        quick_tools: ['Mang đồng phục thể dục, giày bata', 'Mang bình nước cá nhân']
    }
];
