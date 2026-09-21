# SỔ GHI NHẬN QUYẾT ĐỊNH ĐỒNG THUẬN (DECISIONS LEDGER)
**Mã nhiệm vụ:** `TASK-PERF-ATTENDANCE`  
**Các bên tham gia:**
- 🔵 **Antigravity (Gemini IDE):** Tech Lead & Implementer
- 🟣 **ChatGPT Web (Luna):** Independent Principal Architect & Senior Reviewer (Bridge 17841)
- 🔴 **AntiLocal (Gemini 3.1 Pro):** Independent Adversarial Red Team Auditor

---

## 1. MA TRẬN ĐỐI CHIẾU Ý KIẾN KIẾN TRÚC (TRIAD CONSENSUS MATRIX)

| Hạng mục kỹ thuật | Đề xuất Plan A (Antigravity) | Phản biện Plan B (ChatGPT Web) | Cảnh báo Red Team (AntiLocal) | Quyết định đồng thuận tối cao |
|---|---|---|---|---|
| **1. Quét học sinh trong `getClassAttendance`** | Chỉ lấy student IDs có trong bảng attendance (`.in('id', ...)`) | Đồng ý 100%, bổ sung: Database filter theo `class_id` hoặc mapping relation, tuyệt đối không quét toàn trường | ⚠️ Cảnh báo: Phải có Early Return nếu lớp đi học đủ 100% (tránh lỗi `IN ()` rỗng trong PostgREST) | **ĐỒNG THUẬN:** Nếu `attendance` rỗng -> Early return `[]`. Nếu có bản ghi -> Query học sinh theo đúng danh sách `student_id` có mặt trong bản ghi. |
| **2. Khởi tạo `AttendanceSheet.init()`** | Bọc toàn bộ vào `Promise.all` | Cảnh báo: Chỉ parallelize các I/O độc lập (`classAndStudents`, `columns`, `classAttendance`). Giữ dependency cần thiết. | Phù hợp, không có rủi ro race condition ở bước đọc | **ĐỒNG THUẬN:** Chạy song song `getClassAndStudents(classId)`, `getColumnsByFrequency(classId, 'daily')`, và `getClassAttendance(classId, date, session)`. |
| **3. Lưu Custom Columns (Triệt tiêu 135 requests)** | Tạo `batchSyncDailyRecords` gửi toàn bộ dữ liệu cột | Bổ sung: Sử dụng **Dirty Diff Tracking** ở Client để chỉ gửi những ô thực sự có thay đổi | ⚠️ Cảnh báo: Tuyệt đối không xóa mù quáng toàn ngày vì sẽ ghi đè giáo viên khác. Phải dùng Deterministic ID + Dirty Unchecked Delete. | **ĐỒNG THUẬN:** Kết hợp cả hai: Client tính Dirty Diff (các ô mới tích + các ô bị gỡ bỏ). Server nhận 1 batch payload duy nhất, thực hiện bulk upsert và xóa chọn lọc theo đúng ID bị gỡ. |
| **4. Cache từ điển `attendance_statuses`** | Cache module Node.js vĩnh viễn | Bổ sung: Dùng In-memory cache có TTL 5 phút hoặc 24h, chỉ áp dụng cho metadata tĩnh | ⚠️ Không cache dữ liệu điểm danh biến động của học sinh vào bộ nhớ tĩnh server | **ĐỒNG THUẬN:** Cache in-memory TTL 24h cho `attendance_statuses` và `attendance_types`. Dữ liệu điểm danh học sinh không cache tĩnh. |
| **5. An toàn Zalo Bot Alert** | Chạy bất đồng bộ trong `setTimeout` | Duy trì luồng gửi cảnh báo tự động cho phụ huynh học sinh vắng/trễ/vi phạm | ⚠️ Bắt buộc bọc trọn trong `try...catch` độc lập để không crash server khi Zalo timeout | **ĐỒNG THUẬN:** Giữ nguyên 100% logic Zalo Alert nhưng gia cố `try...catch` bọc kín, đảm bảo lỗi gửi tin không bao giờ ảnh hưởng giao dịch lưu điểm danh. |

---

## 2. KẾT LUẬN ĐỒNG THUẬN
- Cả 3 bên AI (Antigravity, ChatGPT Web, AntiLocal) **đồng thuận 100% (3/3 Unanimous Approval)** thông qua Kế hoạch Master.
- Chuyển tiếp toàn bộ nội dung đã thống nhất sang bản `MASTER-PLAN.md` và đóng băng `TASK-CONTRACT.md`.
