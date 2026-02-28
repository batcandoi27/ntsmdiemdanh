# 🗺️ BẢN ĐỒ DỰ ÁN KIẾN TRÚC
📅 Generated: 2026-02-26 14:06

⚠️ Lưu ý: Tài liệu phản ánh code tại thời điểm quét. Nếu codebase thay đổi đáng kể, cần chạy lại scanner.

## 0. 🎯 Mục đích – Bối cảnh – Ràng buộc hệ thống
**Mục đích cốt lõi**
Ứng dụng quản lý điểm danh, sổ theo dõi thông minh, tra cứu học sinh và lập báo cáo chi tiết dành cho trường học.

**Bối cảnh dự án**
❌ Không có mô tả chính thức trong codebase.
Quan sát trực tiếp từ code: Hệ thống phục vụ đánh giá - theo dõi nội bộ của THCS Trần Bội Cơ, với phân quyền rõ ràng 5 role (ban giám hiệu, giám thị, giáo viên, v.v.).

**Ràng buộc quan trọng**
- **Công nghệ bắt buộc**: Next.js 14.1.0, React 18, Firebase môi trường client/server.
- **Business rules**: Quyền hạn và thời gian được sửa điểm danh dựa cứng theo cơ chế RBAC và cấu hình (1440 phút cho giáo viên, 30 phút cho cán sự lớp) được hardcode trong `models.ts` và `auth-guard.ts`.

## 1. 📁 Directory Structure (Cấu trúc thư mục)
/
├── public/                 # Giao diện: Chứa tài nguyên tĩnh tải lên (ảnh, icons)
├── src/
│   ├── app/                # Application: Next.js App Router (Định tuyến, Pages, Server Actions)
│   │   ├── actions/        # API Controller: Các logic server side phân giải yêu cầu
│   │   ├── api/            # Route Handlers: Các endpoint dùng như API nội bộ
│   │   ├── attendance/     # Feature: Trang sơ đồ điểm danh
│   │   ├── classes/        # Feature: Quản lý danh sách lớp và sổ theo dõi (monitor)
│   │   ├── import/         # Feature: Nhập dữ liệu học sinh hàng loạt từ Excel
│   │   ├── login/          # Feature: Đăng nhập
│   │   ├── monitor/        # Feature: Dashboard các cột điểm của lớp
│   │   ├── quick-attendance/ # Feature: Điểm danh nhanh trên mobile
│   │   ├── reports/        # Feature: Màn hình báo cáo phân tích
│   │   └── settings/       # Feature: Cài đặt hệ thống, DB và các cột tuỳ chỉnh
│   ├── components/         # Giao diện: Component UI tái sử dụng
│   ├── context/            # Trạng thái: React Context dùng chung (Auth, ViewMode)
│   ├── hooks/              # Tiện ích: Custom React hooks
│   ├── lib/                # Cấu hình: Các thiết lập Firebase, utils
│   ├── services/           # Lớp Data Access: Tương tác với cơ sở dữ liệu (Firestore)
│   └── types/              # Khai báo: Các interface TypeScript (models)
├── data/                   # Lưu trữ: File CSV/backup mẫu cục bộ (nếu có dùng local adapter)
├── docs/                   # Tài liệu: Các hướng dẫn phụ trợ
├── plans/                  # Quản lý phát triển: File markdown tiến độ
├── scripts/                # Tiện ích: Script chạy terminal bổ trợ
├── package.json            # Khai báo cấu hình dự án & dependency
└── tsconfig.json           # Khai báo cấu hình tsc

## 2. 🛠️ Tech Stack (Công nghệ sử dụng)
**Framework & Runtime**
- Next.js @ 14.1.0 - React framework cho frontend & API
- Node.js - Môi trường chạy script & build (từ typing @types/node)

**UI & Styling**
- React @ 18
- Tailwind CSS @ 3.3.0
- Lucide React @ 0.300.0 (Thư viện SVG Icons)
- clsx @ 2.1.1 & tailwind-merge @ 2.6.1 (Xử lý hợp nhất CSS class)
- Radix UI (@radix-ui/react-dialog @ 1.1.15, @radix-ui/react-switch @ 1.2.6) (Primitive component)
- vaul @ 1.1.2 (Thành phần Drawer mobile)

**State Management**
- ❌ Không có (Sử dụng React Context `src/context/` để lưu trạng thái phiên và local state)

**Backend & Database**
- Firebase @ 12.8.0 - Backend-as-a-service chuyên Auth và Firestore real-time NoSQL
- Server Actions - Tích hợp gọi REST logic từ Client tới Server Next.js

**Authentication & Authorization**
- Firebase Auth @ 12.8.0
- RBAC kiểm soát thủ công qua Firestore permissions Object (`users/{uid}`)

**Deployment & Infrastructure**
- ❌ Không có config tự động deploy cụ thể trong root thư mục.

**Các package quan trọng khác**
- exceljs @ 4.4.0 - Xuất ra file `.xlsx` cao cấp
- papaparse @ 5.4.0 - Xử lý chuyển đổi object/chuỗi CSV
- file-saver @ 2.0.5 - Trigger popup download tự động cho Client
- date-fns @ 4.1.0 - Format và parse thời gian chuyên biệt
- recharts @ 3.7.0 - Vẽ biểu đồ tròn/cột phân tích điểm danh

## 3. 🔄 Data Flow (Luồng dữ liệu)
**Client → Server → Database**
- Điểm danh (Ví dụ Quick Attendance)
  → Component: `src/app/quick-attendance/page.tsx`
  → Client Handler: button/event handler UI
  → Server Action (API Sync): `src/app/actions/quick-attendance.ts` (Method: updateBatchAttendance)
  → Service Access: `src/services/attendance-v3-service.ts`
  → Database Query: Batch Write lưu Firestore data (`schools/.../attendance/`)
  → State Update: Refresh layout/context nội bộ UI React

**Authentication Flow**
- Login Form
  → Component: `src/app/login/page.tsx`
  → Auth Context Hndler: Hàm `signIn` tại `src/context/auth-context.tsx`
  → Auth Provider API: `signInWithEmailAndPassword` (Firebase Auth)
  → Session Check: Fetch `getDoc` lấy object Permissions từ `users/{uid}` trên Firestore
  → State Update: `firebaseUser` & `appUser` state trong `AuthProvider`
  → Redirect: Đẩy người dùng về protected route ban đầu (Dashboard)

**Liệt kê routes protection**
- Protected routes: `/attendance`, `/classes`, `/import`, `/monitor`, `/quick-attendance`, `/reports`, `/settings` (Trạng thái login bắt buộc thông qua React element điều hướng)
- Public routes: `/login`
- Role-based routes: Chặn tại Service Level qua `checkClassAccess` / `checkStatusChangePermission` tại `src/services/auth-guard.ts`

**WebSocket / File Upload**
- ❌ Không có.

## 4. ⚡ Logic thực thi toàn hệ thống
**4.1 Khởi động ứng dụng**
- Entry Point: `src/app/layout.tsx`
  → Setup Providers: 
    - AuthProvider: `src/context/auth-context.tsx`
    - ViewModeProvider: `src/context/view-mode-context.tsx`
  → Mount Root Layout UI: Sidebar, Toolbar
  → Render ViewContainer: Quấn bọc layout chính, chặn render nếu Loading.

**4.2 Authentication & Authorization**
- Auth provider: Firebase Auth
- Session storage: Được quản lý default local persist của Firebase Auth.
- Route Protection: Context Component bọc ngoài sẽ trả ra UI trống (`Loading...`) hoặc redirect về `/login` nếu context state `firebaseUser` là `null`. 
- Role-based access: Bằng phương thức `hasRole` trong AuthContext cho hiển thị menu UI. Về Data mutation, kiểm tra bảo mật bằng try/catch dựa theo các hàm từ `src/services/auth-guard.ts`.

**4.3 Các Module chính**
- Kế toán / Sổ Theo Dõi - `src/app/classes/[id]/monitor/[columnId]/page.tsx`
  - Input: URL Param `columnId` và tương tác Checkbox/Input từ giao diện GV.
  - Xử lý: Phân loại Frequency (`daily`, `period`, `one_time`), lưu qua logic controller `saveOneTimeRecord` hoặc `saveDailyRecord`. Đánh dấu `archived` trong cấu trúc.
  - Output: Lưu vào Database Firestore path `columnData/{columnId}/records/`.
  - Phụ thuộc: `src/services/record-service.ts`, `src/services/column-service.ts`
 
- Báo Cáo Thông Kê - `src/app/reports/page.tsx`
  - Input: Dropdown chọn Khoảng Thời Gian và Lớp.
  - Xử lý: React Component thu thập form data gọi `getReports` (`src/app/actions/report.ts`). Truy vấn record absence + columns thành khối BlockData.
  - Output: Hiển thị bảng grid, rendering biểu đồ bằng Recharts và lưu file qua service `exportToExcel` (dùng `exceljs`).
  - Phụ thuộc: Đổ về dữ liệu từ `src/services/attendance-v3-service.ts`.

**4.4 Nghiệp vụ đặc biệt**
- ❌ Không có nghiệp vụ đặc biệt nào được implement (VD: Thanh toán, queue background, email cronjobs, v.v.)

---
🔍 KNOWN LIMITATIONS
File này được tạo tự động. Các giới hạn:
- Phản ánh code tại thời điểm quét, không theo dõi thay đổi real-time
- Không mô tả runtime behavior, deployed infrastructure, hay production configuration
- Không bao gồm code trong node_modules hay third-party libraries
- Config từ .env chỉ mô tả structure, không bao gồm giá trị thực
- Không phân tích performance metrics, memory usage, hay load testing results
- Không mô tả user behavior, analytics, hay business metrics
