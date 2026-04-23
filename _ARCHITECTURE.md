# 🗺️ BẢN ĐỒ DỰ ÁN KIẾN TRÚC
📅 Generated: 2026-04-23 19:40

⚠️ Lưu ý: Tài liệu phản ánh code tại thời điểm quét. Nếu codebase thay đổi đáng kể, cần chạy lại scanner.

## 0. 🎯 Mục đích – Bối cảnh – Ràng buộc hệ thống

**Mục đích cốt lõi**
Hệ thống quản lý điểm danh trực tuyến cho học sinh Trường THCS Trần Bội Cơ. Hỗ trợ giáo viên điểm danh nhanh, quản lý sĩ số, thời khóa biểu và xuất báo cáo dữ liệu.

**Bối cảnh dự án**
Hệ thống phục vụ quản lý nội bộ trường học (THCS Trần Bội Cơ), đối tượng là giáo viên, ban giám hiệu và cán sự lớp. Chuyển đổi từ Firebase sang Supabase PostgreSQL để quản lý dữ liệu tập trung.

**Ràng buộc quan trọng**
- **Business rules**: Chỉ cho phép chỉnh sửa điểm danh trong cửa sổ thời gian (`edit_window_minutes`).
- **Performance**: Cơ chế Exception-only cho điểm danh (chỉ lưu record khi vắng/trễ) giúp giảm tải DB.
- **Security**: Xác thực qua Supabase Auth (SSR). Phân quyền RBAC 6 cấp (admin, principal, supervisor, teacher, gvbm, monitor).

## 0.5 🚀 Quick Start (Cho Developer mới)

**1. Cài đặt môi trường**
- Node.js v18+
- File `.env.local` (Copy từ `.env.example` và điền URL/Key của Supabase).

**2. Lệnh thực thi chính**
- `npm install`: Cài đặt dependencies.
- `npm run dev`: Chạy app tại [http://localhost:8888](http://localhost:8888).
- `npm run dev:fresh`: Kill port 8888 và khởi động lại.

**3. Đồng bộ Database**
- Truy cập Supabase Dashboard > SQL Editor.
- Chạy script tại `scripts/sync-missing-columns.sql` để khởi tạo bảng và cột cần thiết.

## 1. 📁 Directory Structure (Cấu trúc thư mục)

/
├── src/
│   ├── app/                # [Vai trò]: Routes (Pages), API Routes và Server Actions
│   │   ├── actions/        # [Vai trò]: Logic nghiệp vụ phía Server (Server Actions)
│   │   ├── api/            # [Vai trò]: REST API Endpoints (v1)
│   │   └── (routes)/       # [Vai trò]: Giao diện người dùng (Attendance, Reports, Settings...)
│   ├── components/         # [Vai trò]: UI Components (Atomic design: dashboard, chat, ui...)
│   ├── services/           # [Vai trò]: Business Logic Layer (DB Adapters, Auth Guards, Services)
│   ├── lib/                # [Vai trò]: Shared Libraries (Supabase clients, middleware)
│   ├── context/            # [Vai trò]: React Context Providers (Auth, Chat, FeatureFlags)
│   ├── types/              # [Vai trò]: TypeScript Interfaces (Models, Attendance types)
│   └── utils/              # [Vai trò]: Helper functions & Transformers
├── scripts/                # [Vai trò]: SQL Migrations và DB Tools
└── package.json            # [Mục đích]: Quản lý dependencies và scripts

## 2. 🛠️ Tech Stack (Công nghệ sử dụng)

- **Framework**: Next.js 14.1.0 (App Router)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase SSR Auth
- **UI**: TailwindCSS, Lucide Icons, Radix UI
- **Logic**: TypeScript 5, exceljs (Export), recharts (Chart)

## 3. 🔄 Data Flow (Luồng dữ liệu chính)

**Luồng Điểm Danh (Exception-only)**
- User chọn trạng thái (Vắng/Trễ/Phép)
  → `src/components/attendance/attendance-row.tsx`
  → `markAttendance` (src/services/attendance-v3-service.ts)
  → `upsert` vào bảng `attendance` (Supabase)
  → Nếu trạng thái là "Có mặt" (C) → **DELETE** record khỏi bảng `attendance`.

**Luồng Authentication**
- Login Form (`src/app/login/page.tsx`) → `signInWithPassword` (src/services/supabase-auth-service.ts) → Cookies (SSR) → `AuthGuard` (src/components/auth-provider.tsx) xử lý redirect.

## 4. 📊 Database Schema Summary (Các bảng cốt lõi)

| Tên bảng | Mục đích | Cột chính |
|---|---|---|
| `attendance` | Lưu record vắng/trễ/phép | `student_id`, `class_id`, `status_id`, `date`, `session` |
| `profiles` | Thông tin giáo viên & phân quyền | `id`, `full_name`, `role`, `permissions`, `edit_window_minutes` |
| `classes` | Danh sách lớp học | `id`, `name`, `grade`, `year_id`, `actual_student_count` |
| `students` | Danh sách học sinh | `id`, `student_code`, `full_name`, `status`, `is_deleted` |
| `columns` | Các cột theo dõi tùy chỉnh | `id`, `class_id`, `name`, `frequency`, `suggestions` |
| `column_records` | Giá trị của các cột tùy chỉnh | `column_id`, `student_code`, `value`, `date` |
| `chat_messages` | Tin nhắn hỗ trợ realtime | `id`, `thread_id`, `sender_id`, `content`, `is_read` |

## 5. 🛠️ Development Conventions (Quy chuẩn code)

**1. Mô hình dữ liệu "Ngoại lệ" (Exception-only)**
- Chỉ lưu dữ liệu khi học sinh **không** có mặt.
- Học sinh có mặt = **Không có record trong DB**.
- Điều này giúp giảm 93% lượng ghi vào DB. Dev khi viết query báo cáo cần thực hiện `LEFT JOIN` và coi kết quả null là "Có mặt".

**2. Phân tầng Logic**
- `Adapter` (`src/services/supabase-adapter.ts`): Giao diện CRUD trực tiếp với Supabase.
- `Service` (`src/services/...`): Xử lý logic nghiệp vụ, tính toán, kiểm tra quyền.
- `Action` (`src/app/actions/...`): Entry point phía server cho UI, đóng gói logic để component gọi.

**3. Phân quyền (RBAC)**
- Luôn sử dụng `PermissionService` và `AuthGuard` để kiểm tra quyền.
- Không hard-code role (ví dụ: `if(role === 'admin')`) mà dùng permission flag (ví dụ: `if(canExport)`).

**4. Realtime**
- Sử dụng `supabase.channel()` với ID duy nhất (prefix + random) để tránh lỗi xung đột khi React mount/unmount.

---
🔍 **KNOWN LIMITATIONS**
File này được tạo tự động. Các giới hạn:
- Phản ánh code thực tế tại thời điểm quét.
- Không mô tả runtime behavior hoặc production infra chi tiết.
