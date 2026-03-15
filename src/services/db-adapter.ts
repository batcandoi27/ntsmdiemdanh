import { Class, Student, User, AttendanceRecord, AttendanceStatus } from "@/types/models";

export interface DbAdapter {
    // Lớp học
    getClasses(options?: { isPersonal?: boolean; ownerId?: string }): Promise<Class[]>;
    getClass(id: string): Promise<Class | null>;
    createClass(cls: Class): Promise<void>;
    updateClass(cls: Class): Promise<void>;
    deleteClass(id: string): Promise<void>;

    // Học sinh
    getStudentsByClass(classId: string): Promise<Student[]>;
    createStudents(students: Student[]): Promise<void>;
    createStudent(student: Student): Promise<void>;
    updateStudent(student: Student): Promise<void>;
    deleteStudent(id: string): Promise<void>;

    // Giáo viên
    getTeacher(id: string): Promise<User | null>;

    // Điểm danh
    getAttendance(classId: string, date: string): Promise<AttendanceRecord | null>;
    saveAttendance(record: AttendanceRecord): Promise<void>;
    getMonthlyAttendance(classId: string, month: number, year: number): Promise<AttendanceRecord[]>;

    // System
    clearCurrentYearData(): Promise<void>;

    // Reporting
    // Reporting
    getReportData(startDate: string, endDate: string, classIds?: string[]): Promise<AttendanceRecord[]>;

    // Debug / Tools
    mockGenerateAttendance(startDate: string, endDate: string, classIds?: string[]): Promise<void>;
    clearAttendanceData(startDate?: string, endDate?: string, classIds?: string[]): Promise<void>;
    updateManualClassSizes(year: string, updates: { id: string, manualStudentCount: number }[]): Promise<void>;
}
