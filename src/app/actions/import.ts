'use server';

import { db } from '@/services/db';
import { Class, Student } from '@/types/models';
import * as XLSX from 'xlsx';

// Helper: Normalize strings
const clean = (str: any) => String(str || '').trim();

export async function importSchoolData(formData: FormData) {
    const logs: string[] = [];
    const stats = { classes: 0, students: 0 };

    const log = (msg: string) => logs.push(msg);

    const file = formData.get('file') as File;
    if (!file) return { success: false, message: 'No file uploaded', logs };

    try {
        log(`📂 Đọc file: ${file.name}`);
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });

        // --- 1. QUÉT SHEET "CSDL" (SOURCE OF TRUTH) ---
        // Lý do: Sheet này chứa danh sách học sinh kèm Mã lớp (Cột C / "Mã lớp") chính xác nhất.
        // Không dùng sheet "Thong ke" nữa vì parse theo cột rất dễ sai sót.

        const sheetCSDL = wb.Sheets['CSDL'];
        if (!sheetCSDL) {
            return { success: false, message: 'Không tìm thấy sheet "CSDL"', logs };
        }

        log('👨‍🎓 Đang xử lý sheet "CSDL"...');

        // Đọc dữ liệu (Header ở dòng đầu tiên - Index 0)
        const rawData = XLSX.utils.sheet_to_json<any>(sheetCSDL, { range: 0 });

        const classMap = new Map<string, Class>();
        const students: Student[] = [];

        log(`📊 Tìm thấy ${rawData.length} dòng dữ liệu raw.`);

        for (const row of rawData) {
            const classId = clean(row['Mã lớp']);

            // Logic nhận diện lớp nghiêm ngặt:
            // 1. Phải có giá trị
            // 2. Độ dài >= 2 (tránh rác)
            // 3. Phải chứa cả SỐ và CHỮ (VD: 6A1). Loại bỏ các con số thống kê (40, 45...)
            if (classId && classId.length >= 2 && /[a-zA-Z]/.test(classId) && /\d/.test(classId)) {

                // --- TẠO HOẶC CẬP NHẬT LỚP ---
                if (!classMap.has(classId)) {
                    classMap.set(classId, {
                        id: classId,
                        name: classId,
                        // Tách khối từ tên (VD: 6A1 -> 6)
                        grade: parseInt(classId.replace(/\D/g, '').substring(0, 1)) || 0,
                        teacherId: '',
                        teacherName: '', // Sẽ cập nhật sau nếu tìm thấy
                        totalStudents: 0,
                        femaleCount: 0,
                        maleCount: 0,
                        classType: 'Normal'
                    });
                }

                const currentClass = classMap.get(classId)!;
                currentClass.totalStudents++;

                const gender = clean(row['Giới tính']);
                if (gender === 'Nữ') currentClass.femaleCount++;
                else currentClass.maleCount++;

                // --- TẠO HỌC SINH ---
                const stt = clean(row['STT']);
                const studentName = clean(row['Họ tên']);

                if (stt && studentName) {
                    const studentCode = `${classId}_${stt}`;
                    students.push({
                        code: studentCode,
                        classId: classId,
                        order: parseInt(stt) || 0,
                        fullName: studentName,
                        firstName: studentName, // Tạm lấy full name, có thể tách sau
                        lastName: '',
                        birthday: clean(row['Ngày sinh']),
                        gender: gender as any,
                        status: clean(row['Trạng thái HS']) as any,
                        ethnicity: clean(row['Dân tộc']),
                        govId: clean(row['Mã định danh Bộ GD&ĐT'])
                    });
                }
            }
        }

        log(`✅ Xác định được ${classMap.size} LỚP HỌC từ sheet CSDL.`);

        // --- 2. QUÉT SHEET "Thong ke" CHỈ ĐỂ LẤY TÊN GVCN (Optional) ---
        // Nếu không có sheet này hoặc lỗi thì thôi, vẫn giữ danh sách lớp từ CSDL
        const sheetThongKe = wb.Sheets['Thong ke'];
        if (sheetThongKe) {
            log('ℹ️ Đang rà soát tên GVCN từ sheet "Thong ke"...');
            const tkData = XLSX.utils.sheet_to_json<any[]>(sheetThongKe, { header: 1, range: 3 });

            for (const row of tkData) {
                // Quét qua các cột tìm xem có mã lớp nào trùng với danh sách đã có không
                for (let i = 0; i < row.length; i++) {
                    const cellVal = clean(row[i]);
                    if (classMap.has(cellVal)) {
                        // Nếu tìm thấy Tên lớp, thì ô bên cạnh (i+1) thường là Tên GVCN
                        const teacherName = clean(row[i + 1]);
                        if (teacherName && teacherName.length > 2) {
                            classMap.get(cellVal)!.teacherName = teacherName;
                        }
                    }
                }
            }
        } else {
            log('⚠️ Không thấy sheet "Thong ke", bỏ qua gán tên GVCN.');
        }

        // --- 3. LƯU DỮ LIỆU ---

        // Lưu Lớp
        const classesToSave = Array.from(classMap.values());
        // Sắp xếp lại cho đẹp trước khi lưu (Khối -> Tên)
        classesToSave.sort((a, b) => {
            if (a.grade !== b.grade) return a.grade - b.grade;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });

        for (const cls of classesToSave) {
            await db.createClass(cls);
        }
        stats.classes = classesToSave.length;
        log(`💾 Đã lưu ${classesToSave.length} lớp vào Database.`);

        // Lưu Học sinh
        await db.createStudents(students);
        stats.students = students.length;
        log(`💾 Đã lưu ${students.length} học sinh.`);

        return { success: true, message: 'Import hoàn tất!', logs, stats };

    } catch (error) {
        console.error('Import error:', error);
        log(`❌ Lỗi nghiêm trọng: ${(error as Error).message}`);
        return { success: false, message: 'Lỗi: ' + (error as Error).message, logs };
    }
}

export async function clearAllYearData() {
    try {
        await db.clearCurrentYearData();
        return { success: true, message: 'Đã xóa toàn bộ dữ liệu năm học hiện tại.' };
    } catch (e) {
        return { success: false, message: (e as Error).message };
    }
}
