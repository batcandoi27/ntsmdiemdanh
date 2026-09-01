# 🛡️ MA TRẬN BẢO VỆ DỮ LIỆU CÁ NHÂN TRẺ EM & AN TOÀN SƯ PHẠM (CHILD DATA PROTECTION & SAFETY MATRIX)
> **Căn cứ pháp lý:** Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 & Nghị định 356/2025/NĐ-CP (Có hiệu lực thi hành từ ngày 01/01/2026).  
> **Chuẩn mực quốc tế:** Hướng dẫn AI Trẻ em UNICEF (Child-Centred AI Guidance), UNESCO Generative AI Guidance.  
> **Phạm vi áp dụng:** Toàn bộ phân hệ Cổng Học Sinh (`/student`), Cổng Phụ Huynh (`/portal`), và Hệ thống Hậu kiểm GVCN (`/homeroom`).

---

## 1. NGUYÊN TẮC BẢO VỆ DỮ LIỆU CỐT LÕI (SAFE-BY-DESIGN)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  5 NGUYÊN TẮC BẢO VỆ DỮ LIỆU TRẺ EM THEO LUẬT 91/2025/QH15 & NĐ 356/2025/NĐ-CP  │
├──────────────────────────────────────────────────────────────────────────────────┤
│  1. TỐI THIỂU HÓA DỮ LIỆU (Data Minimization):                                  │
│     Chỉ thu thập dữ liệu tối thiểu cần thiết cho mục đích học tập; tuyệt đối      │
│     không thu thập tọa độ GPS, địa chỉ nhà chi tiết hoặc hình ảnh gia đình.     │
│                                                                                  │
│  2. PHÂN TÁCH ĐỊNH DANH ẨN DANH (Pseudonymization & Identity Isolation):        │
│     Mã học sinh thật (Student ID) được tách biệt hoàn toàn với Bí Danh Pet       │
│     (Anonymous Name) công khai trong Làng Lớp Học 2.5D.                          │
│                                                                                  │
│  3. GIỚI HẠN THỜI GIAN LƯU TRỮ (Retention & Scheduled Deletion):                │
│     Minh chứng ảnh/video bài tập tự động xóa quyền truy cập sau khi kết thúc     │
│     năm học hoặc theo yêu cầu của Cha/Mẹ (Người đại diện hợp pháp).              │
│                                                                                  │
│  4. AN TOÀN TRẺ EM ĐẶT LÊN HÀNG ĐẦU (Best Interests of the Child):              │
│     Hộp thư tâm sự bảo mật riêng tư 1-1 với GVCN; có quy trình ngoại lệ an toàn  │
│     (Safety Escalation Protocol) khi phát hiện nguy cơ ảnh hưởng sức khỏe/tâm lý.│
│                                                                                  │
│  5. KHÔNG PHẠT TÂM LÝ & KHÔNG PAY-TO-WIN (Non-Punitive & Fair Play):             │
│     Không tước đoạt cấp độ khi học sinh vắng mặt; vật phẩm game chỉ mang tính    │
│     thẩm mỹ, 0% tác động đến điểm số học tập thật.                              │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN PHÂN LOẠI VÀ PHÂN QUYỀN TRUY CẬP DỮ LIỆU (DATA ACCESS & PRIVACY MATRIX)

| Trường Dữ Liệu | Phân Loại | Hiển Thị Với Học Sinh Khác | Hiển Thị Với GVCN / Admin | Thời Gian Lưu Trữ | Biện Pháp Bảo Vệ |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Mã Học Sinh Thật** (`student_id`) | Nhạy cảm danh tính | ❌ Ẩn tuyệt đối | ✅ Có (Quản lý hồ sơ) | Toàn khóa học | Băm mã hóa, lưu bảng bảo mật |
| **Bí Danh Thú Cưng** (`anonymous_name`) | Công khai nội bộ | ✅ Hiển thị | ✅ Hiển thị | Theo năm học | Tự sinh ngẫu nhiên (VD: `Phượng Hoàng #821`) |
| **Ảnh Minh Chứng Bài Nộp** (`proof_urls`) | Bằng chứng học tập | ❌ Ẩn riêng tư | ✅ Có (Duyệt bài) | 1 năm học | Lưu trên Google Drive của trường / Private URL |
| **Nhật Ký Tự Soi Chiếu** (`reflection`) | Riêng tư cá nhân | ❌ Ẩn riêng tư | ❌ Ẩn (Chỉ học sinh thấy) | 1 học kỳ | Local encrypted storage / Private |
| **Tin Nhắn Hộp Thư Tâm Sự** (`counselor`) | Bảo mật sư phạm | ❌ Ẩn riêng tư | ✅ Chỉ GVCN | 1 năm học | Mã hóa truyền tải, kiểm soát phân quyền |
| **Vị Trí Ô Đất 2.5D** (`grid_x, grid_y`) | Không gian ảo | ✅ Hiển thị | ✅ Hiển thị | Theo năm học | Tọa độ ảo trong game, không liên quan địa lý thật |

---

## 3. QUY TRÌNH KÍCH HOẠT NGOẠI LỆ AN TOÀN (SAFETY ESCALATION PROTOCOL)

Hộp Thư Tâm Sự (`/student/records`) được thiết kế với cơ chế minh bạch:
1. **Thông điệp hiển thị cho học sinh:**
   > *"Tin nhắn này được giữ riêng tư giữa em và Giáo viên Chủ nhiệm. Trong các tình huống có nguy cơ về sức khỏe hoặc sự an toàn của học sinh, nhà trường sẽ phối hợp để bảo vệ em một cách tốt nhất."*
2. **Quy trình xử lý khi phát hiện nguy cơ an toàn:**
   - **Bước 1:** GVCN tiếp nhận thông tin và trực tiếp lắng nghe, hỗ trợ học sinh trong môi trường an toàn, bảo mật.
   - **Bước 2:** Nếu có dấu hiệu bạo lực học đường, khủng hoảng tâm lý hoặc nguy hại thể chất, GVCN báo cáo Ban Giám Hiệu và chuyên viên tư vấn tâm lý học đường theo đúng quy định của Bộ GD&ĐT và pháp luật trẻ em.
   - **Bước 3:** Tuyệt đối không công khai danh tính hoặc nội dung tin nhắn lên môi trường công cộng.

---

## 4. QUY TRÌNH THỰC THI QUYỀN CỦA CHỦ THỂ DỮ LIỆU (DATA SUBJECT RIGHTS)

Theo quy định của **Luật 91/2025/QH15**:
* **Quyền Được Biết & Đồng Thuận:** Cha mẹ / Người giám hộ được thông báo minh bạch về mục đích xử lý dữ liệu thông qua Cổng Phụ Huynh (`/portal`).
* **Quyền Yêu Cầu Xóa Dữ Liệu (Right to Erasure):** Khi học sinh chuyển trường hoặc kết thúc cấp học, toàn bộ hình ảnh minh chứng và dữ liệu định danh game được kích hoạt quy trình xóa an toàn.
* **Quyền Trích Xuất Dữ Liệu (Data Portability):** Cung cấp chức năng xuất sổ rèn luyện và hồ sơ học tập ra định dạng chuẩn (JSON / Docx).
