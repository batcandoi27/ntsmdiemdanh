import { createClient } from '@supabase/supabase-js';
import { AttendanceRecordV3 } from '@/types/attendance-v3';
import { Class, Student, User, AttendanceRecord, AttendanceStatus, AppSettings } from '@/types/models';
import { supabase } from '@/lib/supabase';
import { getCached, setCache, invalidateCachePrefix } from './cache-service';
import { DbAdapter } from './db-adapter';
import { normalizeAttendanceRecord } from './attendance-v3-utils';
import { StudentStatus } from '@/types/models';
import { transformDbToStudent, transformStudentToDb } from '@/utils/transformers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export class SupabaseAdapter implements DbAdapter {

    private get client() {
        return supabase;
    }

    private get adminClient() {
        if (typeof window !== 'undefined') return null;
        if (!supabaseUrl || !supabaseServiceKey) return null;
        return createClient(supabaseUrl, supabaseAnonKey, { 
            auth: { autoRefreshToken: false, persistSession: false }
        });
    }

    // --- Loading Helpers (Client side only) ---
    private emitLoadingStart(message?: string) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app:loading:start', { detail: { message } }));
        }
    }

    private emitLoadingEnd() {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('app:loading:end'));
        }
    }

    // --- Helpers ---
    private async getActiveYearId(): Promise<string> {
        const { data } = await this.client
            .from('academic_years')
            .select('id')
            .eq('is_active', true)
            .maybeSingle();
        
        if (data?.id) return data.id;

        // Fallback: Lấy năm mới nhất
        const { data: latest } = await this.client
            .from('academic_years')
            .select('id')
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        
        return latest?.id || '';
    }

    private async getDefaultAttendanceTypeId(): Promise<string> {
        const { data } = await this.client
            .from('attendance_types')
            .select('id')
            .limit(1)
            .maybeSingle();
        return data?.id || '';
    }

    // --- Settings ---
    async getSettings(): Promise<AppSettings | null> {
        const { data, error } = await this.client
            .from('settings')
            .select('value')
            .eq('key', 'app_settings')
            .maybeSingle();
        
        if (error || !data) return null;
        return data.value as AppSettings;
    }

    // --- Classes ---
    async getClasses(options?: { isPersonal?: boolean; ownerId?: string }): Promise<Class[]> {
        const CACHE_KEY = `supabase_classes_${options?.isPersonal || 'all'}_${options?.ownerId || ''}`;
        const cached = getCached<Class[]>(CACHE_KEY);
        if (cached) return cached;

        const yearId = await this.getActiveYearId();
        let query = this.client.from('classes').select(`
            *,
            academic_years(name),
            teacher_classes(teacher_id, is_homeroom, profiles:profiles(full_name)),
            student_classes(count)
        `).eq('year_id', yearId);

        if (options?.isPersonal && options.ownerId) {
            // Filter by teacher_classes junction
            const { data: classIds } = await this.client
                .from('teacher_classes')
                .select('class_id')
                .eq('teacher_id', options.ownerId);
            
            if (classIds && classIds.length > 0) {
                query = query.in('id', classIds.map(c => c.class_id));
            } else {
                return [];
            }
        }

        this.emitLoadingStart('Đang tải danh sách lớp...');
        try {
            const { data, error } = await query;
            if (error) {
                console.error('Supabase getClasses Error:', error);
                return [];
            }

            const list: Class[] = (data || []).map(c => {
                const homeroom = c.teacher_classes?.find((tc: any) => tc.is_homeroom);
                const teacherProfile = Array.isArray(homeroom?.profiles) ? homeroom.profiles[0] : homeroom?.profiles;
                
                const listCount = (c.student_classes && (c.student_classes as any)[0]) 
                    ? (c.student_classes as any)[0].count 
                    : (c.actual_student_count || 0);

                return {
                    id: c.id,
                    name: c.name,
                    grade: c.grade,
                    teacherId: homeroom?.teacher_id || '',
                    teacherName: teacherProfile?.full_name || '',
                    totalStudents: listCount + (c.adjustment_count || 0),
                    actualStudentCount: listCount,
                    manualStudentCount: c.manual_student_count || 0,
                    adjustmentCount: c.adjustment_count || 0,
                    classType: c.class_type,
                    academicYear: c.academic_years?.name
                };
            }).sort((a, b) => {
                if (a.grade !== b.grade) return (a.grade || 0) - (b.grade || 0);
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            setCache(CACHE_KEY, list, 300000); // 5 mins cache
            return list;
        } finally {
            this.emitLoadingEnd();
        }
    }

    async getClass(id: string): Promise<Class | null> {
        const { data, error } = await this.client
            .from('classes')
            .select(`
                *,
                academic_years(name),
                teacher_classes(teacher_id, is_homeroom, profiles:profiles(full_name)),
                student_classes(count)
            `)
            .eq('id', id)
            .single();
        
        if (error || !data) return null;

        const homeroom = data.teacher_classes?.find((tc: any) => tc.is_homeroom);
        const listCount = (data.student_classes && (data.student_classes as any)[0]) 
            ? (data.student_classes as any)[0].count 
            : (data.actual_student_count || 0);

        return {
            id: data.id,
            name: data.name,
            grade: data.grade,
            teacherId: homeroom?.teacher_id || '',
            teacherName: homeroom?.profiles?.full_name || '',
            totalStudents: listCount + (data.adjustment_count || 0),
            actualStudentCount: listCount,
            manualStudentCount: data.manual_student_count || 0,
            adjustmentCount: data.adjustment_count || 0,
            classType: data.class_type,
            academicYear: data.academic_years?.name
        };
    }

    async createClass(cls: Class): Promise<void> {
        const client = this.adminClient || this.client;
        const yearId = await this.getActiveYearId();
        const { data, error } = await client.from('classes').insert({
            id: cls.id,
            year_id: yearId,
            name: cls.name,
            grade: cls.grade,
            class_type: cls.classType || 'school'
        }).select().single();

        if (error) throw error;
        if (cls.teacherId) {
            await client.from('teacher_classes').insert({
                teacher_id: cls.teacherId,
                class_id: data.id,
                is_homeroom: true
            });
        }
        invalidateCachePrefix('supabase_classes');
    }

    async updateClass(cls: Class): Promise<void> {
        const client = this.adminClient || this.client;
        await client.from('classes').update({
            name: cls.name,
            grade: cls.grade,
            class_type: cls.classType
        }).eq('id', cls.id);
        invalidateCachePrefix('supabase_classes');
    }

    async deleteClass(id: string): Promise<void> {
        const client = this.adminClient || this.client;
        await client.from('classes').delete().eq('id', id);
        invalidateCachePrefix('supabase_classes');
    }

    // --- Students ---
    async getStudentsByClass(classId: string, options?: { onlyActive?: boolean; startDate?: string; endDate?: string }): Promise<Student[]> {
        const CACHE_KEY = `supabase_students_${classId}_${JSON.stringify(options)}`;
        const cached = getCached<Student[]>(CACHE_KEY);
        if (cached) return cached;

        let data, error;
        if (options?.startDate && options?.endDate) {
            // Chế độ báo cáo: Lấy cả HS đã nghỉ nếu có dữ liệu điểm danh trong kỳ
            const res = await this.client.rpc('rpc_get_students_for_report', {
                p_class_id: classId,
                p_start_date: options.startDate,
                p_end_date: options.endDate
            });
            data = res.data;
            error = res.error;
        } else {
            let query = this.client.from('v_student_list' as any).select(`*`).eq('class_id', classId);
            
            if (options?.onlyActive) {
                // Chỉ lấy học sinh đang hoạt động (cho điểm danh)
                query = query.eq('is_deleted', false).eq('status', 'active');
            }
            
            const res = await query;
            data = res.data;
            error = res.error;
        }

        if (error) {
            console.error('getStudentsByClass Error:', error);
            return [];
        }

        const list: Student[] = (data || []).map(d => transformDbToStudent(d))
            .sort((a, b) => {
                if (a.code && b.code) {
                    return a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' });
                }
                return (a.order || 0) - (b.order || 0);
            });

        setCache(CACHE_KEY, list, 300000);
        return list;
    }

    async createStudents(students: Student[]): Promise<void> {
        for (const s of students) await this.createStudent(s);
    }

    async createStudent(student: Student): Promise<void> {
        const client = this.adminClient || this.client;
        const studentId = student.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : undefined);
        
        if (!studentId) throw new Error("Could not generate student ID");

        const { error } = await client.rpc('rpc_upsert_student', {
            p_student_id: studentId,
            p_class_id: student.classId,
            p_payload: transformStudentToDb(student)
        });

        if (error) {
            console.error('createStudent Error:', error);
            throw error;
        }
        
        invalidateCachePrefix(`supabase_students_${student.classId}`);
    }

    async updateStudent(student: Student): Promise<void> {
        const client = this.adminClient || this.client;
        if (!student.id) throw new Error("Student ID is required for update");

        const { error } = await client.rpc('rpc_upsert_student', {
            p_student_id: student.id,
            p_class_id: student.classId,
            p_payload: transformStudentToDb(student)
        });

        if (error) {
            console.error('updateStudent Error:', error);
            throw error;
        }
        invalidateCachePrefix(`supabase_students`);
    }

    async deleteStudent(id: string): Promise<void> {
        // Ghi chú: ID ở đây ứng với student_code truyền từ UI cũ, 
        // nhưng adapter mới nên dùng UUID nếu có thể. 
        // Tuy nhiên để tránh sửa UI nhiều, ta fetch UUID từ code trước hoặc sửa RPC để nhận code.
        // Tốt nhất: Tìm ID từ code trong cache hoặc DB.
        
        const client = this.adminClient || this.client;
        
        // Fetch ID first if 'id' is actually code (backward compatibility)
        const { data: student } = await client
            .from('students')
            .select('id')
            .eq('student_code', id)
            .maybeSingle();

        if (student?.id) {
            const { error } = await client.rpc('rpc_soft_delete_student', { 
                p_student_id: student.id 
            });
            if (error) throw error;
        } else {
            // Fallback: Try delete by code if ID not found (thoạt nhìn id truyền vào là code)
            await client.from('students').update({ is_deleted: true }).eq('student_code', id);
        }

        invalidateCachePrefix('supabase_students');
    }

    async getTeacher(id: string): Promise<User | null> {
        const { data, error } = await this.client.from('profiles').select('*').eq('id', id).maybeSingle();
        if (error || !data) return null;
        return { id: data.id, name: data.full_name || '', email: data.email || '', role: data.role as any };
    }

    // --- Attendance ---
    async getAttendance(classId: string, date: string): Promise<AttendanceRecord | null> {
        const { data, error } = await this.client
            .from('attendance')
            .select('*, students(student_code), attendance_statuses(code)')
            .eq('class_id', classId)
            .eq('date', date);

        if (error || !data || data.length === 0) return null;

        const absences: Record<string, AttendanceStatus> = {};
        data.forEach(r => {
            if (r.students?.student_code && r.attendance_statuses?.code) {
                absences[r.students.student_code] = r.attendance_statuses.code as AttendanceStatus;
            }
        });

        return normalizeAttendanceRecord({
            id: `${classId}_${date}`,
            date: date,
            classId: classId,
            absences: absences,
            updatedBy: data[0].marked_by || 'system',
            updatedAt: data[0].created_at,
            syncStatus: 'synced'
        } as any) as any;
    }

    async saveAttendance(record: AttendanceRecord): Promise<void> {
        const typeId = await this.getDefaultAttendanceTypeId();
        const { data: students } = await this.client
            .from('student_classes')
            .select('student_id, students(student_code)')
            .eq('class_id', record.classId);

        const codeToIdMap = new Map(students?.map((s: any) => [s.students.student_code, s.student_id]));
        const { data: statuses } = await this.client.from('attendance_statuses').select('id, code');
        const statusCodeToIdMap = new Map(statuses?.map(s => [s.code, s.id]));

        await this.client.from('attendance').delete().eq('class_id', record.classId).eq('date', record.date);

        const user = (await this.client.auth.getUser()).data.user;
        let markedBy = user?.id || 'system';

        // Bảo hiểm: Tìm ID thực tế trong bảng profiles khớp với email này 
        // để tránh lỗi FK marked_by_fkey nếu ID Auth và ID Profile chưa đồng bộ
        if (user?.email) {
            const { data: profile } = await this.client
                .from('profiles')
                .select('id')
                .eq('email', user.email)
                .maybeSingle();
            
            if (profile?.id) {
                markedBy = profile.id;
            }
        }
        const inserts = Object.entries(record.absences).map(([code, status]) => {
            const studentId = codeToIdMap.get(code);
            const statusId = statusCodeToIdMap.get(status);
            if (studentId && statusId) {
                return {
                    student_id: studentId,
                    class_id: record.classId,
                    type_id: typeId,
                    status_id: statusId,
                    date: record.date,
                    marked_by: markedBy,
                    session: (record as any).session || 'morning',
                    note: (record as any).note || null
                };
            }
            return null;
        }).filter(i => i !== null);

        if (inserts.length > 0) await this.client.from('attendance').insert(inserts as any);
    }

    async getMonthlyAttendance(classId: string, month: number, year: number): Promise<AttendanceRecord[]> {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;

        // Pagination: Supabase mặc định giới hạn 1000 rows
        const PAGE_SIZE = 1000;
        let allData: any[] = [];
        let from = 0;

        while (true) {
            const { data, error } = await this.client
                .from('attendance')
                .select('*, students(student_code), attendance_statuses(code)')
                .eq('class_id', classId)
                .gte('date', startDate)
                .lte('date', endDate)
                .range(from, from + PAGE_SIZE - 1);

            if (error || !data || data.length === 0) break;
            allData = allData.concat(data);
            if (data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }

        if (allData.length === 0) return [];
        console.log(`[getMonthlyAttendance] Total rows fetched: ${allData.length} (pages: ${Math.ceil(allData.length / PAGE_SIZE)})`);

        const dateGroups = new Map<string, Record<string, AttendanceStatus>>();
        allData.forEach(r => {
            if (!dateGroups.has(r.date)) dateGroups.set(r.date, {});
            if (r.students?.student_code && r.attendance_statuses?.code) {
                dateGroups.get(r.date)![r.students.student_code] = r.attendance_statuses.code as AttendanceStatus;
            }
        });

        return Array.from(dateGroups.entries()).map(([date, absences]) => normalizeAttendanceRecord({
            id: `${classId}_${date}`,
            date: date,
            classId: classId,
            absences: absences,
            updatedBy: 'system',
            updatedAt: new Date().toISOString(),
            syncStatus: 'synced'
        } as any)) as any;
    }

    async getReportData(startDate: string, endDate: string, classIds?: string[]): Promise<AttendanceRecordV3[]> {
        // Pagination: Supabase mặc định giới hạn 1000 rows
        // Với trường 2500 HS, báo cáo tháng có thể >1000 ngoại lệ
        const PAGE_SIZE = 1000;
        let allData: any[] = [];
        let from = 0;

        this.emitLoadingStart('Đang truy vấn dữ liệu báo cáo...');
        try {
            while (true) {
                let query = this.client
                    .from('attendance')
                    .select('*')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .range(from, from + PAGE_SIZE - 1);

                if (classIds && classIds.length > 0) query = query.in('class_id', classIds);

                const { data, error } = await query;
                if (error) {
                    console.error('Supabase getReportData Error:', error);
                    break;
                }
                if (!data || data.length === 0) break;
                allData = allData.concat(data);
                if (data.length < PAGE_SIZE) break; // Hết dữ liệu
                from += PAGE_SIZE;
            }

            if (allData.length === 0) return [];
            console.log(`[getReportData] Total rows fetched: ${allData.length} (pages: ${Math.ceil(allData.length / PAGE_SIZE)})`);

            // Fetch extra info manually to map (chỉ 1 lần duy nhất)
            let studentsData: any[] = [];
            let stFrom = 0;
            while (true) {
                let stQuery = this.client.from('students').select('id, student_code, full_name').range(stFrom, stFrom + PAGE_SIZE - 1);
                if (classIds && classIds.length > 0) stQuery = stQuery.in('class_id', classIds);
                
                const { data } = await stQuery;
                if (!data || data.length === 0) break;
                studentsData = studentsData.concat(data);
                if (data.length < PAGE_SIZE) break;
                stFrom += PAGE_SIZE;
            }
            
            const { data: statuses } = await this.client.from('attendance_statuses').select('id, code');

            const stuMap = new Map(studentsData.map(s => [s.id, s]));
            const stMap = new Map(statuses?.map(s => [s.id, s.code]));

            return allData.map(r => {
                const stu = stuMap.get(r.student_id);
                const statusCode = stMap.get(r.status_id);
                
                return normalizeAttendanceRecord({
                    id: r.id,
                    classId: r.class_id,
                    studentId: stu?.student_code || r.student_id,
                    studentName: stu?.full_name || '',
                    status: statusCode as any,
                    date: r.date,
                    period: r.period,
                    session: r.session,
                    note: r.note,
                    markedBy: r.marked_by,
                    timestamp: r.created_at,
                    // === CÁC TRƯỜNG MỞ RỘNG TỪ DB ===
                    // batchMarkAttendance lưu các trường này, PHẢI truyền lên report.ts
                    statusNotes: r.status_notes || undefined,
                    missedPeriods: r.missed_periods || undefined,
                    violationNotes: r.violation_notes || undefined,
                    violationPeriods: r.violation_periods || undefined,
                    rewardNotes: r.reward_notes || undefined,
                    rewardPeriods: r.reward_periods || undefined,
                } as any);
            }) as any;
        } finally {
            this.emitLoadingEnd();
        }
    }

    async clearCurrentYearData(): Promise<void> {
        const yearId = await this.getActiveYearId();
        await this.client.from('classes').delete().eq('year_id', yearId);
        invalidateCachePrefix('supabase');
    }

    async mockGenerateAttendance(startDate: string, endDate: string, classIds?: string[]): Promise<void> {
        // Implementation for mock data
    }

    async clearAttendanceData(startDate?: string, endDate?: string, classIds?: string[]): Promise<void> {
        let query = this.client.from('attendance').delete();
        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);
        if (classIds && classIds.length > 0) query = query.in('class_id', classIds);
        await query;
        invalidateCachePrefix('supabase_attendance');
    }

    async updateManualClassSizes(year: string, updates: { id: string, manualStudentCount?: number, adjustmentCount?: number }[]): Promise<void> {
        console.log(`[SupabaseAdapter] updateManualClassSizes starting for ${updates.length} classes`);
        for (const update of updates) {
            const up: any = {};
            if (update.adjustmentCount !== undefined) up.adjustment_count = update.adjustmentCount;
            if (update.manualStudentCount !== undefined) up.manual_student_count = update.manualStudentCount;
            
            if (Object.keys(up).length > 0) {
                console.log(`[SupabaseAdapter] Updating class ${update.id}:`, up);
                const { error } = await this.client.from('classes').update(up).eq('id', update.id);
                if (error) {
                    console.error(`[SupabaseAdapter] Error updating class ${update.id}:`, error);
                    throw new Error(`Lỗi cập nhật lớp ${update.id}: ${error.message}`);
                }
            }
        }
        console.log(`[SupabaseAdapter] updateManualClassSizes completed successfully`);
        invalidateCachePrefix('supabase_classes');
    }
}
