# PROMPT ĐÁNH GIÁ 5 LỚP ĐỘC LẬP CHO CHATGPT ARCHITECT & REVIEWER
*(Theo chuẩn quy trình /ai-dev-loop-orchestrator)*

---

```markdown
Bạn là OpenAI Independent Senior Architect & QA Gatekeeper theo quy trình /ai-dev-loop-orchestrator.
Hãy thực hiện Đánh giá 5 Lớp Độc Lập cho Task: TASK-GVCN-001 (Phân hệ Giáo viên chủ nhiệm & Cổng phụ huynh cho app ntsmdiemdanh).

### THÔNG TIN TASK CONTRACT:
- Task ID: TASK-GVCN-001
- Nhánh: feature/task-gvcn-001
- Commit: b6579f6
- Mục tiêu: Xây dựng phân hệ GVCN chuyên biệt (/homeroom), Cổng tra cứu Phụ huynh (/portal), và Trung tâm In ấn DOCX native không làm ảnh hưởng đến dữ liệu điểm danh v3 hiện tại.

### CÁC HẠNG MỤC ĐÃ HOÀN THÀNH (IN-SCOPE ACCEPTANCE CRITERIA):
1. Database (Supabase): 5 bảng độc lập (homeroom_class_settings, homeroom_events, homeroom_interventions, homeroom_plans, homeroom_parent_contacts).
2. Service Layer: CRUD sự việc, điểm cộng/trừ rèn luyện, kế hoạch can thiệp, sổ chủ nhiệm số, xác thực 3 lớp cho phụ huynh.
3. Giao diện GVCN (/homeroom): 8 phân hệ (Tổng quan, Hồ sơ HS & Timeline, Cơ cấu & Sơ đồ lớp, Sự việc, Phối hợp giáo dục, Sổ chủ nhiệm số, Trung tâm In ấn).
4. Trung tâm In ấn (Print Center): 5 biểu mẫu chuẩn THCS (Danh sách lớp, Sổ chủ nhiệm, Phiếu liên lạc, Biên bản sự việc, Biên bản họp PH) với Live Preview, In trực tiếp và Xuất file Word (.DOCX) native qua Server API Route.
5. Cổng Tra cứu Phụ huynh (/portal): Xác thực bảo mật Chọn Lớp + Mã HS/CCCD + Mã PIN lớp, xem chuyên cần, nề nếp, TKB, gửi lời nhắn cho GVCN.

### KẾT QUẢ KIỂM THỬ THỰC TẾ (ZERO-MOCK EVIDENCE):
- npx tsc --noEmit: 0 errors (100% PASS)
- npm run build: 33/33 Routes compile & static generation thành công (Exit code 0)
- Zero-Regression: Không can thiệp hay sửa đổi logic cũ của /quick-attendance, /attendance, /reports.

### YÊU CẦU PHẢN HỒI:
Hãy đánh giá qua 5 lớp (Requirement, Architecture, Implementation, Security/Regression, Product UX) và trả về kết quả theo cấu trúc JSON chuẩn:

```json
{
  "contract_version": "1.0",
  "task_id": "TASK-GVCN-001",
  "iteration": 1,
  "head_sha": "b6579f6",
  "status": "APPROVED | REQUEST_CHANGES",
  "summary": "Tóm tắt đánh giá 5 lớp...",
  "layers_evaluated": {
    "requirement": "PASS",
    "architecture": "PASS",
    "implementation": "PASS",
    "security_regression": "PASS",
    "product_ux": "PASS"
  },
  "metrics": { "blockers_count": 0, "major_count": 0, "minor_count": 0, "info_count": 0 },
  "findings": [],
  "required_actions": [],
  "review_again_required": false
}
```
```
