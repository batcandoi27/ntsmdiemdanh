# KẾ HOẠCH MASTER (MASTER PLAN)
## NÂNG CẤP SỔ THEO DÕI: CHẾ ĐỘ MỘT LẦN NHIỀU CỘT & XUẤT BÁO CÁO MA TRẬN HOẠT ĐỘNG
**Mã Task:** `TASK-MULTI-COLUMN-ACTIVITY-MONITOR-001`  
**Ngày lập:** 01/10/2026  
**Đơn vị điều phối:** Triad-AI Development Loop Orchestrator  
**Kiến trúc sư trưởng độc lập (Senior Architect):** ChatGPT Web Luna (OpenAI)  
**Kỹ sư triển khai chính (Code Lead & Test Runner):** Antigravity (Gemini IDE)  
**Minh chứng tham vấn gốc:** [20261001_020500_CONSULT_TASK-MULTI-COLUMN-ACTIVITY-MONITOR-001_ARCHITECTURAL_BLUEPRINT.md](file:///c:/AI%20APP/app-diemdanh/.ai/consultations/20261001_020500_CONSULT_TASK-MULTI-COLUMN-ACTIVITY-MONITOR-001_ARCHITECTURAL_BLUEPRINT.md)

---

## 1. TỔNG QUAN YÊU CẦU & BỐI CẢNH NGHIỆP VỤ

### 1.1. Yêu cầu của người dùng
1. **Chế độ Một lần nhưng Nhiều cột (Composite Activity Sheet):**
   - Giáo viên có thể gộp nhiều hoạt động theo dõi một lần trong một lần xuất báo cáo hoặc trên cùng một bảng theo dõi ma trận.
   - Ví dụ: Lập danh sách đăng ký hoạt động đầu năm/giữa kỳ gồm:
     * Cột 1: *Bảo hiểm tai nạn*
     * Cột 2: *Bán trú*
     * Cột 3: *Tham gia hội thao*...
2. **Quản lý Cột Động (Dynamic Column Management):**
   - Cho phép thêm, bớt, ẩn, khôi phục cột hoạt động sau đó mà không làm mất dữ liệu đã nhập.
   - Tùy chọn tập hợp cột muốn xuất báo cáo / xuất Excel.
3. **Cột Ghi Chú Kế Bên Tùy Ý (Optional Notes Sub-column):**
   - Mỗi cột/hoạt động có tùy chọn bật/tắt: "Ghi chú kế bên tùy ý".
   - Nếu bật: bảng và báo cáo sẽ tự động sinh thêm cột ghi chú đi kèm để giáo viên điền tự do (ví dụ: ăn chay, ngủ riêng, dị ứng...).
   - Nếu tắt: chỉ hiển thị cột chính, tiết kiệm diện tích trang in.
4. **Hỗ trợ Cột Con Đa Tầng (Multi-subcolumn / Nested Options):**
   - *Bảo hiểm tai nạn:* Có / Không (Boolean).
   - *Bán trú:* [Đăng ký] + [Ghi chú] (Ăn chay, ngủ riêng...).
   - *Tham gia hội thao:* [Cờ tướng] + [Cờ Vua] + [Kéo co]... (Checklist các môn đăng ký).

---

## 2. BẢN THIẾT KẾ 7 NGUYÊN TẮC KIẾN TRÚC BẤT BIẾN (7 ARCHITECTURAL PILLARS)

Theo bản thiết kế kiến trúc chuẩn mực từ ChatGPT Web Luna:

1. **Nguyên tắc 1: Bảo toàn 100% Cột Cũ (Zero Breaking Changes):**
   - Cột cũ đơn lẻ (`frequency = 'one_time'`, `activity_config IS NULL`) tiếp tục chạy bình thường, không bắt buộc migration làm đứt gãy hệ thống.
   - Sổ mới sử dụng cờ `activity_config.type = 'composite'` để kích hoạt Composite Engine.
2. **Nguyên tắc 2: Mô hình Cây Cha - Con (Parent-Child Column Hierarchy):**
   - Hoạt động cha (Parent Column): Là đơn vị nhóm nghiệp vụ (ví dụ: "Bán trú", "Hội thao").
   - Cột con (Child Column): Mang trường dữ liệu cụ thể (`parent_column_id = parent.id`), đại diện cho từng môn thi, từng lựa chọn, hoặc cột ghi chú.
3. **Nguyên tắc 3: Bản ghi nguyên tử (Atomic Child Record):**
   - Mỗi ô nhập liệu của học sinh được lưu độc lập theo từng `column_id` con:
     `column_records` (`column_id = child.id`, `student_code = HS001`, `value = true | 'Ăn chay'`).
   - Tuyệt đối không nhồi nhét cả đối tượng hoạt động vào một cục JSON phức tạp, giúp việc query, lọc, thống kê và cập nhật từng ô đạt tốc độ tức thì, chống xung đột ghi đè (Race Condition).
4. **Nguyên tắc 4: "Ghi chú kế bên" là một Cột Con kiểu Text:**
   - Khi giáo viên bật "Ghi chú kế bên", hệ thống tự động sinh một cột con (`data_type: 'text', input_mode: 'inline_text'`).
   - Không sinh thêm logic ngoại lệ rườm rà trong renderer, dữ liệu được hiển thị và xuất Excel đồng nhất 100%.
5. **Nguyên tắc 5: Lưu trữ mềm (Archive First, Never Hard Delete Data):**
   - Khi giáo viên ẩn/xóa cột khỏi sổ trên UI, hệ thống đánh dấu `is_archived = true`. Dữ liệu nhập trước đó của học sinh vẫn được bảo toàn nguyên vẹn, có thể khôi phục bất cứ lúc nào.
6. **Nguyên tắc 6: Bộ Xuất Báo Cáo Độc Lập (Decoupled Export Engine):**
   - Tách rời hoàn toàn giao diện chọn cột (*What to export*) khỏi Engine sinh file Excel (*How to render*).
   - Engine tự động tính toán ghép ô (Merge Cells), căn chỉnh Header đa tầng, tính tổng sĩ số, định dạng dấu tích (✓ / X) và tạo khung ký tên chuẩn Bộ GD&ĐT.
7. **Nguyên tắc 7: Khóa Chặt Vùng Dữ Liệu & RLS (Academic Year & Class Isolation):**
   - Toàn bộ cột con bắt buộc kế thừa đúng `class_id` và `academic_year_id` của cột cha.
   - Chặn đứng mọi hành vi can thiệp sửa đổi trái quyền qua API.

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA CONTRACT

### 3.1. Mở rộng bảng `columns`
```sql
-- Bổ sung trường quan hệ Cha - Con và Cấu hình Hoạt động
ALTER TABLE columns ADD COLUMN IF NOT EXISTS parent_column_id TEXT REFERENCES columns(id) ON DELETE RESTRICT;
ALTER TABLE columns ADD COLUMN IF NOT EXISTS activity_config JSONB DEFAULT NULL;
ALTER TABLE columns ADD COLUMN IF NOT EXISTS display_config JSONB DEFAULT NULL;
ALTER TABLE columns ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

-- Index tăng tốc truy vấn ma trận cột
CREATE INDEX IF NOT EXISTS idx_columns_parent_id ON columns(parent_column_id);
CREATE INDEX IF NOT EXISTS idx_columns_class_parent ON columns(class_id, parent_column_id);
```

### 3.2. Cấu trúc Payload `activity_config`
* **Đối với Cột Hoạt Động Cha (Parent Activity):**
```json
{
  "type": "composite",
  "version": 1,
  "activity_code": "HOI_THAO_2026",
  "has_notes": false,
  "allow_dynamic_children": true
}
```
* **Đối với Cột Con (Child Column):**
```json
{
  "type": "field",
  "data_type": "boolean | text | number",
  "input_mode": "checkbox | inline_text | select",
  "export_header": "Cờ tướng",
  "export_format": "mark"
}
```

### 3.3. Cấu trúc `column_records`
Giữ nguyên schema hiện tại, tận dụng trường `value` (JSONB) và `note` (TEXT) để lưu giá trị nguyên tử:
- Cột boolean (VD: tham gia Cờ vua): `value = true`
- Cột ghi chú (VD: ghi chú bán trú): `value = "Ăn chay, ngủ riêng"` hoặc `note = "Ăn chay, ngủ riêng"`

---

## 4. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UX/UI MATRIX)

### 4.1. Bảng Ma Trận Học Sinh x Hoạt Động (Interactive Matrix Grid)
* **Header Đa Tầng (Multi-Header):**
  - **Tầng 1 (Cha):** Gom nhóm hoạt động lớn (BẢO HIỂM TAI NẠN, BÁN TRÚ, HỘI THAO...).
  - **Tầng 2 (Con):** Các cột chi tiết (Có, Đăng ký, Ghi chú, Cờ tướng, Cờ vua, Kéo co...).
* **Cố định hàng/cột (Sticky Layout):**
  - Cột Học sinh (STT, Mã HS, Họ và tên) cố định bên trái khi cuộn ngang.
  - Header cố định trên cùng khi cuộn dọc.
* **Tương tác siêu tốc:**
  - Nhấp chuột hoặc phím cách (`Space`) để bật/tắt checkbox.
  - Gõ trực tiếp ghi chú inline, tự động lưu debounce (không cần bấm Lưu từng dòng).
  - Nút bấm Menu ngữ cảnh cho từng cột: *Chọn tất cả lớp, Bỏ chọn tất cả, Ẩn cột, Đổi tên, Thêm cột con*.

### 4.2. Modal Quản Lý Cột Hoạt Động Động
- Cho phép thêm nhanh một Hoạt động mới hoặc thêm một Môn/Mục con vào Hoạt động có sẵn.
- Checkbox bật/tắt nhanh: "Kèm cột ghi chú kế bên".

---

## 5. BỘ XUẤT BÁO CÁO & XUẤT EXCEL MA TRẬN GỘP HOẠT ĐỘNG

### 5.1. Modal Chọn Cột Xuất Báo Cáo (Column & Activity Selector)
- Cây danh mục phân cấp: Giáo viên có thể tick chọn toàn bộ sổ hoặc chỉ chọn 1-2 hoạt động cụ thể (ví dụ: chỉ xuất danh sách Bán Trú và Bảo Hiểm để nộp văn phòng).
- Tùy chọn ký hiệu đánh dấu: Dấu tích (`✓`) hoặc dấu chéo (`X`).
- Nút bấm: "Lưu mẫu xuất này làm mặc định" (Export Profile).

### 5.2. Định dạng File Excel (.xlsx) chuẩn Sư phạm
Sử dụng thư viện `exceljs` để dựng file theo đúng chuẩn biểu mẫu hành chính:
1. **Phần Quốc hiệu - Tiêu ngữ & Thông tin trường:**
   - Dòng 1-2: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc.
   - Dòng 3-4: TRƯỜNG THCS ... / LỚP 8A12 - NĂM HỌC 2026-2027.
   - Dòng 6: **BẢNG TỔNG HỢP DANH SÁCH ĐĂNG KÝ CÁC HOẠT ĐỘNG**.
2. **Phần Bảng dữ liệu Merged Header:**
   - Ô `STT`, `Mã định danh`, `Họ và tên`, `Giới tính`, `Ngày sinh` ghép dòng theo chiều dọc.
   - Tên Hoạt động (BẢO HIỂM, BÁN TRÚ, HỘI THAO...) ghép ô theo chiều ngang phủ qua các cột con.
   - Dữ liệu học sinh được đánh dấu `✓` hoặc `X` căn giữa; cột ghi chú căn lề trái.
3. **Dòng Tổng Kết Sĩ Số Tham Gia:**
   - Tự động đếm tổng số học sinh đăng ký từng môn/hoạt động ở cuối bảng.
4. **Khung Chữ Ký:**
   - Người lập bảng — Giáo viên chủ nhiệm — Ban Giám Hiệu duyệt.

---

## 6. LỘ TRÌNH TRIỂN KHAI 3 GIAI ĐOẠN (3-PHASE ROADMAP)

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Data Schema & Composite Foundation                 │
│ - Migration: parent_column_id, activity_config              │
│ - ColumnService & RecordService: Batch CRUD                 │
│ - Invariants & RLS Hardening                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Matrix Data Grid UI & Dynamic Columns              │
│ - Multi-Header Sticky Grid component                        │
│ - Add/Remove/Archive Column Modal                           │
│ - Fast Inline Typing & Debounced Persistence                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Consolidated Export Engine & ExcelJS Generator     │
│ - Column & Activity Selection Drawer                        │
│ - ExcelJS Layout Renderer with Merged Cells & Totals        │
│ - Counterexample Test Sweep & Final Release                 │
└─────────────────────────────────────────────────────────────┘
```

### Chi tiết từng Phase:

#### **PHASE 1: Nền tảng Dữ liệu & Quản lý Cột Cha - Con (Data Foundation)**
1. Viết migration SQL an toàn: Thêm `parent_column_id`, `activity_config`, `display_config` vào bảng `columns`.
2. Nâng cấp [column-service.ts](file:///c:/AI%20APP/app-diemdanh/src/services/column-service.ts):
   - Hỗ trợ tạo Cột Cha (Activity) và Cột Con (Sub-column).
   - Hàm `getCompositeColumnsForClass(classId)` tải toàn bộ cây hoạt động.
3. Nâng cấp [record-service.ts](file:///c:/AI%20APP/app-diemdanh/src/services/record-service.ts):
   - Thêm API `batchSaveColumnRecords` để cập nhật đồng loạt nhiều cell/nhiều học sinh trong 1 lần gọi.

#### **PHASE 2: Giao diện Ma Trận Nhập Liệu (Interactive Matrix Grid UI)**
1. Xây dựng trang chuyên dụng `/classes/[id]/monitor/composite` (hoặc chế độ xem Ma trận trực tiếp tại `/classes/[id]/monitor`):
   - Multi-header Table tính toán `colspan` và `rowspan` tự động.
   - Checkbox tương tác nhanh kèm cột Ghi chú inline.
2. Modal Thêm/Bớt Cột Hoạt Động & Cột Con linh hoạt:
   - Thêm môn hội thao mới, thêm cột đóng tiền mới.
   - Tính năng "Kèm cột ghi chú kế bên".

#### **PHASE 3: Bộ Xuất Báo Cáo & Xuất Excel Ma Trận (Export Engine)**
1. Component `ExportColumnSelectorModal`:
   - Giao diện cây checkbox chọn hoạt động / cột con cần xuất.
2. Service `src/services/composite-export-service.ts`:
   - Sử dụng `exceljs` dựng file Excel chuẩn format BGDĐT.
   - Merged cells, borders, fill color sang trọng, tính tổng số lượng tham gia và khung ký tên.
3. Chạy càn quét kiểm thử nghiệm thu 25 kịch bản theo Counterexample Table.

---

## 7. BẢNG TIÊU CHÍ NGHIỆM THU PHẢN VÍ DỤ (COUNTEREXAMPLE DISCRIMINATING TABLE - STRENGTH = 4)

| STT | Kịch bản Kiểm Thử (Requirement) | Phản ví dụ / Lỗi tiềm ẩn (Wrong Implementation) | Hành vi đúng kỳ vọng (Gold Standard) |
|---|---|---|---|
| **C01** | Cột một lần đơn lẻ cũ (Legacy) | Bị lỗi giao diện hoặc bắt buộc chuyển sang định dạng cha-con | Chạy bình thường 100%, không bị ảnh hưởng |
| **C02** | Thêm cột con mới vào Hoạt động đã có dữ liệu | Xóa trắng hoặc đảo lộn dữ liệu các cột con cũ | Dữ liệu cũ giữ nguyên 100%, cột mới khởi tạo giá trị trống |
| **C03** | Ẩn/xóa một cột con | Xóa vĩnh viễn dữ liệu điểm danh/đăng ký trong DB | Đánh dấu `is_archived = true`, dữ liệu trong DB được bảo toàn |
| **C04** | Giáo viên tick chọn nhanh cả lớp (Quick-fill) | Gửi 40 request riêng lẻ gây nghẽn mạng hoặc đè sót | Gửi 1 request batch duy nhất, lưu trọn vẹn 40 học sinh |
| **C05** | Tùy chọn "Ghi chú kế bên" | Tạo biến riêng gây vỡ cấu trúc bảng xuất Excel | Tự động tạo 1 cột con kiểu text, hiển thị liền kề và xuất Excel trơn tru |
| **C06** | Xuất Excel chọn 2 trong 5 hoạt động | Xuất toàn bộ 5 hoạt động hoặc bị lệch header | Chỉ xuất đúng 2 hoạt động được chọn, header tự căn chỉnh chuẩn |
| **C07** | Học sinh trùng tên trong cùng lớp | Đánh dấu nhầm giữa học sinh A và học sinh B | Định danh chính xác theo `student_code` và hậu tố A/B |
| **C08** | Can thiệp API đổi `class_id` của cột con | Cột con bị gán nhầm sang lớp khác | Backend từ chối ngay lập tức, chặn đứng rò rỉ dữ liệu |

---

## 8. KẾT LUẬN & TRÌNH DUYỆT

Bản Kế hoạch Master đã được thiết kế hoàn thiện, bám sát 100% yêu cầu thực tế của Thầy và đạt phê duyệt kiến trúc từ ChatGPT Web Luna.  
Kính mời Thầy duyệt Kế hoạch Master để Antigravity tiến hành khởi động **Phase 1** ngay lập tức!
