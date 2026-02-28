# 🗺️ BẢN ĐỒ DỰ ÁN KIẾN TRÚC

## 1. 📁 Directory Structure (Cấu trúc thư mục)
/
├── .gitignore               # Cấu hình file/folder bị loại bỏ khỏi Git
├── package.json             # Khai báo dependencies và scripts
├── src/
│   ├── app/                 # Next.js App Router (Pages & API Routes)
│   │   ├── actions/         # Server Actions (Xử lý logic phía server)
│   │   ├── api/             # API Endpoints
│   │   ├── attendance/      # Trang điểm danh chi tiết
│   │   ├── classes/         # Trang quản lý lớp học (kèm sub-routes cho sơ đồ lớp, sổ theo dõi)
│   │   ├── import/          # Trang nhập liệu từ Excel
│   │   ├── login/           # Trang đăng nhập
│   │   ├── monitor/         # [NEW] Dashboard Sổ Theo Dõi lớp học
│   │   ├── quick-attendance/# Trang điểm danh nhanh (Mobile first)
│   │   ├── reports/         # Trang báo cáo thống kê
│   │   └── settings/        # Trang cài đặt hệ thống (v2.0 với Tabs)
│   ├── components/          # UI Components tái sử dụng
│   │   ├── auth/            # [NEW] Các component liên quan đến Auth (VD: PasswordGuard)
│   │   ├── dashboard/       # [NEW] Các component cho màn hình tổng quan
│   │   ├── settings/        # [NEW] Fixed/Custom columns tabs, My Classes tab
│   │   ├── ui/              # Shadcn/Base UI components (Button, Modal...)
│   │   └── ...              # Các component theo feature
│   ├── context/             # React Context (State toàn cục)
│   ├── lib/                 # Tiện ích cốt lõi
│   │   ├── firebase.ts      # Firebase config
│   │   ├── defaults.ts      # [NEW] Fixed columns defaults
│   │   ├── archive-checker.ts # [NEW] Auto-archive logic
│   │   └── utils.ts         # Helper functions
│   ├── services/            # Service layer (Giao tiếp Database/API)
│   │   ├── db.ts               # [NEW] Central DB adapter logic (cầu nối Local/Firebase)
│   │   ├── db-adapter.ts       # [NEW] Interface định nghĩa Database Adapter
│   │   ├── firebase-adapter.ts # Firebase CRUD Implementation
│   │   ├── local-adapter.ts    # [NEW] Local CSV CRUD Implementation
│   │   ├── column-service.ts   # [NEW] Column CRUD (Firebase)
│   │   ├── preset-service.ts   # [NEW] Report preset CRUD (Firebase)
│   │   ├── record-service.ts   # [NEW] Record CRUD by frequency
│   │   └── student-service.ts  # [NEW] Student specific queries
│   └── types/               # TypeScript definitions
│       └── models.ts        # User, Class, Student, Column, Records...
├── public/                  # Static assets (images, icons)
├── plans/                   # [NEW] Tài liệu kế hoạch và tiến độ các Phase phát triển
└── data/                    # Thư mục chứa dữ liệu mẫu hoặc file tạm CSV (nếu dùng local adapter)
```
**Mô tả:** Dự án theo chuẩn **Next.js 14 App Router**. Code logic được tách biệt rõ ràng: `app` (Routing/Views), `services` (Logic/Data), `lib` (Core Config), `components` (UI).

## 2. 🛠️ Tech Stack (Công nghệ sử dụng)
*   **Framework chính**: Next.js 14.1.0 (App Router), React 18.
*   **Language**: TypeScript (định kiểu tĩnh chặt chẽ).
*   **UI/Styling**: Tailwind CSS (Styling), clsx & tailwind-merge (Xử lý class động), Lucide React (Icons).
*   **Backend/Database**: Firebase v12 (Firestore, Auth, Storage).
*   **Data Processing**:
    *   `xlsx`, `exceljs`: Đọc/Ghi file Excel chuyên sâu.
    *   `papaparse`: Xử lý CSV.
    *   `date-fns`: Xử lý ngày tháng.
*   **Visualization**: Recharts (Vẽ biểu đồ báo cáo).
*   **Utilities**: `vaul` (Drawer component cho mobile), `file-saver` (Lưu file client-side).

## 3. 🔄 Data Flow (Luồng dữ liệu)
1.  **Authentication & RBAC (v3.0)**:
    *   Sử dụng Firebase Auth kết nối với collection `users/{uid}` trên Firestore.
    *   Hệ thống 5 Role: `admin` (IT), `principal` (BGH), `supervisor` (Giám thị), `teacher` (GVCN), `class_monitor` (Ban Cán Sự).
    *   Mỗi Role được cấp bộ `UserPermissions` riêng và giới hạn thời gian sửa điểm danh (`editWindowMinutes`).
    *   User chưa đăng nhập hoặc không đủ quyền sẽ bị đẩy về `/login` hoặc hiển thị lỗi qua AuthGuard/Middleware.

2.  **Attendance & Student Status (v3.0)**:
    *   **Học sinh (StudentStatus)**: Quản lý vòng đời qua `active` (Đang học), `temporary_leave`, `dropped_out`, `suspended`, `graduated`.
    *   **Trạng thái điểm danh**: Hỗ trợ đầy đủ `P` (Có phép), `K` (Không phép), `V` (Vắng), `T` (Trễ), `VP` (Vi phạm), `KH` (Khen thưởng).
    *   **Client**: Lọc học sinh theo `effectiveStatus` trước ngày báo cáo hoặc điểm danh. User thao tác trên UI `/quick-attendance` hoặc `/attendance`.
    *   **Service Layer**: Giao tiếp qua Server Actions -> gọi `attendance-v3-service` -> Batch Write lưu xuống Firestore. Lịch sử điểm danh được gộp gọn theo Date và Class.

3.  **Custom Columns & Monitor System (v2.0)**: ⭐ NEW
    *   **Dashboard Sổ Theo Dõi (`/monitor`)**: Cho phép xem nhanh danh sách lớp và truy cập vào chi tiết từng cột theo dõi.
    *   **Column Types**: Fixed (Cố định, vd: Điểm danh, Vi phạm) | Custom (Tuỳ chỉnh).
    *   **Frequency & Record Types**: 
        *   `daily`: Theo ngày (Lưu `DailyRecord` - với `selectedSuggestions`).
        *   `period`: Theo giai đoạn (Lưu `PeriodRecord` - tra cứu bằng `periodKey` string).
        *   `one_time`: Loại một lần (Lưu `OneTimeRecord` - với biểu đồ `status: 'pending' | 'done'` và `completedAt`).
    *   **Data Flow**: Tùy chỉnh cột ở Settings -> Dữ liệu vào `column-service`. Người dùng nhập liệu tại `/classes/[id]/monitor` -> `record-service` lưu trữ tùy theo Column Frequency.
    *   **Auto Archive**: Các cột đã qua giai đoạn sử dụng có thể đánh dấu `archived` để tối ưu giao diện.

4.  **Reporting & Export**:
    *   **Fetch**: `reports/` page gọi service lấy dữ liệu thô từ DB.
    *   **Process**: Client tính toán tổng hợp (Số lượng vắng, tỷ lệ %).
    *   **Visualize**: Recharts render biểu đồ tròn/cột.
    *   **Export**: `exceljs` tạo file Excel từ data đã xử lý -> `file-saver` tải về máy.

## 4. ⚡ Logic thực thi của toàn bộ app
### 4.1. Khởi động & Database Adapter Pattern
*   App khởi chạy qua `npm run dev` (hoặc start).
*   `src/app/layout.tsx` bọc toàn bộ ứng dụng, khởi tạo các Provider cần thiết (Toast, Auth Context).
*   **Database Adapter Pattern**: Toàn bộ app giao tiếp qua interface `DbAdapter` (`src/services/db-adapter.ts`).
    *   Tùy vào biến môi trường (Environment variables), app sẽ khởi tạo `FirebaseAdapter` (Production) hoặc `LocalCsvAdapter` (Dev offline).
    *   Mọi service layer (`student-service`, `column-service`...) đều gọi qua file `db.ts` trung gian.
*   Bảo vệ route: Custom middleware NextJS & `AuthGuard` client-side kiểm tra JWT Token kết hợp Database Role (Role-Based Access Control) thay vì shared password như xưa.

### 4.2. Các Module chính
1.  **Module Lớp học (`/classes`)**:
    *   Hiển thị danh sách lớp. Thêm/Sửa/Xóa lớp.
    *   Quản lý danh sách học sinh bên trong. Sắp xếp lại học sinh.
    *   Có shortcut truy cập Sơ đồ lớp và Sổ theo dõi.

2.  **Module Nhập liệu (`/import`)**:
    *   **Input**: Upload file Excel danh sách học sinh.
    *   **Xử lý**: `xlsx`/`exceljs` parse file -> Validate form -> Map dữ liệu.
    *   **Output**: Lưu hàng loạt (Batch write) vào Database.

3.  **Module Điểm danh (`/attendance` & `/quick-attendance`)**:
    *   `/quick-attendance`: Giao diện Grid tối ưu thiết kế để chấm nhanh theo ngày hiển thị cả cột Tuỳ Chỉnh dạng `daily`.
    *   `/attendance`: Sơ đồ lớp học (Seat map) trực quan (kéo thả đang phát triển).
    *   **Logic**: Load danh sách lớp đã chọn -> Tick trạng thái -> Optimistic UI -> Delay Save -> Update Database.

4.  **Module Sổ Theo Dõi (`/monitor` & `/classes/[id]/monitor/[colId]`)**: ⭐ NEW
    *   Đây là trung tâm quản lý các cột tuỳ chỉnh và cố định mang tính chất đánh giá định kỳ hoặc thu tiền (`period`, `one_time`).
    *   Hiển thị giao diện danh sách row-by-row thay vì bảng lưới.
    *   Hỗ trợ nhập text, check hoàn thành, tính tổng,...

5.  **Module Báo cáo (`/reports`)**:
    *   Quản lý cấu hình lưu trước (Presets) bằng `preset-service`.
    *   Chọn khoảng thời gian, nhóm lớp -> Tính toán (Aggregate).
    *   View biểu đồ hoặc Bảng chi tiết + Nút xuất Excel `(XLSX)`.

6.  **Module Cài đặt (`/settings`)**: ⭐ UPDATED v2.0
    *   **4 Tabs giao diện**:
        *   📋 **Dữ liệu**: Quản lý DB chung (Tạo dữ liệu giả, Xóa hết điểm danh).
        *   📚 **Lớp của tôi**: Chọn nhanh các lớp ưu tiên quản lý.
        *   🔒 **Cột cố định**: Tùy chỉnh Suggestions cho Điểm Danh, Vi Phạm, Khen Thưởng.
        *   ⚙️ **Cột tùy chỉnh**: Tạo mới, Sửa các cột (Học phí, Theo dõi,...). Có chế độ áp dụng hàng loạt theo "Lớp của tôi".

### 4.3. Quy trình nghiệp vụ đặc biệt
*   **Offline Mode/Local CSV**: Hỗ trợ xuất dữ liệu ra CSV cục bộ (thư mục `/data`) khi code dev nếu không cấu hình Firebase. Giúp dev không bị block.
*   **Custom Columns Lifecycle**: Cột tự động phân loại active/archived nhờ hàm `checkAndArchiveColumns`.

## 5. 📊 Firestore Data Structure (v2.0)
```
schools/{schoolId}/
├── years/{year}/
│   ├── classes/{classId}           # Thông tin lớp
│   ├── students/{studentId}        # Thông tin học sinh
│   ├── attendance/{date}/records/  # Điểm danh legacy
│   ├── columns/{columnId}          # [NEW] Column definitions
│   ├── columnData/{columnId}/records/{key}  # [NEW] Record data
│   └── reportPresets/{presetId}    # [NEW] Saved report configs
```

