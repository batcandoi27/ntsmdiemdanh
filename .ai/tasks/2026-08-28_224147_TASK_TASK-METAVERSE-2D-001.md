# TASK CONTRACT: NÂNG CẤP METAVERSE LÀNG LỚP HỌC 2D
**Mã Task:** `TASK-METAVERSE-2D-001`  
**Chủ đề:** Quy hoạch Không Gian 8x8, Tùy Biến Màu Trứng, Phân Khu Level-Gating & Wandering AI Di Chuyển Mượt Mà  
**Kiến trúc sư độc lập:** ChatGPT Web Luna qua Bridge 17841  
**Người thực thi:** Antigravity  

---

## 1. MỤC TIÊU & PHẠM VI (SCOPE & OBJECTIVES)
1. **Tùy biến Trứng Học Sinh (Egg Customization):**
   - Học sinh có thể chọn màu sắc quả trứng ban đầu qua bảng màu (Presets + Custom HEX).
   - SVG quả trứng Level 0 render đúng màu đã lưu, có hiệu ứng rung nhẹ (wobble/bounce).
2. **Quy hoạch Bản đồ 8x8 (64 Ô Đất) & Phân Khu Level-Gating:**
   - **Khu Dân Cư (28 Ô Viền):** `[0,y]`, `[7,y]`, `[x,0]`, `[x,7]` làm Nhà Riêng của từng học sinh.
   - **Không Gian Công Cộng (36 Ô Trung Tâm `[1,1]` đến `[6,6]`):**
     * *Quảng Trường Giao Lưu (Central Plaza):* Yêu cầu Level $\ge 1$.
     * *Thư Viện Tri Thức (Library Hub):* Yêu cầu Level $\ge 5$.
     * *Đấu Trường Sáng Tạo (Arena / Lab):* Yêu cầu Level $\ge 10$.
     * *Rừng Vũ Trụ Phép Thuật (Cosmic Forest):* Yêu cầu Level $\ge 20$.
3. **Wandering AI & Vòng Đời Linh Vật:**
   - Trứng chưa nở (Level 0) nằm yên tại ô Nhà viền.
   - Thú đã nở (Level $\ge 1$) di chuyển vào vùng công cộng.
   - Thuật toán Wandering AI tự động chọn ngẫu nhiên ô hợp lệ lân cận sau mỗi 3-5 giây theo đúng Level-gating.
4. **Hiệu Ứng Chuyển Động (1.5s Tweening & Flip Facing):**
   - Di chuyển mượt mà 1.5s bằng CSS Transition / Transform.
   - Tự động lật mặt `scaleX(-1)` khi di chuyển sang trái, `scaleX(1)` khi di chuyển sang phải.
   - Click/hover hiển thị Drawer thông tin thú cưng ẩn danh, cấp độ, khu vực và bong bóng biểu cảm.

---

## 2. KẾ HOẠCH TRIỂN KHAI THEO 4 PHASES
- **Phase 1: Domain Core & Zoning Rules (`src/domain/classroom-world/`)**
- **Phase 2: Egg Customization Modal & SvgPet Integration**
- **Phase 3: Wandering AI Engine & ClassroomWorldGrid Refactor**
- **Phase 4: Animation Interpolation, Drawer UI, Tests & Build Sweep**
