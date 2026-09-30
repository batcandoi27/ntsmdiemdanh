---
task_id: TASK-STUDENT-DUPLICATE-NAME-SUFFIX-ORCHESTRATION
timestamp: 2026-09-30T07:17:29.854Z
duration_seconds: 82.8
bridge_endpoint: http://127.0.0.1:17841/v1/responses
model: chatgpt-web/luna
status: CONSULTATION_COMPLETED
---

# THAM VẤN KIẾN TRÚC: HẬU TỐ PHÂN BIỆT HỌC SINH TRÙNG TÊN CÙNG LỚP (A, B, C)
*Tư vấn độc lập từ ChatGPT Web (Senior Architect & Educational Data Specialist)*

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.Tôi sẽ tách rõ tên pháp lý trong hồ sơ gốc khỏi tên hiển thị phân biệt trong phạm vi lớp, rồi thiết kế cơ chế cấp hậu tố có tính bất biến và chịu được chuyển lớp/concurrency.## Kết luận kiến trúc

**Tôi khuyến nghị chọn Phương án 2**, nhưng nên nâng cấp nó thành mô hình:

> **Tên pháp lý/canonical nằm ở `students`; hậu tố phân biệt nằm ở quan hệ học sinh–lớp; việc cấp hậu tố được thực hiện ở DB/RPC transactionally; mọi màn hình đọc một “display name” thống nhất.**

Đây là cách vừa giữ nguyên dữ liệu gốc, vừa đáp ứng đúng yêu cầu **`A → B → C` bất biến**, kể cả khi học sinh chuyển lớp.

Điểm rất quan trọng: **không nên coi `(A)`, `(B)`, `(C)` là một phần của `full_name`**. Nó là **class-scoped display alias**.

* * *

# 1\. Đánh giá 3 phương án

| Tiêu chí | PA1: sửa `students.full_name` | PA2: `student_classes.name_suffix` | PA3: tính động TS |
| --- | --- | --- | --- |
| Giữ tên khai sinh | ❌ | ✅ | ✅ |
| Hậu tố gắn với lớp | ❌ | ✅ | ⚠️ |
| Không đổi A/B khi thêm C | ⚠️ | ✅ | ❌ |
| Chuyển lớp | ❌ | ✅ | ✅ |
| Excel/Report/Portal thống nhất | ✅ | ✅ nếu chuẩn hóa gateway/view | ⚠️ |
| Chống race condition | ⚠️ | ✅ nếu xử lý DB transaction | ❌ nếu chỉ TS |
| Audit lịch sử | ❌ | ✅ | ❌ |
| Mở rộng sau này | ⚠️ | ✅ | ⚠️ |
| Phù hợp CSDL trường học | ❌ | **✅** | ❌ |

### PA1 — Không nên chọn

Ví dụ:

```
students.full_name
------------------
Lý Gia Hỷ (A)
Lý Gia Hỷ (B)
```

Nó phá vỡ nguyên tắc dữ liệu gốc.

Sau này học sinh:

```
Lý Gia Hỷ (A)
```

chuyển sang 9A9, nơi không có người trùng tên, hệ thống vẫn mang `(A)`.

Tệ hơn nữa, khi đồng bộ với hệ thống khác, `"Lý Gia Hỷ (A)"` có thể bị hiểu là **tên thật**.

Trong các hệ thống giáo dục, việc định danh học sinh nên dựa vào **mã định danh/ID**, không dựa vào chuỗi tên. Bộ GDĐT cũng mô tả mã định danh của đối tượng trong CSDL GDĐT là chuỗi dùng để định danh duy nhất; CSDL ngành bao gồm dữ liệu học sinh và dữ liệu lớp học. [Ministry of Education and Training+1](https://moet.gov.vn/content/vanban/Lists/VBDT/Attachments/1555/D%E1%BB%B1%20th%E1%BA%A3o%20Th%C3%B4ng%20t%C6%B0%20CSDL%20Moet.pdf?utm_source=chatgpt.com)

* * *

# 2\. PA2 là đúng hướng, nhưng cần chỉnh một điểm quan trọng

Không nên chỉ làm:

```
student_classes.name_suffix
```

rồi để mỗ
