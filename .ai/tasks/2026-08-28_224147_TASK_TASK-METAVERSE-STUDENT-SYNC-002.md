# TASK CONTRACT: ĐỒNG BỘ 100% HỌC SINH VÀO METAVERSE 2D & RICH HOVER STATS
**Mã Task:** `TASK-METAVERSE-STUDENT-SYNC-002`  
**Chủ đề:** 1:1 Student Avatar Sync, Mã Định Danh + Level Tag, Rich Hover Card, Khóa Zone Level-Gating & Fog Overlay  
**Kiến trúc sư độc lập:** ChatGPT Web Luna qua Bridge 17841  
**Người thực thi:** Antigravity  

---

## 1. MỤC TIÊU & ACCEPTANCE CRITERIA
1. **1:1 Student Roster Synchronization:**
   - Đồng bộ 100% học sinh trong lớp thành bấy nhiêu avatar/trứng (e.g. 43 học sinh = 43 avatar).
   - Invariant: `avatarCount === activeStudentCount`, không trùng lặp, không thiếu sót.
2. **Locked Zone Fog Overlay & Interactive Alert:**
   - Hiển thị lớp sương mù/khóa trực quan trên các phân khu mà học sinh đang xem chưa đủ cấp độ (`minLevel`).
   - Khi nhấp vào ô đất bị khóa -> Bật modal thông báo yêu cầu cấp độ và hướng dẫn làm nhiệm vụ lên cấp.
3. **Format Nhãn Định Danh Chuẩn:**
   - Hiển thị nhãn bên dưới mỗi trứng/thú: `[Mã Định Danh] • Lv.[Cấp độ]` (VD: `8A13_01 • Lv.0`, `8A13_15 • Lv.3`).
4. **Rich Hover Card / Popover Toàn Diện:**
   - Rê chuột vào bất kỳ con vật/trứng nào (hoặc tap trên mobile) hiển thị Card thông tin đầy đủ:
     * Mã định danh, bí danh linh vật, hình thái SvgPet.
     * Level, XP hiện tại / XP mục tiêu / Cần thêm.
     * Sinh lực (%), Chuỗi ngày rèn luyện (Streak).
     * Số Coins 🪙, Điểm thi đua / nề nếp, Số nhiệm vụ hoàn thành.
     * Phân khu đang sinh hoạt hiện tại.
