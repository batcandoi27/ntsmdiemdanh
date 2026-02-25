# 🗺️ Plan: Cải Tiến App Điểm Danh v3.0
Created: 2026-02-25
Updated: 2026-02-25 (v3 final – confirmed by Product Owner)
Status: 🟡 Planning

## Overview
Nâng cấp App Điểm Danh từ **công cụ cá nhân** thành **hệ thống quản lý lớp học nội bộ cho 1 trường** (1 deploy = 1 trường, không multi-tenant). Phục vụ **5 vai trò**, điểm danh theo thời khoá biểu (Sáng/Chiều), cung cấp **API + export đa định dạng** để handover cho k12online.vn hoặc Chrome extensions.

## Nguyên tắc thiết kế
- **Miễn phí 100%**: Firebase Spark (50K reads, 20K writes/ngày, 1GB storage)
- **1 Deploy = 1 Trường**: Không có `schoolId` trong documents. School info lưu ở env + export meta
- **Chỉ lưu ngoại lệ**: Điểm danh mặc định "Có mặt" → chỉ write vắng/trễ → giảm ~93% writes
- **Archive = Đổi con trỏ**: Không copy data cuối năm, tránh cháy quota Spark
- **Không tin client**: Service layer luôn check `assignedClassIds` + student status
- **Mobile-first**: GV dùng điện thoại → mọi action trong thumb-zone

## Tech Stack
- **Frontend**: Next.js 14 App Router + React 18 + TypeScript
- **UI**: Tailwind CSS + Lucide Icons
- **Database**: Firebase Firestore + Auth (Spark plan)
- **Export**: ExcelJS (multi-sheet) + jszip + file-saver
- **API**: Next.js API Routes (`/api/v1/*`) + next-rate-limit
- **Deploy**: Vercel hobby / Cloudflare Pages

---

## Phases

| Phase | Name | Priority | Effort | Status |
|-------|------|----------|--------|--------|
| 01 | Firebase Auth + RBAC 5 cấp | P0 CRITICAL | 6 ngày | ⬜ Pending |
| 02 | Student Status + Sĩ số thực tế | P1 HIGH | 3 ngày | ⬜ Pending |
| 03 | Timetable (Sáng/Chiều + Import Excel) | P1 HIGH | 5 ngày | ⬜ Pending |
| 04 | Attendance Refactor (tiết + buổi) | P1 HIGH | 5 ngày | ⬜ Pending |
| 05 | Export đa định dạng (Excel/JSON/ZIP) | P2 MEDIUM | 3 ngày | ⬜ Pending |
| 06a | API Endpoints – MVP (4 endpoints) | P2 MEDIUM | 2 ngày | ⬜ Pending |
| 06b | API Endpoints – Full (5 endpoints còn lại) | P3 LOW | 2 ngày | ⬜ Pending |
| 07 | Year Archiving (đổi con trỏ) | P2 MEDIUM | 2 ngày | ⬜ Pending |
| 08 | Mobile UX Polish | P2 MEDIUM | 2 ngày | ⬜ Pending |
| 09 | Nice-to-have (Zalo, PWA, PDF in ấn) | P3 LOW | 3 ngày | ⬜ Pending |
| 10 | Testing & UAT | P0 | 3 ngày | ⬜ Pending |

**Tổng: ~36 ngày (7-8 tuần)**

---

## Phase 01: Firebase Auth + RBAC 5 Cấp ⚡ CRITICAL

### 5 vai trò:

| Role | Code | Điểm danh | Xem | Quản lý HS | Quản lý user |
|------|------|-----------|-----|------------|--------------|
| Admin (IT) | `admin` | ✅ | Tất cả | ✅ | ✅ Tất cả |
| Hiệu trưởng/PHT | `principal` | ❌ | Tất cả | ✅ | ✅ GV+Giám thị |
| Giám thị | `supervisor` | ✅ Khối/trường tuỳ assign | Khối/trường | ❌ | ❌ |
| Giáo viên | `teacher` | ✅ Lớp mình | Lớp mình | ✅ (active↔temp) | ❌ |
| Ban Cán Sự | `class_monitor` | ✅ Lớp mình (30 phút sửa) | Lớp mình | ❌ | ❌ |

### Schema:
```
users/{uid}
  email: string
  displayName: string
  role: 'admin' | 'principal' | 'supervisor' | 'teacher' | 'class_monitor'
  assignedClassIds: string[]
  assignedGrade?: string       // Supervisor: 'grade_10' | 'all'
  permissions: {
    canEditAttendance: boolean,
    canEditStudentStatus: boolean,
    canCreateAccounts: boolean,
    canViewAllClasses: boolean,
    canExportData: boolean,
    canManageTimetable: boolean,
    canAccessAPI: boolean
  }
  studentCode?: string         // Class Monitor only: mã HS dùng làm username đăng nhập
  editWindowMinutes: number    // class_monitor: 30, teacher: 1440 (1 ngày), admin: -1 (vô hạn)
  isActive: boolean
```

> **Không có `schoolId`** trong documents – school info lấy từ env `NEXT_PUBLIC_SCHOOL_NAME`.
> **Ban Cán Sự đăng nhập** bằng **mã HS** (VD: `hs8a13_01`) + password đơn giản do GV set. Không cần email.

### Security rules:
- **Scope check bắt buộc**: Mọi service function phải gọi `checkClassAccess(userId, classId)` – không chỉ dựa UI
- **Edit window**: `class_monitor` chỉ sửa record trong 30 phút, `teacher` trong cùng ngày
- **Class Monitor không được xoá** record cũ, chỉ tạo mới hoặc sửa trong window

### Tasks:
- [ ] Type definitions: `UserRole`, `UserPermissions`, `AppUser`
- [ ] `AuthContext` provider thay thế PasswordGuard
- [ ] Login page mới (email/password)
- [ ] Middleware `checkClassAccess(userId, classId)` cho service layer
- [ ] Logic `editWindowMinutes` theo role
- [ ] Settings → Tab "Quản lý người dùng" (Admin/Principal only)
- [ ] Form tạo Ban Cán Sự: GV chọn HS → tạo account (username = mã HS, password do GV set)
- [ ] Header: avatar + role badge + logout
- [ ] Bottom nav ẩn/hiện theo role
- [ ] Firebase Security Rules
- [ ] `scripts/setup.sh` – Auto init: tạo admin + deploy rules + seed school name
- [ ] Giảm clone từ 7 bước → 3 bước (clone → .env → `npm run setup`)

---

## Phase 02: Student Status + Sĩ Số Thực Tế

### 5 trạng thái:
| Status | Sĩ số | Điểm danh | Quyền đổi |
|--------|-------|-----------|-----------|
| `active` | ✅ Đếm | ✅ Có thể | Tất cả |
| `temporary_leave` | ✅ Đếm (hiện mờ) | ❌ Disabled | Teacher, Principal |
| `dropped_out` | ❌ Không đếm | ❌ Block cứng | Principal only |
| `suspended` | ❌ Không đếm | ❌ Block cứng | Principal only |
| `graduated` | ❌ Không đếm | ❌ Block cứng | System (auto) |

> **Sĩ số thực tế** = active + temporary_leave. Card lớp hiện "33/35 HS".

### Hard rules (backend):
- **Firestore Rules + Service**: `DENY write attendance` cho student có status ∉ `['active']`
- Không có ngoại lệ – tránh rác data + sai báo cáo

### Tasks:
- [ ] Thêm fields: `status`, `statusNote`, `statusDate`, `statusExpectedReturn`, `statusHistory[]`
- [ ] Migration script: set ALL existing students = `'active'`
- [ ] `StudentService`: CRUD status + history log (ai đổi, lúc nào, lý do)
- [ ] `getActualStudentCount(classId)`: đếm active + temp_leave
- [ ] **Backend rule**: block attendance writes cho HS không active
- [ ] UI card lớp: "33/35 HS" (thực tế / tổng)
- [ ] Bottom sheet "Đổi trạng thái" (long-press HS)
- [ ] Grid: row mờ cho temp_leave, ẩn dropped_out/suspended
- [ ] Summary bar tính trên sĩ số thực tế
- [ ] Reports filter theo status

---

## Phase 03: Timetable (Sáng/Chiều + Import Excel) 📅

### Schema:
```
years/{year}/timetables/{timetableId}
  classId: string
  className: string
  effectiveFrom: Date         // Hỗ trợ NHIỀU ĐỢT
  effectiveTo: Date
  schedule: {
    monday: {
      morning: [{ period, subject, subjectCode, teacherName, teacherId, room }],  // Tối đa 5 tiết
      afternoon: [...]  // Tối đa 5 tiết. null nếu ngày đó không học chiều
    },
    tuesday: { morning: [...], afternoon: [...] },
    ...
  }
  createdBy: userId
  updatedAt: Date
```

### Conflict detection khi import/tạo:
- ❌ GV dạy 2 lớp cùng tiết → Cảnh báo + highlight dòng lỗi
- ❌ Lớp có 2 môn cùng tiết → Cảnh báo
- ⚠️ Lớp chỉ đăng ký sáng nhưng có tiết chiều → Cảnh báo (cho phép override)

### 2 template Excel import:
| Template | Mục đích | Format |
|----------|----------|--------|
| **A: Pivot** (như k12online) | Cho GV/Admin nhìn quen | Buổi × Tiết × Thứ (mỗi sheet = 1 lớp) |
| **B: Flat list** | Cho IT import hàng loạt | 1 dòng = 1 tiết (nhiều lớp 1 sheet) |

### Tasks:
- [ ] Types: `Timetable`, `PeriodSlot`, `DaySchedule` (morning/afternoon)
- [ ] `TimetableService`: CRUD + query by classId + date (auto chọn đợt đúng)
- [ ] Settings → Tab "Thời Khoá Biểu" (Admin/Principal)
- [ ] Form editor manual: Buổi → Thứ → sửa tiết
- [ ] **Excel template download** (2 templates: Pivot + Flat)
- [ ] **Import Excel**: parse + **conflict detection** + preview + confirm
- [ ] **Export TKB** ra Excel
- [ ] Copy TKB giữa lớp cùng khối
- [ ] Logic chọn đợt TKB đúng theo ngày hiện tại
- [ ] View read-only cho Teacher/ClassMonitor

---

## Phase 04: Attendance Refactor (tiết + buổi) ✅

### Nguyên tắc:
- **Mặc định Có mặt** → KHÔNG write DB cho HS có mặt
- Chỉ write record cho vắng/trễ/phép → giảm ~93% writes
- **Mặc định: điểm danh "Cả ngày"** (chiếm 99% trường hợp)
- "Theo tiết" chỉ dùng khi HS vắng 1 tiết cá biệt (hiếm)
- Hỗ trợ ngày học **cả Sáng lẫn Chiều** (2 lần điểm danh/ngày)

### Schema:
```
years/{year}/attendance/{date}/records/{classId}_{session}_{period}_{studentId}
  classId, studentId: string
  session: 'morning' | 'afternoon'   // Bắt buộc nếu lớp học cả 2 buổi
  period: number | null              // null = CẢ BUỔI (mặc định, 99%)
  status: 'absent' | 'late' | 'excused'
  subject?: string                   // Chỉ có khi period != null
  note?: string
  markedBy: userId
  markedByRole: UserRole
  timestamp: Date
```

### Pre-conditions (hard rules):
- ✅ Student must have `status == 'active'` (check từ Phase 02)
- ✅ User must have `classId ∈ assignedClassIds` (check từ Phase 01)
- ✅ Edit window: class_monitor 30 phút, teacher cùng ngày

### Tasks:
- [ ] ⚠️ **Backup toàn bộ Firestore ra JSON TRƯỚC migration**
- [ ] Update attendance types + record-service
- [ ] UI mặc định: "**Cả buổi**" (không cần chọn tiết)
- [ ] Selector **Buổi** (Sáng/Chiều) – hiện khi lớp học cả 2 buổi → 2 lần điểm danh/ngày
- [ ] Option "**Theo tiết**" (nút nhỏ, ít dùng) → dropdown tiết 1-5 cho trường hợp cá biệt
- [ ] Logic chỉ write records cho vắng/trễ
- [ ] Optimistic UI + debounce save
- [ ] Summary bar tính từ sĩ số thực tế
- [ ] Migration data cũ: xoá records có status = 'present'
- [ ] Reports: aggregate theo tiết/buổi/môn
- [ ] Class Monitor điểm danh: cùng flow, limited edit window

---

## Phase 05: Export Đa Định Dạng (Excel / JSON / ZIP) 📊

### 2 format chính (PDF dời sang Phase 09):
| Format | Mục đích | Thư viện |
|--------|----------|----------|
| **Excel (.xlsx)** | Báo cáo BGH, lưu trữ | ExcelJS |
| **JSON** | k12online, Chrome ext, app khác | Native |

### Excel multi-sheet (6 sheets):
1. Danh sách HS (kèm status, sĩ số thực tế)
2. Điểm danh (pivot Ngày × HS, có buổi + tiết)
3. Vi phạm / Khen thưởng
4. Custom Columns Data
5. Thời Khoá Biểu
6. Lịch sử Status HS

### ZIP bundle:
- Nút "Tải ZIP tổng hợp" → `Data_2025_2026.zip` chứa:
  - `DanhSachHS.xlsx` + `DiemDanh.xlsx` + `TKB.xlsx` + `FullData.json`
- Dùng **jszip** (client-side, ~100KB)

### Tasks:
- [ ] Export settings UI: chọn format + data range + sheets
- [ ] ExcelJS multi-sheet builder (6 sheets)
- [ ] JSON export (full dump + selective)
- [ ] **Import JSON** (restore hoặc migrate)
- [ ] ZIP bundle (jszip)
- [ ] "Export Full Data" cho Admin, "Export lớp" cho Teacher
- [ ] Format đẹp: bold header, freeze pane, auto-width

---

## Phase 06a: API Endpoints – MVP 🔌

> 4 endpoints cốt lõi, đủ 80% use case.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/classes` | Danh sách lớp (theo quyền) |
| GET | `/api/v1/classes/{id}/students` | DS học sinh |
| GET | `/api/v1/attendance/{date}/{classId}` | Điểm danh 1 lớp 1 ngày |
| GET | `/api/v1/export/json` | Export full JSON (Admin) |

### Security:
- Firebase Auth token verify server-side
- **Rate limiting**: `next-rate-limit` (100 req/phút/IP)
- **API key** cho Chrome extension (generate trong Settings, lưu Firestore `apiKeys/{key}`)
- CORS config cho extensions

### Tasks:
- [ ] API auth middleware (Firebase token verify)
- [ ] Rate limiting middleware
- [ ] API key generation (Settings → Tab API, Admin only)
- [ ] 4 endpoints trên
- [ ] `docs/API.md` + Postman collection (không cần web docs page)

---

## Phase 06b: API Endpoints – Full

> 5 endpoints còn lại, làm sau UAT.

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/v1/attendance/{date}` | Điểm danh toàn trường 1 ngày |
| GET | `/api/v1/reports/summary` | Báo cáo nhanh |
| GET | `/api/v1/reports/class/{id}` | Báo cáo chi tiết lớp |
| GET | `/api/v1/timetable/{classId}` | TKB lớp |
| POST | `/api/v1/attendance/bulk` | Nhập điểm danh hàng loạt |

---

## Phase 07: Year Archiving (Đổi Con Trỏ) 📦

> **KHÔNG copy data** → tránh cháy quota Spark (20K writes/ngày).

### Cơ chế:
```
settings/app → { activeYear: '2025-2026' }

Khi Admin tạo năm mới:
1. Tạo document settings/app.activeYear = '2026-2027'
2. Tạo structure years/2026-2027/... (rỗng)
3. Auto set lớp 12 → status: 'graduated'
4. Năm cũ tự động read-only (check activeYear)
→ TỔNG WRITES: ~35 (1 settings + ~33 classes + HS lớp 12)
```

### Option bổ sung: "Export & Purge"
- Khi storage gần 1GB → Admin export ZIP năm cũ → xoá collection năm cũ
- Giải phóng storage → kéo dài tuổi thọ Spark plan

### Tasks:
- [ ] `settings/app` document: `activeYear`, `schoolName`
- [ ] Settings → "Tạo năm học mới" + "Kết thúc năm học" (Admin/Principal)
- [ ] Logic read-only cho năm không active
- [ ] Dropdown chọn năm học trong header
- [ ] Auto graduate lớp 12
- [ ] Optional: "Export & Purge năm cũ" khi gần đầy storage

---

## Phase 08: Mobile UX Polish 📱

### Tasks:
- [ ] Bottom Navigation 5 tabs – ẩn/hiện theo role
- [ ] Haptic feedback khi tap status
- [ ] Swipe actions (ghi chú, báo vi phạm)
- [ ] Buổi/Tiết selector dạng bottom sheet
- [ ] Card lớp hiển thị "33/35 HS" + badge "Chưa điểm danh"
- [ ] Animations + thumb-zone optimization

---

## Phase 09: Nice-to-have ⭐

### Tasks:
- [ ] Copy text gửi Zalo PHHS
- [ ] Ghi chú nhanh lý do vắng (inline)
- [ ] PWA manifest + offline queue
- [ ] Nhắc GV/ClassMonitor chưa điểm danh
- [ ] Keyboard shortcuts Desktop
- [ ] **PDF in ấn** (jsPDF + autoTable): sổ điểm danh tháng, danh sách HS

---

## Phase 10: Testing & UAT 🧪

### Tasks:
- [ ] Test Security Rules (Firebase Emulator, 5 roles)
- [ ] Test scope check: Teacher truy cập lớp khác → deny
- [ ] Test edit window: Class Monitor sửa record cũ → deny
- [ ] Test block writes: HS dropped_out tạo attendance → deny
- [ ] UAT: 1 Admin, 1 Principal, 1 Supervisor, 2 Teachers, 2 ClassMonitors
- [ ] Test clone trường giả (`npm run setup`)
- [ ] Test import TKB Excel (conflict detection)
- [ ] Test API endpoints (Postman)
- [ ] Monitor quota (alert 80%)
- [ ] User guide cho 5 roles
- [ ] Rollback plan

---

## Ước Tính Firebase Spark Usage

| Metric | Trước | Sau | Limit Spark |
|--------|-------|-----|-------------|
| Writes/ngày | 5,000-10,000 | ~500 | 20,000 ✅ |
| Reads/ngày | ~6,000 | ~500 | 50,000 ✅ |
| Storage | Tăng liên tục | Kiểm soát (purge option) | 1 GB ✅ |
| Archive writes | 15,000-25,000 (cháy!) | ~35 (đổi con trỏ) | 20,000 ✅ |

---

## Clone Cho Trường Khác (3 bước)
```
1. git clone repo + npm install
2. Tạo Firebase project → copy keys vào .env.local
3. npm run setup    ← Auto: init admin + deploy rules + seed school
→ Thời gian: < 15 phút
```

---

## Quick Commands
- Thiết kế DB/API: `/design`
- Code phase 01: `/code phase-01`
- Tiến độ: `/next`
