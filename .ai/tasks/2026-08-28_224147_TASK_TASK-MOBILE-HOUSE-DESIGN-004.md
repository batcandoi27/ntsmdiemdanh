# TASK CONTRACT: BẢN THIẾT KẾ CĂN CỨ ĐỘC BẢN, SMART POPOVER & MOBILE FIRST
**Mã Task:** `TASK-MOBILE-HOUSE-DESIGN-004`  
**Chủ đề:** Khắc phục Dead Click Nhà Riêng, Sơ Đồ Thiết Kế 2D Căn Cứ Riêng, Smart Anchored Popover & Mobile Bottom Sheet  
**Kiến trúc sư độc lập:** ChatGPT Web Luna qua Bridge 17841  
**Người thực thi:** Antigravity  

---

## 1. MỤC TIÊU & ACCEPTANCE CRITERIA
1. **Khắc phục 100% Dead Click & House Directory Modal:**
   - Nhấp vào Chip `Nhà riêng (Click thăm)` -> Bật Modal Danh sách 28 Căn Cứ để chọn thăm bất kỳ ai.
   - Nhấp vào bất kỳ ô viền 8x8 nào -> Lập tức mở House Tour của ô đó.
2. **Bản Thiết Kế Kiến Trúc Riêng Cho Từng Nhà (4 Themes):**
   - 4 Theme phong cách (`cozy_wood`, `space_pod`, `crystal_castle`, `fairy_garden`) với sơ đồ phòng trực quan, đồ nội thất và cúp thành tích riêng biệt.
3. **Smart Anchored Popover (Desktop) & Mobile Bottom Sheet:**
   - Desktop: Popover bám theo vị trí hover có boundary clamping chống tràn.
   - Mobile: Tự động chuyển thành Bottom Sheet Drawer trượt từ dưới lên khi tap.
4. **Mobile First Responsive Polish:**
   - Grid 8x8, Top 3 Podium, Quests Form, Shop Modal chuẩn hóa touch-friendly $\ge 44px$.
