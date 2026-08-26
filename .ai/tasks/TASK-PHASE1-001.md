# TASK CONTRACT: TASK-PHASE1-001
**Title:** Backend Domain Services & Schema Foundation for GVCN Operating System & Parent Portal
**Module:** `src/services/homeroom-service.ts`, `src/types/homeroom.ts`
**Phase:** 1 - Core Foundation & Trust Loop

---

## 1. MỤC TIÊU (GOAL)
Xây dựng nền tảng dịch vụ và kiểu dữ liệu chuẩn (Canonical Domain Models) phục vụ:
1. **Student 360 Timeline:** Hợp nhất sự kiện chuyên cần, vi phạm, khen thưởng, ý kiến GVBM, đơn xin nghỉ phép, nhật ký liên hệ phụ huynh theo thứ tự thời gian.
2. **Student Risk Radar Engine:** Thuật toán tính toán điểm rủi ro và giải thích nguyên nhân rõ ràng (Explainable Signals: vắng nhiều, đi muộn liên tục, vi phạm nề nếp).
3. **Leave Request State Machine:** Cơ chế nộp đơn và duyệt đơn xin nghỉ phép trực tuyến khép kín (`PENDING` ➔ `APPROVED` ➔ `APPLIED` ➔ Tự động cập nhật điểm danh Phép `P` trong `attendance_records_v3`).
4. **QR Token Security & Lookup:** Sinh và xác thực token truy cập 32 ký tự định danh cho học sinh trên Portal, bảo đảm Row-level Isolation.
5. **Auto-Generated Class Meeting Engine:** Tổng hợp dữ liệu tuần sinh kịch bản và biên bản sinh hoạt lớp thứ 7.

---

## 2. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] Mở rộng kiểu dữ liệu trong `src/types/homeroom.ts`: `LeaveRequest`, `RiskRadarStudent`, `Student360Event`, `WeeklyMeetingDraft`.
- [ ] Bổ sung các hàm API chuẩn trong `src/services/homeroom-service.ts`:
  - `getStudent360Timeline(studentId, classId)`
  - `getRiskRadarStudents(classId)`
  - `submitLeaveRequest(payload)`
  - `getLeaveRequests(classId, status?)`
  - `handleLeaveRequestAction(requestId, action, gvcnNote)` (Duyệt đơn và tự động đồng bộ sang bảng điểm danh `attendance_records_v3`)
  - `generateWeeklyMeetingDraft(classId, weekNumber)`
  - `verifyParentPortalToken(token)` & `getStudentPortalQrPayload(student)`
- [ ] TypeScript Typecheck: 0 errors (`npm run build` / `typecheck` sạch sẽ).
- [ ] Viết test scenario kiểm tra tính nguyên tử và đúng đắn của luồng duyệt đơn phép.
