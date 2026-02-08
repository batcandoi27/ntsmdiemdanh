# 🗺️ BẢN ĐỒ DỰ ÁN KIẾN TRÚC

## 1. 📁 Directory Structure (Cấu trúc thư mục)
```
/
├── .gitignore               # Cấu hình file/folder bị loại bỏ khỏi Git
├── package.json             # Khai báo dependencies và scripts
├── src/
│   ├── app/                 # Next.js App Router (Pages & API Routes)
│   │   ├── actions/         # Server Actions (Xử lý logic phía server)
│   │   ├── api/             # API Endpoints
│   │   ├── attendance/      # Trang điểm danh chi tiết
│   │   ├── classes/         # Trang quản lý lớp học
│   │   ├── import/          # Trang nhập liệu từ Excel
│   │   ├── login/           # Trang đăng nhập
│   │   ├── quick-attendance/# Trang điểm danh nhanh (Mobile first)
│   │   ├── reports/         # Trang báo cáo thống kê
│   │   └── settings/        # Trang cài đặt hệ thống
│   ├── components/          # UI Components tái sử dụng
│   │   ├── ui/              # Shadcn/Base UI components (Button, Modal...)
│   │   └── ...              # Các component theo feature
│   ├── context/             # React Context (State toàn cục)
│   ├── lib/                 # Tiện ích cốt lõi (Firebase config, Helper functions)
│   ├── services/            # Service layer (Giao tiếp Database/API)
│   └── types/               # TypeScript definitions (Models, Interfaces)
├── public/                  # Static assets (images, icons)
├── plans/                   # Tài liệu kế hoạch và tiến độ
└── data/                    # Thư mục chứa dữ liệu mẫu hoặc file tạm
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

3.  **Reporting & Export**:
    *   **Fetch**: `reports/` page gọi service lấy dữ liệu thô từ Firestore.
    *   **Process**: Client tính toán tổng hợp (Số lượng vắng, tỷ lệ %).
    *   **Visualize**: Recharts render biểu đồ.
    *   **Export**: `exceljs` tạo file Excel từ data đã xử lý -> `file-saver` tải về máy user.

## 4. ⚡ Logic thực thi của toàn bộ app
### 4.1. Khởi động & Bảo mật
*   App khởi chạy qua `npm run dev` (hoặc start).
*   `src/app/layout.tsx` bọc toàn bộ ứng dụng, khởi tạo các Provider cần thiết (Toast, Auth Context).
*   Bảo vệ route: Middleware hoặc Layout kiểm tra quyền truy cập. Nếu không có quyền -> đá về Login.

### 4.2. Các Module chính
1.  **Module Lớp học (`/classes`)**:
    *   Hiển thị danh sách lớp.
    *   Thêm/Sửa/Xóa lớp học.
    *   Dữ liệu đồng bộ trực tiếp với Firestore collection `classes`.

2.  **Module Nhập liệu (`/import`)**:
    *   **Input**: User upload file Excel danh sách học sinh.
    *   **Xử lý**: `xlsx`/`exceljs` parse file -> Validate form -> Map dữ liệu vào Model.
    *   **Output**: Lưu hàng loạt (Batch write) vào Firestore.

3.  **Module Điểm danh (`/attendance` & `/quick-attendance`)**:
    *   Đây là **Core Feature**.
    *   `/quick-attendance`: Giao diện tối ưu cho Mobile, thao tác vuốt/chạm nhanh.
    *   `/attendance`: Giao diện Grid chi tiết cho Desktop.
    *   **Logic**: Load danh sách học sinh theo lớp -> User tick trạng thái (P, K, P, ...) -> Auto-save hoặc Save thủ công -> Update Database.

4.  **Module Báo cáo (`/reports`)**:
    *   **Input**: Chọn khoảng thời gian, lớp học.
    *   **Xử lý**: Query data điểm danh trong khoảng thời gian -> Aggregate (tổng hợp) theo từng học sinh/lớp.
    *   **Output**: Hiển thị biểu đồ tròn/cột + Bảng chi tiết + Nút xuất Excel.

5.  **Module Cài đặt (`/settings`)**:
    *   Cấu hình hệ thống, quản lý tài khoản admin, export/backup dữ liệu toàn cục.

### 4.3. Quy trình nghiệp vụ đặc biệt
*   **Offline Support (Tiềm năng)**: Sử dụng LocalStorage/IndexedDB để lưu tạm dữ liệu điểm danh khi mất mạng (cần kiểm tra implementation cụ thể trong `services`).
*   **Đồng bộ Excel**: Hệ thống coi Excel là nguồn dữ liệu đầu vào quan trọng và đầu ra báo cáo chuẩn, logic parse Excel được xử lý kỹ lưỡng để tránh lỗi format.
