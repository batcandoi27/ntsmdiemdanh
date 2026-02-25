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
1.  **Authentication**:
    *   User truy cập -> Kiểm tra trạng thái đăng nhập (Firebase Auth / Password Guard).
    *   Nếu chưa đăng nhập -> Redirect về `/login`.
    *   Thông tin user được lưu trong Context/Session.

2.  **Attendance Process (Điểm danh)**:
    *   **Client**: User thao tác trên UI (`quick-attendance` hoặc `attendance`) -> Gọi Server Actions hoặc API.
    *   **Service Layer**: `services/` nhận yêu cầu -> Validate dữ liệu -> Giao tiếp với Firestore.
    *   **Database**: Firestore lưu trạng thái điểm danh (Có mặt, Vắng, Trễ...).
    *   **Real-time**: UI cập nhật ngay lập tức (Optimistic UI) hoặc fetch lại data mới nhất.

3.  **Custom Columns & Monitor System (v2.0)**: ⭐ NEW
    *   **Dashboard Sổ Theo Dõi (`/monitor`)**: Cho phép xem nhanh danh sách lớp và truy cập vào chi tiết từng cột theo dõi.
    *   **Column Types**: Fixed (Điểm danh, Vi phạm, Khen thưởng) | Custom (do GV tự tạo)
    *   **Frequency**: `daily` (theo ngày), `period` (theo kỳ), `one_time` (chỉ 1 lần - vd: Nộp hồ sơ)
    *   **Data Flow**: Settings -> `Column Service` -> DB. Dữ liệu khi nhập -> `Record Service` -> DB.
    *   **Auto Archive**: Các cột `one_time` tự động ẩn khi 100% học sinh hoàn thành. Cột `period` tự ẩn khi qua ngày kết thúc.

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
*   Bảo vệ route: `PasswordGuard` kiểm tra quyền truy cập (mật khẩu dùng chung cho cá nhân).

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

