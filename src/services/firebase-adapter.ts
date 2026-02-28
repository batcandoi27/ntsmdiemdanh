import { DbAdapter } from './db-adapter';
import { Class, Student, User, AttendanceRecord } from '@/types/models';
import { db, auth, signInAnon } from '@/lib/firebase';
import {
    collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where, writeBatch
} from 'firebase/firestore';
import { getCached, setCache, invalidateCachePrefix } from './cache-service';

// Hardcode school ID for single-school MVP
// Hardcode school ID for single-school MVP
const SCHOOL_ID = 'default';
const CURRENT_YEAR = '2025-2026'; // Năm học mặc định

export class FirebaseAdapter implements DbAdapter {

    private async ensureAuth() {
        if (!auth.currentUser) {
            try {
                await signInAnon();
            } catch (e) {
                console.warn("Auto-auth failed:", e);
            }
        }
    }

    // --- System / Admin ---
    async clearCurrentYearData(): Promise<void> {
        await this.ensureAuth();
        console.log(`🔥 DELETING DATA FOR YEAR: ${CURRENT_YEAR}`);

        // 1. Delete Classes
        const classesRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes');
        const classesSnap = await getDocs(classesRef);
        const batch1 = writeBatch(db);
        classesSnap.docs.forEach(d => batch1.delete(d.ref));
        await batch1.commit();
        console.log(`Deleted ${classesSnap.size} classes.`);

        // 2. Delete Students (Batching needed for >500)
        const studentsRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'students');
        const studentsSnap = await getDocs(studentsRef);

        const CHUNK_SIZE = 400;
        const studentDocs = studentsSnap.docs;
        for (let i = 0; i < studentDocs.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = studentDocs.slice(i, i + CHUNK_SIZE);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
        console.log(`Deleted ${studentsSnap.size} students.`);

        // 3. Attendance (Optional - if needed to be strict reset)
        // Deleting subcollections is hard in client SDK without Admin SDK recursive delete.
        // For MVP, we ignore deep cleaning attendance OR we let user know it's partial.
        // But let's try to list recent dates? No, too complex. 
        // Just clearing Classes & Students is enough to "reset" the view.
    }


    // --- Classes ---
    async getClasses(): Promise<Class[]> {
        const CACHE_KEY = `classes_${SCHOOL_ID}_${CURRENT_YEAR}`;
        const cached = getCached<Class[]>(CACHE_KEY);
        if (cached) return cached;

        await this.ensureAuth();
        // Cấu trúc mới: schools/{schoolId}/years/{year}/classes
        const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes');
        const snap = await getDocs(colRef);
        const list = snap.docs.map(d => d.data() as Class);

        // Sắp xếp: Khối tăng dần (6->9) -> Tên lớp (6A1 -> 6A10)
        const sorted = list.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });

        setCache(CACHE_KEY, sorted);
        return sorted;
    }

    async getClass(id: string): Promise<Class | null> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes', id);
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as Class) : null;
    }

    async createClass(cls: Class): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes', cls.id);
        await setDoc(docRef, cls);
        invalidateCachePrefix(`classes_${SCHOOL_ID}`);
    }

    async updateClass(cls: Class): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes', cls.id);
        await setDoc(docRef, cls, { merge: true });
        invalidateCachePrefix(`classes_${SCHOOL_ID}`);
    }

    async deleteClass(id: string): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'classes', id);
        await deleteDoc(docRef);
        invalidateCachePrefix(`classes_${SCHOOL_ID}`);
        invalidateCachePrefix(`students_${SCHOOL_ID}_${CURRENT_YEAR}_${id}`);
    }

    // --- Students ---
    async getStudentsByClass(classId: string): Promise<Student[]> {
        const CACHE_KEY = `students_${SCHOOL_ID}_${CURRENT_YEAR}_${classId}`;
        const cached = getCached<Student[]>(CACHE_KEY);
        if (cached) return cached;

        await this.ensureAuth();
        // Updated path to match createStudents (years structure)
        const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'students');
        const q = query(colRef, where('classId', '==', classId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => d.data() as Student);

        const sorted = list.sort((a, b) => a.order - b.order);
        setCache(CACHE_KEY, sorted);
        return sorted;
    }

    async createStudents(students: Student[]): Promise<void> {
        await this.ensureAuth();

        const CHUNK_SIZE = 400;
        for (let i = 0; i < students.length; i += CHUNK_SIZE) {
            const batch = writeBatch(db);
            const chunk = students.slice(i, i + CHUNK_SIZE);
            const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'students');

            chunk.forEach(s => {
                const docRef = doc(colRef, s.code);
                batch.set(docRef, s);
            });

            await batch.commit();
            console.log(`Saved batch ${i / CHUNK_SIZE + 1} (${chunk.length} students)`);
        }
        invalidateCachePrefix(`students_${SCHOOL_ID}`);
    }

    async createStudent(student: Student): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'students', student.code);
        await setDoc(docRef, student);
        invalidateCachePrefix(`students_${SCHOOL_ID}_${CURRENT_YEAR}_${student.classId}`);
    }

    async updateStudent(student: Student): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'students', student.code);
        await setDoc(docRef, student, { merge: true });
        invalidateCachePrefix(`students_${SCHOOL_ID}_${CURRENT_YEAR}_${student.classId}`);
    }

    async deleteStudent(id: string): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'students', id);
        // Cần tìm ra student để biết thuộc classId nào nhằm invalidate đúng nhưng vì để đơn giản, clear toàn bộ tiền tố cache của học sinh cho an toàn
        // (Trong app thực tế có thể get trước để biết classId)
        await deleteDoc(docRef);
        invalidateCachePrefix(`students_${SCHOOL_ID}`);
    }

    // --- Teachers ---
    async getTeacher(id: string): Promise<User | null> {
        const docRef = doc(db, 'schools', SCHOOL_ID, 'users', id);
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as User) : null;
    }

    // --- Attendance ---
    async getAttendance(classId: string, date: string): Promise<AttendanceRecord | null> {
        // Path: schools/{schoolId}/years/{year}/attendance/{date}/records/{classId}
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'attendance', date, 'records', classId);
        const snap = await getDoc(docRef);
        return snap.exists() ? (snap.data() as AttendanceRecord) : null;
    }

    async saveAttendance(record: AttendanceRecord): Promise<void> {
        await this.ensureAuth();
        const docRef = doc(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'attendance', record.date, 'records', record.classId);
        await setDoc(docRef, record);
    }

    async getMonthlyAttendance(classId: string, month: number, year: number): Promise<any[]> {
        await this.ensureAuth();
        // Để hỗ trợ cả V1 (1 record = 1 class) và V3 (nhiều record học sinh / class),
        // ta query Collection records theo classId

        const promises = [];
        const daysInMonth = new Date(year, month, 0).getDate();

        // Optimization: Không fetch những ngày ở tương lai
        const today = new Date();
        const maxDay = (today.getFullYear() === year && today.getMonth() + 1 === month)
            ? Math.min(daysInMonth, today.getDate())
            : daysInMonth;

        const fetchDateRecords = async (dateStr: string) => {
            const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'attendance', dateStr, 'records');
            const q = query(colRef, where('classId', '==', classId));
            const snap = await getDocs(q);

            // Nếu có 1 doc ID khớp classId -> Có thể đây là V1
            const v1Doc = snap.docs.find(d => d.id === classId);
            if (v1Doc) {
                return v1Doc.data();
            }

            // Nếu không có, đây là mảng các record V3. 
            // Ta build ảo lại thành 1 record giả dạng V1 chứa mảng absences để tương thích component.
            const records = snap.docs.map(d => d.data());
            if (records.length === 0) return null;

            const absencesMap: Record<string, string> = {};
            records.forEach((r: any) => {
                if (r.studentId && r.status) {
                    absencesMap[r.studentId] = r.status;
                }
            });

            return {
                id: classId,
                classId: classId,
                date: dateStr,
                absences: absencesMap
            };
        };

        for (let d = 1; d <= maxDay; d++) {
            const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            promises.push(fetchDateRecords(dateStr));
        }

        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    }
    async getReportData(startDate: string, endDate: string, classIds?: string[]): Promise<AttendanceRecord[]> {
        await this.ensureAuth();
        const results: AttendanceRecord[] = [];

        // Helper to get dates in range
        const getDates = (start: string, end: string) => {
            const arr = [];
            let dt = new Date(start);
            const e = new Date(end);
            while (dt <= e) {
                arr.push(new Date(dt).toISOString().split('T')[0]);
                dt.setDate(dt.getDate() + 1);
            }
            return arr;
        };

        const dates = getDates(startDate, endDate);

        // Strategy:
        // Cấu trúc V3 mới: Collection `records` chứa danh sách từng điểm danh học sinh (ID dạng class_session_period_student)
        // chứ không còn là 1 document = 1 lớp như bản V1 cũ. Do đó, ta phải fetch getAllDocuments cho collection
        // sau đó filter theo classIds ở client, vì Firestore where(in) bị giới hạn 30 item và không hỗ trợ full filter dễ.

        const fetchAllForDate = async (date: string) => {
            try {
                const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'attendance', date, 'records');
                const snap = await getDocs(colRef);
                // Ép Kiểu về Any vì Record V3 và V1 có trường khác nhau, 
                // Inject biến date vào từng record để map ngược sang Report.ts 
                return snap.docs.map(d => ({ ...d.data(), date }) as any);
            } catch (e) {
                console.error("Error fetching report data for date", date, e);
                return [];
            }
        };

        // Chạy Promise song song lấy dữ liệu các ngày
        const promises = dates.map(async (date) => {
            let records = await fetchAllForDate(date);

            // Lọc theo classIds nếu người dùng chọn cụ thể các lớp
            if (classIds && classIds.length > 0) {
                records = records.filter(r => {
                    // Cả V1 và V3 đều có trường classId
                    return classIds.includes(r.classId);
                });
            }
            return records;
        });

        const dailyResults = await Promise.all(promises);
        dailyResults.forEach(dayRecords => results.push(...dayRecords));

        return results;
    }
    async mockGenerateAttendance(startDate: string, endDate: string, classIds?: string[]): Promise<void> {
        await this.ensureAuth();

        // 1. Get Classes to generate for
        let targetClasses: Class[] = [];
        if (classIds && classIds.length > 0) {
            // Fetch specific classes
            const all = await this.getClasses();
            targetClasses = all.filter(c => classIds.includes(c.id));
        } else {
            targetClasses = await this.getClasses();
        }

        // 2. Get Dates
        const getDates = (start: string, end: string) => {
            const arr = [];
            let dt = new Date(start);
            const e = new Date(end);
            while (dt <= e) {
                // Skip Sundays (0)
                if (dt.getDay() !== 0) {
                    arr.push(new Date(dt).toISOString().split('T')[0]);
                }
                dt.setDate(dt.getDate() + 1);
            }
            return arr;
        };
        const dates = getDates(startDate, endDate);

        // 3. Generate Data
        console.log(`Generating data for ${targetClasses.length} classes over ${dates.length} days...`);

        for (const cls of targetClasses) {
            const students = await this.getStudentsByClass(cls.id);
            if (students.length === 0) continue;

            const CHUNK_SIZE = 50; // Use smaller chunks for complex writes
            // We can process by date chunks

            for (const date of dates) {
                // Random Attendance Logic:
                // 90% Present (empty), 8% P, 2% K
                const absences: Record<string, any> = {};
                let hasAbsence = false;

                students.forEach(s => {
                    const r = Math.random();
                    if (r > 0.98) { // 2% K
                        absences[s.code] = 'K';
                        hasAbsence = true;
                    } else if (r > 0.90) { // 8% P
                        absences[s.code] = 'P';
                        hasAbsence = true;
                    }
                });

                if (hasAbsence) {
                    const record: AttendanceRecord = {
                        id: `${cls.id}_${date}`,
                        date: date,
                        classId: cls.id,
                        absences: absences,
                        updatedBy: 'system_mock',
                        updatedAt: new Date().toISOString(),
                        syncStatus: 'synced'
                    };
                    await this.saveAttendance(record);
                } else {
                    // Even if full attendance, we might want to save record to show "Checked"?
                    // Current logic: getAttendance returns null -> assume Full Present if not checked.
                    // But if we want to show it was CHECKED, we should save empty absences.
                    // Let's save empty record for 50% of full attendance days to simulate "Teacher checked"
                    if (Math.random() > 0.5) {
                        const record: AttendanceRecord = {
                            id: `${cls.id}_${date}`,
                            date: date,
                            classId: cls.id,
                            absences: {},
                            updatedBy: 'system_mock',
                            updatedAt: new Date().toISOString(),
                            syncStatus: 'synced'
                        };
                        await this.saveAttendance(record);
                    }
                }
            }
        }
    }

    async clearAttendanceData(startDate?: string, endDate?: string, classIds?: string[]): Promise<void> {
        await this.ensureAuth();

        // If no range, delete ALL? Hard in Firestore structure {year}/attendance/{date}/records
        // Must iterate all known dates? Or delete 'attendance' collection (requires Admin SDK).
        // User client SDK: Must know paths.

        // Strategy: Iterate reasonable date range.
        // If startDate/endDate not provided, assume "Current School Year" cleaning -> heavy.

        const start = startDate || '2025-08-01'; // Start of school year
        const end = endDate || new Date().toISOString().split('T')[0]; // Today

        const getDates = (s: string, e: string) => {
            const arr = [];
            let dt = new Date(s);
            const en = new Date(e);
            while (dt <= en) {
                arr.push(new Date(dt).toISOString().split('T')[0]);
                dt.setDate(dt.getDate() + 1);
            }
            return arr;
        };
        const dates = getDates(start, end);

        console.log(`Clearing attendance for ${dates.length} days...`);

        for (const date of dates) {
            const colRef = collection(db, 'schools', SCHOOL_ID, 'years', CURRENT_YEAR, 'attendance', date, 'records');
            const snap = await getDocs(colRef);

            const batch = writeBatch(db);
            let count = 0;
            snap.docs.forEach(d => {
                const data = d.data() as AttendanceRecord;
                if (!classIds || classIds.length === 0 || classIds.includes(data.classId)) {
                    batch.delete(d.ref);
                    count++;
                }
            });
            if (count > 0) {
                await batch.commit();
            }
        }
    }
}
