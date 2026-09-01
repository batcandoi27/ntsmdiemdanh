# TASK CONTRACT: TASK-STUDENT-PORTAL-REFACTOR-019
> **Task Name:** Refactor Cổng Học Sinh Sang Mô Hình Động Lực Nội Tại, Không Phạt, Bảo Vệ Trẻ Em & Safe-By-Design  
> **Source Research:** `bao_cao_cai_tien_cong_hoc_sinh_nghien_cuu_sau.docx`  
> **Standards & Legal:** SDT (Deci & Ryan), UNICEF Child-Centred AI Guidance, UNESCO AI Guidance, Luật 91/2025/QH15 & Nghị định 356/2025/NĐ-CP  
> **Orchestrator:** [ai-dev-loop-orchestrator](file:///C:/Users/BCD/.gemini/config/skills/ai-dev-loop-orchestrator/SKILL.md)  
> **Status:** `IN_PROGRESS`

---

## 1. IN-SCOPE ACCEPTED DELIVERABLES

### 1.1. Hệ Thống Thú Cưng & Tiến Trình Không Trừng Phạt (Non-Punitive Pet Companion)
- **Xóa bỏ vĩnh viễn:** Tụt 2 cấp sau 30 ngày (`-2 level decay`) và trạng thái đói bụng phạt trừ sinh lực.
- **Bổ sung:** Trạng thái "Chào mừng trở lại" (Welcome Back), cấp độ là cột mốc vĩnh viễn không bị tước đoạt, tương tác hồi phục nhẹ nhàng.
- **File tác động:** `src/components/student/svg-pet.tsx`, `src/types/student-portal.ts`, `src/app/student/page.tsx`, `src/app/student/pet/page.tsx`.

### 1.2. Xóa Bỏ Buff Học Tập / Điểm Số Trong Lò Rèn & Cửa Hàng (Cosmetic-Only Forge & Shop)
- **Xóa bỏ vĩnh viễn:** Toàn bộ các buff cộng điểm thi đua (+120%), nhân hệ số XP (+50-85%) từ vật phẩm nội thất/lò rèn để triệt tiêu cơ chế "Pay-to-Win" trong môi trường học đường.
- **Bổ sung:** 5 Tiers Lò Rèn thuần túy mang lại hiệu ứng thẩm mỹ (Hiệu ứng hào quang, vệt sáng ma thuật, danh hiệu phong cách, tùy biến tự do).
- **File tác động:** `src/domain/floorplan/types.ts`, `src/components/student/floorplan-editor/item-upgrade-forge-modal.tsx`, `src/domain/floorplan/inventory-store.ts`, `src/components/student/virtual-shop-modal.tsx`.

### 1.3. Chuyển Đổi Không Gian Lớp Học & Bảo Vệ Riêng Tư (Creative Study Space)
- **Chuyển đổi:** Đổi khái niệm "Thăm phòng ngủ / House Tour" thành "Không gian học tập sáng tạo / Góc rèn luyện" (Creative Study Space / Study Garden).
- **Quyền riêng tư:** Mặc định không thu thập, không hiển thị vị trí địa lý thực tế hoặc hình ảnh nhà ở riêng tư.
- **File tác động:** `src/components/student/house-tour-modal.tsx`, `src/components/student/isometric-room-view.tsx`, `src/app/student/map/page.tsx`.

### 1.4. Tinh Chỉnh Trang Chủ: Đưa Tiến Bộ Bản Thân Lên Trước Bảng Xếp Hạng (My Weekly Growth First)
- **Chuyển đổi:** Mặc định trang chủ `/student` hiển thị "Tiến bộ tuần này của em", lời động viên của GVCN, mục tiêu cá nhân và hành động tiếp theo; Bục vinh danh Top 3 đưa xuống khu vực khám phá vinh danh tự nguyện.
- **File tác động:** `src/app/student/page.tsx`, `src/components/student/global-top-podium.tsx`.

### 1.5. Cải Tiến Xác Minh Nhiệm Vụ & Tách Biệt Điểm Đánh Giá (Proportional Evidence & Integrity)
- **Tách biệt dữ liệu:** Tách `completion` (hoàn thành) khỏi `official assessment` (đánh giá chính thức). `score_achieved` không mặc định tự gán 10.
- **Xác minh minh chứng:** `physical_anchor_verified` mặc định `FALSE`/`pending` (không mặc định `TRUE`).
- **File tác động:** `src/types/student-portal.ts`, `src/domain/quests/weekly-quest-engine.ts`, `src/app/student/quests/page.tsx`.

### 1.6. Phi Thuyền Lớp Học Hòa Nhập (Inclusive Co-op Spaceship)
- **Chuyển đổi:** Chuyển từ cơ chế "Bắt buộc 100% thành viên cùng hoàn thành mới được thưởng" sang mục tiêu đóng góp tích lũy tập thể, có cơ chế bù bài (Catch-up window) và ghi nhận giúp đỡ bạn bè (Peer appreciation).
- **File tác động:** `src/app/student/coop/page.tsx`.

### 1.7. La Bàn Tiến Bộ (Growth Compass) & Hộp Thư Tâm Sự Có Trách Nhiệm
- **La bàn tiến bộ:** Thay thế biểu đồ Radar điểm nhân cách bằng "La bàn tiến bộ" (Growth Compass) thể hiện xu hướng nỗ lực, minh chứng đã làm và bước tiếp theo.
- **Hộp thư GVCN:** Bổ sung thông báo bảo vệ an toàn trẻ em minh bạch.
- **File tác động:** `src/app/student/records/page.tsx`.

### 1.8. Bảo Mật Webhook & Toàn Vẹn Dữ Liệu
- **Khắc phục race condition:** Dùng event payload values thay vì `getLastRow()`.
- **Chống gian lận:** Bổ sung `idempotency_key` và HMAC verification.
- **File tác động:** `cautruc_cong_hocsinh.md`, `docs/STUDENT_PORTAL_SYSTEM_SPECIFICATION.md`, `src/app/api/webhooks/google-sheets/route.ts`.

---

## 2. NON-GOALS (NGOÀI PHẠM VI TASK NÀY)
- Không can thiệp vào phân hệ Giáo viên chủ nhiệm (`/homeroom`) hoặc Cổng Phụ huynh (`/portal`) ngoại trừ các liên kết API liên quan đến duyệt nhiệm vụ học sinh.
- Không xóa bỏ giao diện 2.5D Isometric hay các vật phẩm nội thất SVG hiện có (chỉ chuyển đổi cơ chế tính năng từ buff học tập sang thẩm mỹ thuần túy).

---

## 3. ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU BẮT BUỘC)
- `AC-1`: Thú cưng khi học sinh vắng mặt dài ngày (30+ ngày) giữ nguyên 100% cấp độ, không bị trừ cấp, hiển thị hoạt ảnh chào đón trở lại thân thiện.
- `AC-2`: Tất cả 5 Tiers trong Lò rèn (`TIER_CONFIGS`) chỉ ghi nhận hiệu ứng thẩm mỹ (Aura/Glow/Danh hiệu), 0% buff điểm bài tập hoặc XP nhiệm vụ.
- `AC-3`: Giao diện `/student` hiển thị thẻ "Tiến bộ tuần này của em" và mục tiêu trọng tâm làm tiêu điểm hàng đầu.
- `AC-4`: `physical_anchor_verified` trong kiểu dữ liệu và DB schema mặc định là `false`/`pending`.
- `AC-5`: Co-op Tàu vũ trụ tính điểm dựa trên tổng đóng góp của cả lớp + cơ chế catch-up, không phạt lớp vì một cá nhân chưa hoàn thành.
- `AC-6`: Phân hệ Records hiển thị La Bàn Tiến Bộ (Growth Compass) với phản tư và bước đi tiếp theo.
- `AC-7`: Hòm thư tâm sự có thông điệp bảo mật riêng tư kèm thông báo an toàn trẻ em theo chuẩn sư phạm.
- `AC-8`: Toàn bộ dự án vượt qua `npm run typecheck` & `npm run build` với Exit code 0 sạch sẽ 100%.
