Chào bạn, với tư cách là **Senior Architect**, tôi đã phân tích cấu trúc mã nguồn và tệp cấu hình `package.json` của dự án **"app-diemdanh"**. Dưới đây là nội dung chi tiết cho file `_ARCHITECTURE.md` nhằm phản ánh kiến trúc cốt lõi, hiện trạng chuyển đổi công nghệ và quy trình vận hành của hệ thống.

---

# 🏗️ System Architecture: App Điểm Danh (Attendance System)

## 1. Tổng quan (Overview)
Dự án là một ứng dụng quản lý điểm danh học sinh, được xây dựng trên nền tảng Web (Next.js) và có định hướng hỗ trợ Mobile. Hệ thống đang trong giai đoạn chuyển đổi/tích hợp giữa Firebase và Supabase, tập trung mạnh vào khả năng xử lý dữ liệu từ Excel và báo cáo thời gian thực.

## 2. Tech Stack (Cốt lõi)
| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Frontend Framework** | **Next.js 14.1.0** (App Router), React 18 |
| **Language** | **TypeScript** |
| **Styling** | **Tailwind CSS**, Radix UI, Lucide React, Vaul (Drawer) |
| **Database (Hybrid)** | **Supabase** (PostgreSQL) & **Firebase/Firestore** |
| **State/Data Fetching** | Supabase JS Client, Firebase SDK |
| **Excel/Data Processing** | `xlsx` (SheetJS), `exceljs`, `papaparse` |
| **Visualization** | **Recharts** (Biểu đồ thống kê) |
| **Monitoring** | OpenTelemetry, Vercel Analytics |
| **Automation** | Python & Node.js Scripts (Data migration, Excel analysis) |

## 3. Cấu trúc thư mục (Directory Structure)
```text
├── src/                # Mã nguồn chính (Components, Hooks, Services, App logic)
├── supabase/           # Cấu hình Database PostgreSQL, Migrations và SQL Scripts
├── mobile/             # Source code dành cho phiên bản ứng dụng di động
├── scripts/            # Các kịch bản tự động hóa (Migration, Data fix)
├── docs/ & plans/      # Tài liệu thiết kế, quy trình và kế hoạch phát triển
├── data/               # Dữ liệu mẫu, file Excel đầu vào/đầu ra
├── public/             # Assets tĩnh (Images, Fonts)
├── *.js/ts (Root)      # Các công cụ hỗ trợ debug, sửa lỗi schema, import/export dữ liệu
└── configurations      # next.config.mjs, tailwind.config.ts, tsconfig.json
```

## 4. Kiến trúc Logic & Dòng dữ liệu (Core Logic Flow)

### A. Quản lý Dữ liệu & Chuyển đổi (Data Migration)
Hệ thống đang thực hiện lộ trình chuyển cư dữ liệu từ **Firebase sang Supabase**. 
- Các script như `dump-firebase.ts` và `fix-schema.ts` đóng vai trò trích xuất và chuẩn hóa dữ liệu.
- `run_hardened_migration.js` đảm bảo tính toàn vẹn dữ liệu khi chuyển sang PostgreSQL.

### B. Xử lý Excel (Excel Engine)
Đây là module quan trọng nhất của ứng dụng:
- **Import:** Sử dụng `xlsx` và `papaparse` để đọc file điểm danh từ giáo viên.
- **Analysis:** `analyze_excel.py` và `read-excel.js` thực hiện bóc tách cấu trúc lớp học, danh sách học sinh.
- **Export:** Sử dụng `exceljs` để tạo báo cáo có định dạng phức tạp (như file `In So Diem Ca Nhan`).

### C. Bảo mật & Phân quyền
- **Database Level:** Sử dụng `firestore.rules` cho Firebase và các SQL Constraints (`fix_constraint.sql`) cho Supabase.
- **Authentication:** Tích hợp qua Supabase Auth/Firebase Auth.

### D. Reporting & Analytics
- Dữ liệu điểm danh được tổng hợp để hiển thị qua biểu đồ `recharts`.
- Logic tính toán báo cáo nằm trong các script như `test-report.ts` và `run_report_migration.js`.

## 5. Quy trình vận hành (DevOps & Scripts)
Hệ thống cung cấp sẵn các công cụ tự động hóa qua file Batch:
- `START_APP.bat`: Khởi chạy ứng dụng nhanh.
- `mo_web_port_6666.bat` / `mo_app_8888.bat`: Mở các cổng dịch vụ cụ thể.
- `FIX_ERROR.bat`: Tự động xử lý các lỗi build hoặc runtime phổ biến.

## 6. Ghi chú của Kiến trúc sư (Architect's Notes)
1. **Tính linh hoạt:** Việc duy trì cả Firebase và Supabase cho thấy hệ thống đang ưu tiên tính sẵn sàng cao trong khi chuyển đổi hạ tầng.
2. **Xử lý file:** Hệ thống xử lý file Excel rất sâu, cần lưu ý tối ưu bộ nhớ khi xử lý các tệp có kích thước lớn trên Client-side.
3. **Mở rộng:** Cấu trúc `mobile/` tách biệt cho thấy định hướng phát triển đa nền tảng (có thể là React Native hoặc Capacitor).

---
*Cập nhật lần cuối: Tháng 02/2026*