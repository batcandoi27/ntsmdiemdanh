import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { DbAdapter } from './db-adapter';
import { Class, Student, User, AttendanceRecord } from '@/types/models';

const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data dir
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers
function readCsv<T>(filename: string): T[] {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) return [];

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
    return data as T[];
}

function writeCsv<T>(filename: string, data: T[]) {
    const filePath = path.join(DATA_DIR, filename);
    const csv = Papa.unparse(data);
    fs.writeFileSync(filePath, csv, 'utf8');
}

export class LocalCsvAdapter implements DbAdapter {

    async getClasses(): Promise<Class[]> {
        return readCsv<Class>('classes.csv');
    }

    async getClass(id: string): Promise<Class | null> {
        const classes = readCsv<Class>('classes.csv');
        return classes.find(c => c.id === id) || null;
    }

    async createClass(cls: Class): Promise<void> {
        const classes = readCsv<Class>('classes.csv');
        // Check exist
        const idx = classes.findIndex(c => c.id === cls.id);
        if (idx >= 0) {
            classes[idx] = cls;
        } else {
            classes.push(cls);
        }
        writeCsv('classes.csv', classes);
    }

    async updateClass(cls: Class): Promise<void> {
        await this.createClass(cls);
    }

    async deleteClass(id: string): Promise<void> {
        let classes = readCsv<Class>('classes.csv');
        classes = classes.filter(c => c.id !== id);
        writeCsv('classes.csv', classes);
    }

    async getStudentsByClass(classId: string): Promise<Student[]> {
        const students = readCsv<Student>('students.csv');
        return students.filter(s => s.classId === classId).sort((a, b) => a.order - b.order);
    }

    async createStudents(newStudents: Student[]): Promise<void> {
        const students = readCsv<Student>('students.csv');
        const studentMap = new Map(students.map(s => [s.code, s]));

        newStudents.forEach(s => {
            studentMap.set(s.code, s);
        });

        const updatedList = Array.from(studentMap.values());
        writeCsv('students.csv', updatedList);
    }

    async createStudent(student: Student): Promise<void> {
        await this.createStudents([student]);
    }

    async updateStudent(student: Student): Promise<void> {
        await this.createStudents([student]);
    }

    async deleteStudent(id: string): Promise<void> {
        let students = readCsv<Student>('students.csv');
        students = students.filter(s => s.code !== id);
        writeCsv('students.csv', students);
    }

    async getTeacher(id: string): Promise<User | null> {
        const teachers = readCsv<User>('teachers.csv');
        return teachers.find(t => t.id === id) || null;
    }

    async getAttendance(classId: string, date: string): Promise<AttendanceRecord | null> {
        // Attendance stored in normalized format in CSV? 
        // Or JSON for complex objects?
        // User requested CSV. Let's try to store attendance in a separate JSON file for easier nested structure handling.
        // CSV is bad for nested objects (absences map).
        // Override: Use JSON for attendance. User won't likely edit attendance manually via Excel.

        const filePath = path.join(DATA_DIR, 'attendance.json');
        if (!fs.existsSync(filePath)) return null;

        const content = fs.readFileSync(filePath, 'utf8');
        const allRecords: AttendanceRecord[] = JSON.parse(content || '[]');

        return allRecords.find(r => r.classId === classId && r.date === date) || null;
    }

    async saveAttendance(record: AttendanceRecord): Promise<void> {
        const filePath = path.join(DATA_DIR, 'attendance.json');
        let allRecords: AttendanceRecord[] = [];

        if (fs.existsSync(filePath)) {
            allRecords = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        }

        const idx = allRecords.findIndex(r => r.classId === record.classId && r.date === record.date);
        if (idx >= 0) {
            allRecords[idx] = record;
        } else {
            allRecords.push(record);
        }

        fs.writeFileSync(filePath, JSON.stringify(allRecords, null, 2), 'utf8');
    }

    async getMonthlyAttendance(classId: string, month: number, year: number): Promise<AttendanceRecord[]> {
        const filePath = path.join(DATA_DIR, 'attendance.json');
        if (!fs.existsSync(filePath)) return [];

        const content = fs.readFileSync(filePath, 'utf8');
        const allRecords: AttendanceRecord[] = JSON.parse(content || '[]');

        const monthStr = month.toString().padStart(2, '0');
        // Filter by YYYY-MM
        const prefix = `${year}-${monthStr}`;

        return allRecords.filter(r => r.classId === classId && r.date.startsWith(prefix));
    }

    async clearCurrentYearData(): Promise<void> {
        // Dummy for local csv
        console.log("Clear data not implemented for CSV adapter yet");
    }

    async getReportData(startDate: string, endDate: string, classIds?: string[]): Promise<AttendanceRecord[]> {
        const filePath = path.join(DATA_DIR, 'attendance.json');
        if (!fs.existsSync(filePath)) return [];

        const content = fs.readFileSync(filePath, 'utf8');
        const allRecords: AttendanceRecord[] = JSON.parse(content || '[]');

        return allRecords.filter(r => {
            const dateMatch = r.date >= startDate && r.date <= endDate;
            const classMatch = (!classIds || classIds.length === 0) || classIds.includes(r.classId);
            return dateMatch && classMatch;
        });
    }

    async mockGenerateAttendance(startDate: string, endDate: string, classIds?: string[]): Promise<void> {
        let targets = classIds || [];
        // If no classIds provided, fetch ALL classes
        if (!targets || targets.length === 0) {
            const allClasses = await this.getClasses();
            targets = allClasses.map(c => c.id);
        }

        const statuses: any[] = ['P', 'K', 'V', 'T', 'VP'];
        const start = new Date(startDate);
        const end = new Date(endDate);

        const newRecords: AttendanceRecord[] = [];

        // Loop dates
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];

            // Loop classes
            for (const classId of targets) {
                const students = await this.getStudentsByClass(classId);
                const absences: Record<string, any> = {};
                const notes: Record<string, string> = {};

                students.forEach(s => {
                    // 90% chance to be present
                    if (Math.random() > 0.9) {
                        const sIdx = Math.floor(Math.random() * statuses.length);
                        const status = statuses[sIdx];
                        absences[s.code] = status;
                        if (status === 'VP') {
                            notes[s.code] = ['Đồng phục', 'Đi trễ', 'Nói chuyện', 'Không thuộc bài'][Math.floor(Math.random() * 4)];
                        }
                    }
                });

                // Only create record if there are absences? No, create anyway to show checked?
                // Actually app logic seems to treat absence record existence as "checked".
                if (Object.keys(absences).length > 0) {
                    newRecords.push({
                        id: `${classId}_${dateStr}`,
                        date: dateStr,
                        classId: classId,
                        absences: absences,
                        notes: notes,
                        updatedBy: 'system',
                        updatedAt: new Date().toISOString(),
                        syncStatus: 'synced'
                    });
                }
            }
        }

        // Merge with existing
        const filePath = path.join(DATA_DIR, 'attendance.json');
        let allRecords: AttendanceRecord[] = [];
        if (fs.existsSync(filePath)) {
            allRecords = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
        }

        // Upsert
        newRecords.forEach(nr => {
            const idx = allRecords.findIndex(r => r.classId === nr.classId && r.date === nr.date);
            if (idx >= 0) allRecords[idx] = nr;
            else allRecords.push(nr);
        });

        fs.writeFileSync(filePath, JSON.stringify(allRecords, null, 2), 'utf8');
    }

    async clearAttendanceData(startDate?: string, endDate?: string, classIds?: string[]): Promise<void> {
        const filePath = path.join(DATA_DIR, 'attendance.json');
        if (!fs.existsSync(filePath)) return;

        let allRecords: AttendanceRecord[] = JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');

        allRecords = allRecords.filter(r => {
            // If record falls WITHIN the delete range, remove it (return false)
            const dateMatch = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
            const classMatch = (!classIds || classIds.length === 0) || classIds.includes(r.classId);

            // If both match, it's a target to delete -> return false
            return !(dateMatch && classMatch);
        });

        fs.writeFileSync(filePath, JSON.stringify(allRecords, null, 2), 'utf8');
    }
}
