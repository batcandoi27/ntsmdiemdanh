# MASTER PLAN: TỐI ƯU HÓA TOÀN DIỆN HIỆU NĂNG HỆ THỐNG ĐIỂM DANH (TRIAD CONSENSUS)
**Mã kế hoạch:** `PLAN-PERF-ATTENDANCE`  
**Hệ điều phối:** ai-dev-loop-orchestrator  
**Trạng thái:** CONSENSUS ACHIEVED (3/3 TRIAD VOTING)  
**Ngày phê chuẩn:** 2026-09-21  

---

## 1. MỤC TIÊU VÀ CHỈ SỐ CAM KẾT (SLO TARGETS)

| Chỉ số hiệu năng | Trước tối ưu (Baseline) | Cam kết sau tối ưu (Target SLO) | Tỷ lệ cải thiện |
|---|---|---|---|
| **Thời gian mở danh sách điểm danh** | 2.500ms – 5.000ms | **$\le$ 350ms** | Nhanh gấp **10 – 14 lần** |
| **Thời gian lưu điểm danh** | 5.000ms – 15.000ms | **$\le$ 400ms** | Nhanh gấp **15 – 35 lần** |
| **Số lượng Network Requests khi lưu** | 50 – 150 requests | **Đúng 1 – 2 requests** | Giảm **98% request** |
| **Số dòng database quét khi mở lớp** | 1.000 – 3.000 dòng (toàn trường) | **Chỉ đúng số em vắng (0 – 5 dòng)** | Giảm **99.5% DB load** |
| **Tỷ lệ bảo toàn logic cũ** | 100% | **100% (Strictly Preserve Existing Logic)** | Giữ nguyên vẹn |

---

## 2. KIẾN TRÚC THI HÀNH CHI TIẾT

```
[AttendanceSheet UI]
      │
      ├─► (1) Khi mở danh sách: Promise.all([getClassAndStudents, getColumns, getClassAttendance])
      │         │
      │         ▼
      │   [attendance-v3-service]
      │         │
      │         ├─► attendance rỗng? ─────────► [Early return [] in 0ms]
      │         └─► attendance có dữ liệu? ──► [Select students WHERE id IN (record_ids)]
      │
      └─► (2) Khi bấm Lưu:
                │
                ├─► Tính Dirty Diff (ô mới tích & ô vừa gỡ bỏ)
                │
                ├─► batchMarkAttendance(marks) ──► Song song hóa DELETE + UPSERT
                │
                └─► batchSyncDailyRecords(diff) ──► 1 Server Action duy nhất (Bulk Upsert & Scoped Delete)
```

### Module 1: Scoped Student Query & In-Memory Dictionary Cache
1. **File:** `src/services/attendance-v3-service.ts`
   - Sửa `getClassAttendance`:
     - Kiểm tra nếu `data.length === 0` -> Trả về `[]` ngay lập tức (Early Return).
     - Nếu `data.length > 0`: Thu thập `recordStudentIds = Array.from(new Set(data.map(r => r.student_id)))`.
     - Chỉ query: `dbClient.from('students').select('id, student_code, full_name').in('id', recordStudentIds)`.
   - Sửa tương tự cho `getAttendanceByClasses`.
   - Tạo bộ nhớ đệm `statusCache` có TTL 24h cho bảng `attendance_statuses` và `attendance_types`.

### Module 2: Song song hóa quá trình khởi tạo (Parallel Init)
1. **File:** `src/app/actions/common.ts`
   - Chuyển `getClassAndStudents` thành:
     ```typescript
     const [cls, students] = await Promise.all([
       db.getClass(classId),
       db.getStudentsByClass(classId)
     ]);
     ```
2. **File:** `src/components/attendance-sheet.tsx`
   - Khởi tạo đồng thời: `getClassAndStudents`, `getColumnsByFrequency`, và `getClassAttendance` bằng `Promise.all`.

### Module 3: Triệt tiêu cơn bão 135 Request Custom Columns
1. **File:** `src/services/record-service.ts` & `src/app/actions/record.ts` (hoặc trực tiếp trong `record-service.ts`):
   - Tạo hàm:
     ```typescript
     export async function batchSyncDailyRecords(
       classId: string,
       date: string,
       toInsert: { columnId: string; studentCode: string; selectedSuggestions: string[]; note?: string }[],
       toDeleteIds: string[]
     ): Promise<{ saved: number; deleted: number }>;
     ```
   - Bulk Upsert mảng `toInsert` trong 1 query PostgREST duy nhất (`upsert(rows, { onConflict: 'id' })`).
   - Xóa đúng danh sách `toDeleteIds` (`delete().in('id', toDeleteIds)`) để tránh race condition xóa nhầm giáo viên khác.
2. **File:** `src/components/attendance-sheet.tsx`:
   - Lưu trữ `initialCustomRecords` lúc load để tính toán Dirty Diff.
   - Khi bấm Save: Chỉ gom các ô chuyển từ False sang True và các ô chuyển từ True sang False gửi lên server trong 1 lời gọi duy nhất.

### Module 4: Tối ưu hóa ghi điểm danh `batchMarkAttendance`
1. **File:** `src/services/attendance-v3-service.ts`
   - Gom 3 câu lệnh delete reset chạy đồng thời bằng `Promise.all`:
     ```typescript
     await Promise.all([
       studentsToResetAttendance.length > 0 && dailyTypeId ? dbClient.from('attendance').delete().in('student_id', studentsToResetAttendance).eq('type_id', dailyTypeId).eq('date', dateKey).eq('session', input.session) : null,
       studentsToResetViolation.length > 0 && violationTypeId ? dbClient.from('attendance').delete().in('student_id', studentsToResetViolation).eq('type_id', violationTypeId).eq('date', dateKey).eq('session', input.session) : null,
       studentsToResetReward.length > 0 && rewardTypeId ? dbClient.from('attendance').delete().in('student_id', studentsToResetReward).eq('type_id', rewardTypeId).eq('date', dateKey).eq('session', input.session) : null,
     ].filter(Boolean));
     ```
   - Bọc toàn bộ khối Zalo alert trong `try...catch` độc lập chống unhandled rejection.

---

## 3. NGUYÊN TẮC BẢO TOÀN (STRICTLY PRESERVE EXISTING LOGIC)
- Toàn bộ cơ chế Exception-Only V3, logic hiển thị trên Mobile list, Desktop Block, Dialog điểm danh nhanh và các báo cáo xuất Excel / Word vẫn giữ nguyên 100% định dạng và tính chính xác nghiệp vụ.
