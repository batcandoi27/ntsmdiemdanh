// Service for managing Timetables, Daily Homework Reports, Ban Cán Sự roles, and Zero-Touch Presets

import { supabaseAdmin } from '@/lib/supabase-admin';
import {
    ClassTimetable,
    DailyHomeworkReport,
    ClassReporter,
    HomeworkSubjectEntry,
    COMMON_SUBJECT_PRESETS,
    DayTimetable
} from '@/types/homework';

export class HomeworkService {
    /**
     * Get or initialize a default 6-day Timetable for a class (Thứ 2 -> Thứ 7)
     */
    static async getClassTimetable(classId: string, className = 'Lớp'): Promise<ClassTimetable> {
        try {
            const { data, error } = await supabaseAdmin
                .from('class_timetables')
                .select('*')
                .eq('class_id', classId)
                .order('day_of_week', { ascending: true })
                .order('period', { ascending: true });

            const daysMap = new Map<number, { morning: any[]; afternoon: any[] }>();
            for (let d = 2; d <= 7; d++) {
                daysMap.set(d, { morning: [], afternoon: [] });
            }

            if (!error && data && data.length > 0) {
                data.forEach((row: any) => {
                    const d = daysMap.get(row.day_of_week);
                    if (d) {
                        const targetSession = row.session === 'AFTERNOON' ? d.afternoon : d.morning;
                        targetSession.push({
                            period: row.period,
                            subject_name: row.subject_name,
                            teacher_name: row.teacher_name || '',
                            room_name: row.room_name || ''
                        });
                    }
                });
            }

            const dayLabels: Record<number, string> = {
                2: 'Thứ Hai',
                3: 'Thứ Ba',
                4: 'Thứ Tư',
                5: 'Thứ Năm',
                6: 'Thứ Sáu',
                7: 'Thứ Bảy'
            };

            const days: DayTimetable[] = [];
            for (let d = 2; d <= 7; d++) {
                const s = daysMap.get(d)!;
                days.push({
                    day_of_week: d,
                    day_label: dayLabels[d],
                    morning: s.morning.length > 0 ? s.morning : this.getDefaultPeriods('MORNING', d),
                    afternoon: s.afternoon.length > 0 ? s.afternoon : []
                });
            }

            return {
                class_id: classId,
                class_name: className,
                days,
                updated_at: new Date().toISOString()
            };
        } catch (err) {
            console.error('[HomeworkService] getClassTimetable error:', err);
            return {
                class_id: classId,
                class_name: className,
                days: this.getInitialEmptyDays(),
                updated_at: new Date().toISOString()
            };
        }
    }

    private static getDefaultPeriods(session: 'MORNING' | 'AFTERNOON', day: number) {
        if (session === 'AFTERNOON') return [];
        // Default 5 morning periods based on day
        const mockSubjectsByDay: Record<number, string[]> = {
            2: ['Chào Cờ', 'Toán', 'Ngữ Văn', 'Tiếng Anh', 'Lịch Sử'],
            3: ['Toán', 'Hóa Học', 'Sinh Học', 'Ngữ Văn', 'Tin Học'],
            4: ['Vật Lý', 'Toán', 'Tiếng Anh', 'Địa Lí', 'GDCD'],
            5: ['Ngữ Văn', 'Toán', 'Hóa Học', 'Thể Dục', 'Tiếng Anh'],
            6: ['Toán', 'Ngữ Văn', 'Sinh Học', 'Vật Lý', 'Âm Nhạc'],
            7: ['Công Nghệ', 'Tiếng Anh', 'Mĩ Thuật', 'Hoạt động TNST', 'Sinh Hoạt Lớp']
        };

        const subjects = mockSubjectsByDay[day] || ['Toán', 'Ngữ Văn', 'Tiếng Anh', 'Lý', 'Hóa'];
        return subjects.map((subj, idx) => ({
            period: idx + 1,
            subject_name: subj,
            teacher_name: '',
            room_name: ''
        }));
    }

    private static getInitialEmptyDays(): DayTimetable[] {
        const dayLabels: Record<number, string> = {
            2: 'Thứ Hai',
            3: 'Thứ Ba',
            4: 'Thứ Tư',
            5: 'Thứ Năm',
            6: 'Thứ Sáu',
            7: 'Thứ Bảy'
        };
        const res: DayTimetable[] = [];
        for (let d = 2; d <= 7; d++) {
            res.push({
                day_of_week: d,
                day_label: dayLabels[d],
                morning: this.getDefaultPeriods('MORNING', d),
                afternoon: []
            });
        }
        return res;
    }

    /**
     * Save class timetable (Full Edit & Zero-Touch)
     */
    static async saveClassTimetable(timetable: ClassTimetable): Promise<{ ok: boolean; error?: string }> {
        try {
            // Delete old entries for this class
            await supabaseAdmin.from('class_timetables').delete().eq('class_id', timetable.class_id);

            const rowsToInsert: any[] = [];
            timetable.days.forEach(day => {
                day.morning.forEach(p => {
                    const subName = (p.subject_name || (p as any).subject || '').trim();
                    if (subName) {
                        rowsToInsert.push({
                            class_id: timetable.class_id,
                            day_of_week: day.day_of_week,
                            session: 'MORNING',
                            period: p.period,
                            subject_name: subName,
                            teacher_name: p.teacher_name || null,
                            room_name: p.room_name || (p as any).room || null
                        });
                    }
                });
                day.afternoon.forEach(p => {
                    const subName = (p.subject_name || (p as any).subject || '').trim();
                    if (subName) {
                        rowsToInsert.push({
                            class_id: timetable.class_id,
                            day_of_week: day.day_of_week,
                            session: 'AFTERNOON',
                            period: p.period,
                            subject_name: subName,
                            teacher_name: p.teacher_name || null,
                            room_name: p.room_name || (p as any).room || null
                        });
                    }
                });
            });

            if (rowsToInsert.length > 0) {
                const { error } = await supabaseAdmin.from('class_timetables').insert(rowsToInsert);
                if (error) throw error;
            }

            return { ok: true };
        } catch (err: any) {
            console.error('[HomeworkService] saveClassTimetable error:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Get or pre-populate Daily Homework Report for a specific date (Zero-Touch Smart Defaults)
     */
    static async getDailyHomeworkReport(
        classId: string,
        reportDate: string,
        className = 'Lớp'
    ): Promise<DailyHomeworkReport> {
        try {
            const { data } = await supabaseAdmin
                .from('daily_homework_reports')
                .select('*')
                .eq('class_id', classId)
                .eq('report_date', reportDate)
                .maybeSingle();

            if (data) {
                return {
                    id: data.id,
                    class_id: data.class_id,
                    class_name: className,
                    report_date: data.report_date,
                    created_by_role: data.created_by_role || 'STUDENT_BCS',
                    created_by_name: data.created_by_name || 'Ban Cán Sự',
                    entries: data.entries || [],
                    general_announcement: data.general_announcement || '',
                    is_published: data.is_published ?? true,
                    sent_to_zalo_group: data.sent_to_zalo_group ?? false,
                    created_at: data.created_at,
                    updated_at: data.updated_at
                };
            }

            // If not existing yet, pre-populate subjects from Timetable for this date!
            const dateObj = new Date(reportDate);
            const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay() + 1; // 2..7

            const timetable = await this.getClassTimetable(classId, className);
            const dayTkb = timetable.days.find(d => d.day_of_week === dayOfWeek);

            const initialEntries: HomeworkSubjectEntry[] = [];
            const subjectsSet = new Set<string>();

            if (dayTkb) {
                [...dayTkb.morning, ...dayTkb.afternoon].forEach(p => {
                    if (p.subject_name && !['Chào Cờ', 'Sinh Hoạt Lớp'].includes(p.subject_name)) {
                        if (!subjectsSet.has(p.subject_name)) {
                            subjectsSet.add(p.subject_name);
                            // Auto-suggest smart preset defaults!
                            const preset = COMMON_SUBJECT_PRESETS.find(pr => pr.subject.toLowerCase() === p.subject_name.toLowerCase());
                            initialEntries.push({
                                subject_name: p.subject_name,
                                period: p.period,
                                homework_tasks: preset?.quick_tasks[0] || 'Làm bài tập trong SGK',
                                notes_and_tools: preset?.quick_tools[0] || 'Mang đầy đủ SGK và vở ghi',
                                is_test_scheduled: false
                            });
                        }
                    }
                });
            }

            return {
                id: `draft_${classId}_${reportDate}`,
                class_id: classId,
                class_name: className,
                report_date: reportDate,
                created_by_role: 'STUDENT_BCS',
                created_by_name: 'Ban Cán Sự Lớp',
                entries: initialEntries,
                general_announcement: 'Nhớ đi học đúng giờ và mặc đúng đồng phục quy định.',
                is_published: false,
                sent_to_zalo_group: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        } catch (err) {
            console.error('[HomeworkService] getDailyHomeworkReport error:', err);
            return {
                id: `err_${Date.now()}`,
                class_id: classId,
                class_name: className,
                report_date: reportDate,
                created_by_role: 'STUDENT_BCS',
                created_by_name: 'Ban Cán Sự Lớp',
                entries: [],
                is_published: false,
                sent_to_zalo_group: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
    }

    /**
     * Save / Publish Daily Homework Report
     */
    static async saveDailyHomeworkReport(report: DailyHomeworkReport): Promise<{ ok: boolean; error?: string }> {
        try {
            const { error } = await supabaseAdmin.from('daily_homework_reports').upsert(
                {
                    class_id: report.class_id,
                    report_date: report.report_date,
                    created_by_role: report.created_by_role,
                    created_by_name: report.created_by_name,
                    entries: report.entries,
                    general_announcement: report.general_announcement || null,
                    is_published: report.is_published,
                    sent_to_zalo_group: report.sent_to_zalo_group,
                    updated_at: new Date().toISOString()
                },
                { onConflict: 'class_id,report_date' }
            );

            if (error) throw error;
            return { ok: true };
        } catch (err: any) {
            console.error('[HomeworkService] saveDailyHomeworkReport error:', err);
            return { ok: false, error: err?.message };
        }
    }

    /**
     * Get Ban Cán Sự reporters for a class
     */
    static async getClassReporters(classId: string): Promise<ClassReporter[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('class_reporters')
                .select('*, students(full_name, student_code)')
                .eq('class_id', classId)
                .eq('is_active', true);

            if (error || !data) return [];
            return data.map((row: any) => ({
                id: row.id,
                class_id: row.class_id,
                student_id: row.student_id,
                student_name: row.students?.full_name || 'Học sinh',
                student_code: row.students?.student_code || '',
                role_title: row.role_title,
                is_active: row.is_active,
                assigned_at: row.created_at
            }));
        } catch {
            return [];
        }
    }

    /**
     * Format Daily Homework Report into clean Zalo Text & Emoji format
     */
    static formatHomeworkReportForZalo(report: DailyHomeworkReport): string {
        const dateStr = new Date(report.report_date).toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        let text = `📖 BÁO BÀI & DẶN DÒ NGÀY HỌC
━━━━━━━━━━━━━━━━━━━━━━
🏫 Lớp: ${report.class_name}
📅 Ngày: ${dateStr}
✍️ Người ghi: ${report.created_by_name} (${report.created_by_role === 'TEACHER_GVCN' ? 'GVCN' : 'Ban Cán Sự'})
━━━━━━━━━━━━━━━━━━━━━━\n`;

        if (report.entries.length === 0) {
            text += `✨ Chưa có dặn dò bài tập cho ngày này. Chúc các em một buổi tối nghỉ ngơi vui vẻ!\n`;
        } else {
            report.entries.forEach((entry, idx) => {
                const testTag = entry.is_test_scheduled ? ' 🚨 [CÓ KIỂM TRA]' : '';
                text += `📚 ${idx + 1}. Môn: ${entry.subject_name}${testTag}\n`;
                if (entry.homework_tasks) {
                    text += `   • Bài tập: ${entry.homework_tasks}\n`;
                }
                if (entry.notes_and_tools) {
                    text += `   • Dặn dò: ${entry.notes_and_tools}\n`;
                }
                text += `\n`;
            });
        }

        if (report.general_announcement) {
            text += `📢 DẶN DÒ CHUNG:
${report.general_announcement}\n\n`;
        }

        text += `━━━━━━━━━━━━━━━━━━━━━━
Kính nhờ Quý Phụ Huynh nhắc nhở các em hoàn thành bài tập trước khi đến lớp ạ!`;

        return text;
    }
}
