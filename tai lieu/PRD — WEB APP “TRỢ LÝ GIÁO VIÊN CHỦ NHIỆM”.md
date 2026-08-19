# PRD — WEB APP “TRỢ LÝ GIÁO VIÊN CHỦ NHIỆM”
## Hệ thống quản lý lớp học, theo dõi học sinh và phối hợp giáo dục

**Phiên bản:** 1.0  
**Đối tượng chính:** Giáo viên chủ nhiệm THCS  
**Khả năng mở rộng:** Tiểu học → THCS → THPT  
**Nền tảng:** Web responsive, ưu tiên desktop nhưng sử dụng tốt trên điện thoại  
**Ngôn ngữ:** Tiếng Việt  
**Mục tiêu cốt lõi:** Giúp giáo viên chủ nhiệm giảm thời gian hành chính, phát hiện sớm vấn đề của học sinh, phối hợp hiệu quả với giáo viên bộ môn – phụ huynh – nhà trường và tạo ra hồ sơ giáo dục có căn cứ.

---

# 1. TẦM NHÌN SẢN PHẨM

Đây không phải là phần mềm “quản lý danh sách học sinh”.

Hệ thống phải trở thành **trung tâm điều phối công tác chủ nhiệm**, giúp giáo viên trả lời được 7 câu hỏi quan trọng:

1. **Lớp tôi hiện đang có vấn đề gì?**
2. **Học sinh nào cần tôi quan tâm ngay?**
3. **Vấn đề đó bắt đầu từ khi nào và diễn biến ra sao?**
4. **Tôi đã xử lý những gì? Kết quả thế nào?**
5. **Phụ huynh đã được thông tin chưa?**
6. **Giáo viên bộ môn và các bên liên quan đang nhìn nhận vấn đề thế nào?**
7. **Cuối kỳ/cuối năm tôi có đủ dữ liệu để đánh giá sự tiến bộ của học sinh hay không?**

Hệ thống phải chuyển từ mô hình:

> Giáo viên nhớ bằng đầu → ghi chép giấy → nhắn tin rời rạc → cuối kỳ tổng hợp thủ công

sang:

> **Ghi nhận → phát hiện → phối hợp → can thiệp → theo dõi → đánh giá → báo cáo**

---

# 2. MỤC TIÊU SẢN PHẨM

## 2.1. Mục tiêu đối với giáo viên chủ nhiệm

Giảm đáng kể thời gian cho:

- điểm danh;
- theo dõi vi phạm;
- theo dõi chuyên cần;
- ghi nhận nhận xét;
- tổng hợp tình hình học sinh;
- liên hệ phụ huynh;
- lập danh sách học sinh cần hỗ trợ;
- tổng hợp ý kiến giáo viên bộ môn;
- lập báo cáo;
- chuẩn bị họp phụ huynh;
- theo dõi các cam kết/kế hoạch hỗ trợ học sinh.

## 2.2. Mục tiêu giáo dục

Hệ thống phải hỗ trợ giáo viên:

- phát hiện sớm học sinh có dấu hiệu bất thường;
- theo dõi sự tiến bộ;
- không chỉ tập trung vào học lực;
- quan sát đồng thời:
  - học tập;
  - chuyên cần;
  - hành vi;
  - thái độ;
  - quan hệ bạn bè;
  - tham gia hoạt động;
  - hoàn cảnh cần hỗ trợ;
  - phối hợp gia đình;
- chuyển từ “xử lý vi phạm” sang “can thiệp và giáo dục”.

## 2.3. Mục tiêu phối hợp

Tạo một nguồn thông tin thống nhất giữa:

**GVCN ↔ GV bộ môn ↔ Phụ huynh ↔ Ban giám hiệu ↔ Tổng phụ trách/Đoàn/Đội ↔ Nhân sự hỗ trợ học sinh**

nhưng phải kiểm soát quyền truy cập dữ liệu.

---

# 3. NGUYÊN TẮC THIẾT KẾ

## 3.1. “Một học sinh là một hồ sơ giáo dục”

Mỗi học sinh có một hồ sơ xuyên suốt năm học.

Không tạo dữ liệu rời rạc theo từng chức năng.

---

## 3.2. Không biến giáo viên thành nhân viên nhập liệu

Mọi thao tác thường xuyên phải:

- nhanh;
- ít click;
- hỗ trợ nhập hàng loạt;
- hỗ trợ chọn nhiều học sinh;
- có mẫu;
- có phím tắt nếu phù hợp;
- sử dụng mobile tốt.

Ví dụ:

Thay vì:

> Học sinh → mở hồ sơ → chọn vi phạm → nhập → lưu → quay lại.

Cho phép:

> **Lớp → chọn 5 học sinh → “Đi muộn” → lưu.**

---

## 3.3. Dữ liệu phải phục vụ hành động

Không chỉ hiển thị:

> Nguyễn Văn A: 5 lần vi phạm.

Mà phải cho biết:

> Nguyễn Văn A  
> - 5 lần đi muộn trong 3 tuần  
> - tập trung vào thứ Hai  
> - đã trao đổi với học sinh 2 lần  
> - đã liên hệ phụ huynh 1 lần  
> - chưa cải thiện  
> → **Đề xuất tiếp tục can thiệp**

---

## 3.4. Không sử dụng điểm số làm chỉ báo duy nhất

Hệ thống phải tránh tư duy:

> điểm thấp = học sinh có vấn đề.

Cần đánh giá đa chiều.

---

# 4. CÁC LOẠI NGƯỜI DÙNG

## 4.1. Giáo viên chủ nhiệm

Quyền chính:

- quản lý lớp được phân công;
- xem hồ sơ học sinh;
- nhập dữ liệu;
- ghi nhận sự kiện;
- theo dõi can thiệp;
- giao tiếp với phụ huynh;
- xem dữ liệu GV bộ môn chia sẻ;
- tạo báo cáo lớp.

---

## 4.2. Giáo viên bộ môn

Có thể:

- điểm danh môn học;
- ghi nhận nhận xét;
- báo cáo vấn đề;
- đề xuất hỗ trợ;
- xem dữ liệu được phép xem.

Không được mặc định xem toàn bộ hồ sơ riêng tư của học sinh.

---

## 4.3. Phụ huynh

Có thể:

- xem thông tin của con;
- xem thông báo;
- xác nhận đã đọc;
- phản hồi;
- xem nhiệm vụ/kế hoạch phối hợp;
- cập nhật một số thông tin được nhà trường cho phép;
- trao đổi với GVCN.

---

## 4.4. Ban giám hiệu

Có thể:

- xem tổng quan;
- xem báo cáo;
- theo dõi lớp;
- theo dõi các trường hợp cần hỗ trợ;
- phân quyền;
- quản lý năm học;
- không mặc định xem nội dung trao đổi riêng tư nếu không có quyền.

---

## 4.5. Quản trị viên

Quản lý:

- tài khoản;
- năm học;
- trường;
- lớp;
- môn học;
- danh mục;
- quyền;
- cấu hình hệ thống.

---

# 5. CẤU TRÚC HỆ THỐNG

Menu chính:

1. **Tổng quan**
2. **Lớp của tôi**
3. **Học sinh**
4. **Điểm danh**
5. **Theo dõi học tập**
6. **Hành vi & sự kiện**
7. **Can thiệp & hỗ trợ**
8. **Phối hợp phụ huynh**
9. **Phối hợp giáo viên**
10. **Nhiệm vụ**
11. **Hoạt động lớp**
12. **Hồ sơ & minh chứng**
13. **Báo cáo**
14. **Lịch**
15. **Thông báo**
16. **Cài đặt**

---

# 6. DASHBOARD GVCN

Dashboard không được chỉ có biểu đồ.

Màn hình đầu tiên phải trả lời:

## “Hôm nay tôi cần làm gì?”

### Khu vực 1 — Việc cần xử lý

Ví dụ:

- 3 học sinh nghỉ chưa có lý do;
- 2 học sinh đi muộn nhiều lần;
- 1 phụ huynh chưa phản hồi;
- 4 nhiệm vụ sắp quá hạn;
- 2 học sinh có cảnh báo cần theo dõi;
- 1 trường hợp đang trong kế hoạch hỗ trợ.

---

## Khu vực 2 — Tình hình lớp

Hiển thị:

- sĩ số;
- có mặt;
- vắng;
- đi muộn;
- tình hình học tập;
- số sự kiện;
- số học sinh cần quan tâm;
- mức độ hoàn thành nhiệm vụ.

---

## Khu vực 3 — Học sinh cần chú ý

Danh sách theo mức:

### 🔴 Cần xử lý

Có dấu hiệu cần can thiệp ngay.

### 🟠 Cần theo dõi

Có dấu hiệu bất thường nhưng chưa cần can thiệp mạnh.

### 🟢 Bình thường

Không có cảnh báo đáng chú ý.

---

# 7. QUẢN LÝ LỚP

## 7.1. Hồ sơ lớp

Thông tin:

- tên lớp;
- năm học;
- khối;
- GVCN;
- danh sách học sinh;
- ban cán sự;
- tổ;
- sơ đồ chỗ ngồi;
- giáo viên bộ môn;
- lịch học;
- mục tiêu lớp;
- ghi chú lớp.

---

## 7.2. Sơ đồ chỗ ngồi

Cho phép:

- kéo thả;
- tạo bàn;
- tạo hàng;
- thay đổi vị trí;
- gán học sinh;
- lưu nhiều phiên bản.

Có thể lưu:

- sơ đồ đầu năm;
- sơ đồ học kỳ 1;
- sơ đồ học kỳ 2;
- sơ đồ đặc biệt.

---

# 8. QUẢN LÝ HỌC SINH

## 8.1. Danh sách học sinh

Các cột:

- STT;
- họ tên;
- ngày sinh;
- giới tính;
- mã học sinh;
- tổ;
- tình trạng chuyên cần;
- kết quả học tập;
- số sự kiện;
- mức cảnh báo;
- trạng thái hỗ trợ.

Cho phép:

- tìm kiếm;
- lọc;
- sắp xếp;
- nhóm;
- xuất Excel;
- nhập Excel.

---

# 9. HỒ SƠ HỌC SINH

Đây là **module quan trọng nhất của hệ thống**.

Mỗi học sinh có các tab:

### 1. Tổng quan

### 2. Thông tin cơ bản

### 3. Gia đình

### 4. Chuyên cần

### 5. Học tập

### 6. Hành vi

### 7. Hoạt động

### 8. Ghi nhận tích cực

### 9. Vấn đề cần hỗ trợ

### 10. Kế hoạch can thiệp

### 11. Phối hợp phụ huynh

### 12. Trao đổi với giáo viên

### 13. Tiến bộ

### 14. Minh chứng

### 15. Timeline

---

# 10. TIMELINE HỌC SINH

Mọi sự kiện quan trọng được hiển thị theo dòng thời gian.

Ví dụ:

**05/09**

Học sinh nghỉ học.

**08/09**

GV bộ môn phản ánh mất tập trung.

**10/09**

GVCN trao đổi với học sinh.

**12/09**

GVCN liên hệ phụ huynh.

**20/09**

Tình hình cải thiện.

Timeline giúp giáo viên hiểu:

> **“Chuyện gì đã xảy ra?”**

thay vì chỉ nhìn vào các con số.

---

# 11. ĐIỂM DANH

## 11.1. Điểm danh lớp

Các trạng thái:

- Có mặt;
- Vắng có phép;
- Vắng không phép;
- Đi muộn;
- Về sớm;
- Có lý do khác.

---

## 11.2. Điểm danh nhanh

Cho phép:

- tất cả có mặt;
- chọn học sinh vắng;
- chọn học sinh đi muộn.

---

## 11.3. Điểm danh theo môn

GV bộ môn có thể điểm danh.

Dữ liệu được chuyển về GVCN.

---

## 11.4. Cảnh báo chuyên cần

Tự động phát hiện:

- nghỉ nhiều;
- nghỉ liên tiếp;
- đi muộn lặp lại;
- tăng đột biến số buổi nghỉ;
- vắng không phép.

---

# 12. THEO DÕI HỌC TẬP

Không cần thay thế hệ thống điểm chính thức của nhà trường.

Ứng dụng tập trung vào **theo dõi và phát hiện vấn đề**.

Có thể nhập:

- điểm;
- mức đánh giá;
- nhận xét GV;
- môn học;
- xu hướng tăng/giảm.

---

## 12.1. Phát hiện bất thường

Ví dụ:

Một học sinh:

- Toán giảm;
- Ngữ văn giảm;
- Khoa học giảm;

trong 3 tuần liên tiếp.

Hệ thống tạo:

> ⚠️ Xu hướng học tập giảm.

Không tự kết luận nguyên nhân.

---

# 13. GHI NHẬN HÀNH VI

Danh mục mặc định:

### Tích cực

- giúp đỡ bạn;
- tiến bộ;
- chủ động;
- trách nhiệm;
- tích cực hoạt động;
- trung thực;
- sáng tạo;
- có tinh thần tập thể.

### Cần cải thiện

- đi muộn;
- quên đồ dùng;
- không hoàn thành nhiệm vụ;
- mất tập trung;
- nói chuyện;
- vi phạm nội quy;
- xung đột;
- sử dụng thiết bị không đúng quy định.

Danh mục phải **cho phép trường tự cấu hình**.

---

# 14. GHI NHẬN SỰ KIỆN

Mỗi sự kiện gồm:

- học sinh;
- thời gian;
- người ghi nhận;
- loại sự kiện;
- mức độ;
- mô tả;
- nguyên nhân nếu biết;
- hành động đã thực hiện;
- người liên quan;
- minh chứng;
- trạng thái xử lý.

Trạng thái:

- Mới;
- Đang xử lý;
- Đã phối hợp;
- Đã giải quyết;
- Theo dõi tiếp;
- Đóng.

---

# 15. CƠ CHẾ “CẢNH BÁO SỚM”

Đây là tính năng tạo giá trị lớn nhất.

Hệ thống không tự “gắn nhãn học sinh xấu”.

Thay vào đó dùng:

> **Chỉ báo cần quan tâm**

Ví dụ:

### Chuyên cần

- nghỉ ≥ 3 buổi/tháng;
- nghỉ liên tiếp;
- nhiều lần đi muộn.

### Học tập

- giảm kết quả liên tiếp;
- không hoàn thành nhiệm vụ nhiều lần;
- nhiều GV bộ môn cùng phản ánh.

### Hành vi

- nhiều sự kiện tương tự;
- sự kiện tăng nhanh.

### Phối hợp

- phụ huynh chưa phản hồi;
- kế hoạch hỗ trợ quá hạn.

### Tổng hợp

Một học sinh đồng thời có:

- chuyên cần giảm;
- học tập giảm;
- hành vi thay đổi.

→ nâng mức ưu tiên theo dõi.

**Không sử dụng thuật toán để chẩn đoán tâm lý, sức khỏe hoặc hoàn cảnh gia đình.**

---

# 16. HỆ THỐNG MỨC ĐỘ QUAN TÂM

Có 4 mức:

### Mức 0 — Bình thường

Không có chỉ báo.

### Mức 1 — Theo dõi

Có dấu hiệu cần quan sát.

### Mức 2 — Cần phối hợp

Cần GVCN làm việc với học sinh/phụ huynh/GVBM.

### Mức 3 — Cần hỗ trợ chuyên môn

Cần chuyển/đề nghị hỗ trợ từ nhà trường hoặc bộ phận có thẩm quyền.

Hệ thống **không tự quyết định biện pháp giáo dục**.

---

# 17. MODULE CAN THIỆP & HỖ TRỢ

Mỗi trường hợp cần hỗ trợ có:

- vấn đề;
- mục tiêu;
- ngày bắt đầu;
- người phụ trách;
- học sinh;
- người phối hợp;
- hành động;
- thời hạn;
- kết quả;
- đánh giá;
- bước tiếp theo.

Ví dụ:

> Vấn đề: Không hoàn thành bài tập  
> Mục tiêu: Hoàn thành ≥ 80% nhiệm vụ  
> Thời gian: 4 tuần  
> Phối hợp: GVCN + GV Toán + PH  
> Theo dõi: hàng tuần

---

# 18. KẾ HOẠCH HỖ TRỢ CÁ NHÂN

Có thể tạo:

- mục tiêu;
- hành động;
- người chịu trách nhiệm;
- lịch kiểm tra;
- tiêu chí thành công;
- kết quả.

Ví dụ:

**Mục tiêu**

> Đi học đúng giờ ít nhất 90% số ngày trong 4 tuần.

**Theo dõi**

Tuần 1: 75%  
Tuần 2: 85%  
Tuần 3: 95%

Hệ thống hiển thị:

> **Đang tiến bộ.**

---

# 19. PHỐI HỢP GIÁO VIÊN BỘ MÔN

GVCN có thể tạo yêu cầu:

> “Đề nghị giáo viên bộ môn cập nhật tình hình học sinh X.”

GVBM nhận thông báo.

Có thể phản hồi:

- tình hình;
- nhận xét;
- đề xuất;
- mức độ cần quan tâm.

GVCN nhìn thấy phản hồi tập trung.

---

# 20. PHỐI HỢP PHỤ HUYNH

Không biến hệ thống thành ứng dụng chat đơn thuần.

Cần 4 loại tương tác:

### 1. Thông báo

Ví dụ:

> Lịch kiểm tra.

### 2. Trao đổi

Ví dụ:

> GVCN trao đổi riêng về tình hình học tập.

### 3. Xác nhận

Phụ huynh xác nhận:

> Đã nhận thông tin.

### 4. Phối hợp

Ví dụ:

> Đề nghị gia đình hỗ trợ học sinh chuẩn bị bài.

Phụ huynh có thể:

> Đã thực hiện / Chưa thực hiện / Cần trao đổi thêm.

---

# 21. LỊCH SỬ LIÊN HỆ PHỤ HUYNH

Mỗi lần liên hệ lưu:

- thời gian;
- người liên hệ;
- phương thức;
- nội dung;
- kết quả;
- bước tiếp theo.

Phương thức:

- ứng dụng;
- điện thoại;
- gặp trực tiếp;
- họp phụ huynh;
- kênh khác.

Điều này giúp tránh tình trạng:

> “Tôi nhớ là đã trao đổi rồi nhưng không nhớ lúc nào.”

---

# 22. NHẬN XÉT TÍCH CỰC

Hệ thống phải có module riêng cho **ghi nhận điểm mạnh**.

GVCN có thể ghi:

> “Chủ động hỗ trợ bạn trong hoạt động nhóm.”

Học sinh không chỉ xuất hiện trong hệ thống khi vi phạm.

Dashboard phải có:

> **Tiến bộ nổi bật trong tuần**

---

# 23. HOẠT ĐỘNG LỚP

Quản lý:

- sinh hoạt lớp;
- hoạt động trải nghiệm;
- hoạt động Đội;
- lao động;
- phong trào;
- cuộc thi;
- hoạt động thiện nguyện;
- nhiệm vụ tập thể.

Có thể ghi:

- tham gia;
- vai trò;
- kết quả;
- nhận xét.

---

# 24. QUẢN LÝ NHIỆM VỤ

GVCN tạo nhiệm vụ:

- người thực hiện;
- nội dung;
- deadline;
- mức độ ưu tiên.

Ví dụ:

> Ban cán sự lớp chuẩn bị nội dung sinh hoạt.

Hoặc:

> GVCN liên hệ phụ huynh học sinh X.

Có dashboard:

- quá hạn;
- hôm nay;
- sắp tới;
- đã hoàn thành.

---

# 25. SINH HOẠT LỚP

Tạo biên bản sinh hoạt lớp theo mẫu.

Có:

- thời gian;
- nội dung;
- tình hình tuần;
- ưu điểm;
- hạn chế;
- học sinh nổi bật;
- vấn đề cần xử lý;
- kế hoạch tuần tới.

Hệ thống tự lấy dữ liệu từ các module khác để hỗ trợ giáo viên.

Ví dụ:

> Tuần này có 8 lượt đi muộn.

GVCN không phải đếm thủ công.

---

# 26. HỌP PHỤ HUYNH

Tạo danh sách:

- học sinh;
- tình hình học tập;
- chuyên cần;
- ưu điểm;
- vấn đề cần trao đổi;
- nội dung cần phối hợp.

Có thể tạo:

> **Phiếu tóm tắt học sinh**

phục vụ họp phụ huynh.

---

# 27. QUẢN LÝ THÔNG BÁO

Thông báo theo:

- toàn trường;
- khối;
- lớp;
- nhóm học sinh;
- phụ huynh cụ thể;
- giáo viên.

Có:

- đã gửi;
- đã nhận;
- đã đọc;
- cần xác nhận.

---

# 28. HỆ THỐNG NHẮC VIỆC

Tự động nhắc:

- chưa điểm danh;
- chưa xử lý sự kiện;
- phụ huynh chưa phản hồi;
- nhiệm vụ sắp đến hạn;
- kế hoạch hỗ trợ đến kỳ đánh giá;
- học sinh có dấu hiệu cần theo dõi;
- báo cáo sắp đến hạn.

---

# 29. BÁO CÁO

## 29.1. Báo cáo lớp

- sĩ số;
- chuyên cần;
- học tập;
- hành vi;
- hoạt động;
- tình hình hỗ trợ.

---

## 29.2. Báo cáo học sinh

Một trang A4:

- thông tin cơ bản;
- điểm mạnh;
- quá trình học tập;
- chuyên cần;
- sự kiện;
- hỗ trợ;
- tiến bộ;
- phối hợp phụ huynh.

---

## 29.3. Báo cáo học kỳ

Tự tổng hợp:

- tình hình lớp;
- học sinh tiến bộ;
- học sinh cần hỗ trợ;
- chuyên cần;
- kết quả học tập;
- hoạt động;
- công tác phối hợp.

---

## 29.4. Xuất dữ liệu

Hỗ trợ:

- PDF;
- Excel;
- CSV.

---

# 30. MINH CHỨNG

Mỗi sự kiện có thể đính kèm:

- ảnh;
- PDF;
- tài liệu;
- biên bản.

Nhưng phải có:

- quyền truy cập;
- người tải;
- thời gian;
- loại minh chứng.

Không cho phép tài khoản thông thường xem dữ liệu ngoài phạm vi quyền.

---

# 31. TÌM KIẾM TOÀN HỆ THỐNG

Tìm theo:

- tên học sinh;
- mã học sinh;
- lớp;
- sự kiện;
- phụ huynh;
- giáo viên;
- nhiệm vụ.

Ví dụ nhập:

> Nguyễn Văn A

Hiển thị:

- hồ sơ;
- sự kiện;
- điểm danh;
- liên hệ;
- nhiệm vụ;
- kế hoạch hỗ trợ.

---

# 32. BỘ LỌC

Các bộ lọc quan trọng:

- lớp;
- tổ;
- mức độ quan tâm;
- chuyên cần;
- học tập;
- hành vi;
- chưa liên hệ phụ huynh;
- đang hỗ trợ;
- quá hạn;
- có tiến bộ;
- chưa có dữ liệu.

---

# 33. IMPORT / EXPORT

## Import

Hỗ trợ Excel:

- danh sách học sinh;
- danh sách lớp;
- danh sách giáo viên;
- dữ liệu điểm danh;
- dữ liệu học tập.

Có bước:

1. tải file;
2. mapping cột;
3. kiểm tra lỗi;
4. preview;
5. xác nhận import.

Không import trực tiếp nếu dữ liệu lỗi.

---

# 34. AI — CHỈ DÙNG ĐỂ TĂNG NĂNG SUẤT

AI không được thay giáo viên quyết định.

## AI có thể:

### 1. Tóm tắt hồ sơ

> Tóm tắt tình hình học sinh trong 4 tuần.

### 2. Phát hiện xu hướng

> Những thay đổi đáng chú ý gần đây.

### 3. Soạn nháp nhận xét

GVCN duyệt trước khi lưu.

### 4. Soạn thông báo phụ huynh

Có thể chọn:

- thân thiện;
- trang trọng;
- ngắn gọn;
- tích cực.

### 5. Gợi ý câu hỏi trao đổi

Ví dụ:

> Nên trao đổi với học sinh thế nào để tìm nguyên nhân?

### 6. Tóm tắt cuộc họp

Nếu giáo viên nhập nội dung cuộc họp.

### 7. Tạo báo cáo

AI chỉ tạo **bản nháp**.

---

# 35. AI KHÔNG ĐƯỢC LÀM

Không cho AI tự động:

- chẩn đoán tâm lý;
- kết luận học sinh có vấn đề gia đình;
- gắn nhãn “học sinh cá biệt”;
- đánh giá đạo đức tự động;
- quyết định kỷ luật;
- gửi thông tin nhạy cảm cho phụ huynh;
- quyết định chuyển trường;
- quyết định hình thức xử lý.

Mọi quyết định giáo dục quan trọng phải do con người phê duyệt.

---

# 36. QUẢN LÝ QUYỀN RIÊNG TƯ

Phải phân quyền theo nguyên tắc:

> **Chỉ xem dữ liệu cần thiết để thực hiện nhiệm vụ.**

Ví dụ:

GVCN:

> Toàn bộ hồ sơ lớp.

GVBM:

> Dữ liệu phục vụ môn học và thông tin được chia sẻ.

Phụ huynh:

> Chỉ con mình.

BGH:

> Theo phạm vi quản lý.

---

# 37. AUDIT LOG

Mọi hành động quan trọng phải lưu:

- ai;
- lúc nào;
- làm gì;
- dữ liệu nào;
- trước/sau nếu dữ liệu quan trọng.

Ví dụ:

> 19/08/2026 20:35  
> Giáo viên A  
> thay đổi trạng thái sự kiện học sinh X  
> “Đang xử lý” → “Đã giải quyết”.

---

# 38. MÔ HÌNH DỮ LIỆU CỐT LÕI

Database tối thiểu gồm:

```text
schools
academic_years
terms
grades
classes
subjects

users
roles
permissions

students
student_guardians
guardians

teachers
teacher_assignments

attendance
attendance_records

academic_records

behavior_categories
behavior_events

positive_records

alerts
alert_rules

interventions
intervention_actions
intervention_reviews

parent_contacts
messages
notifications

tasks
activities

meetings
meeting_notes

attachments
audit_logs

student_tags
class_seating
```

---

# 39. ENTITY STUDENT

Các trường chính:

```text
id
student_code
full_name
date_of_birth
gender
class_id
status
avatar
created_at
updated_at
```

Không đưa những dữ liệu nhạy cảm không cần thiết vào hệ thống.

---

# 40. ENTITY EVENT

```text
id
student_id
created_by
event_type
category
severity
occurred_at
description
action_taken
status
follow_up_date
created_at
updated_at
```

---

# 41. ENTITY INTERVENTION

```text
id
student_id
title
problem
goal
start_date
end_date
priority
owner_id
status
success_criteria
result
created_at
updated_at
```

---

# 42. ENTITY PARENT CONTACT

```text
id
student_id
teacher_id
contact_method
contacted_at
purpose
summary
parent_response
next_action
next_action_date
created_at
```

---

# 43. WORKFLOW — HỌC SINH CÓ VẤN ĐỀ

```text
Phát hiện
   ↓
Ghi nhận
   ↓
Hệ thống tạo chỉ báo
   ↓
GVCN xem xét
   ↓
Trao đổi với học sinh
   ↓
Nếu cần → phối hợp GVBM
   ↓
Nếu cần → phối hợp phụ huynh
   ↓
Tạo kế hoạch hỗ trợ
   ↓
Theo dõi
   ↓
Đánh giá
   ↓
Tiến bộ → đóng
Không tiến bộ → tiếp tục / nâng mức hỗ trợ
```

---

# 44. WORKFLOW — HỌC SINH TIẾN BỘ

```text
Ghi nhận tích cực
      ↓
Theo dõi
      ↓
GVCN ghi nhận
      ↓
Có thể chia sẻ với phụ huynh
      ↓
Đưa vào nhận xét/báo cáo
```

Hệ thống phải chủ động khuyến khích giáo viên ghi nhận tiến bộ.

---

# 45. WORKFLOW — PHỤ HUYNH KHÔNG PHẢN HỒI

```text
GVCN gửi yêu cầu phối hợp
        ↓
Chờ phản hồi
        ↓
Nhắc lần 1
        ↓
Quá hạn
        ↓
GVCN ghi nhận phương thức khác
        ↓
Đóng / tiếp tục phối hợp
```

Không tự động gửi quá nhiều thông báo gây phiền.

---

# 46. WORKFLOW — SINH HOẠT LỚP

GVCN chọn:

> “Tạo sinh hoạt tuần”

Hệ thống tự tổng hợp:

- chuyên cần;
- đi muộn;
- sự kiện;
- học sinh tích cực;
- nhiệm vụ;
- hoạt động.

GVCN bổ sung:

- nhận xét;
- nội dung;
- kế hoạch tuần sau.

→ Xuất biên bản.

---

# 47. WORKFLOW — HỌP PHỤ HUYNH

```text
Chọn lớp
↓
Chọn học sinh
↓
Hệ thống tạo tóm tắt
↓
GVCN chỉnh sửa
↓
In / xuất PDF
```

---

# 48. MOBILE

Mobile phải ưu tiên các thao tác:

### 1. Điểm danh

### 2. Ghi nhận sự kiện

### 3. Ghi nhận tích cực

### 4. Xem học sinh cần chú ý

### 5. Nhắn phụ huynh

### 6. Xử lý nhiệm vụ

### 7. Xem lịch

Desktop dùng cho:

- báo cáo;
- phân tích;
- nhập dữ liệu hàng loạt;
- quản trị.

---

# 49. TRANG “NHẬP NHANH”

Đây là màn hình cực kỳ quan trọng.

Giao diện:

```text
┌──────────────────────────────────┐
│ Lớp 8A1                          │
│                                  │
│ [ Điểm danh ] [ Sự kiện ]        │
│ [ Tích cực ] [ Nhiệm vụ ]        │
│                                  │
│ Học sinh                         │
│ □ Nguyễn Văn A                   │
│ □ Trần Văn B                     │
│ □ Lê Văn C                       │
│                                  │
│ Loại: [Đi muộn ▼]                │
│ Mức độ: [Nhẹ ▼]                  │
│                                  │
│             [ LƯU ]              │
└──────────────────────────────────┘
```

Mục tiêu:

> Một thao tác phổ biến không quá 10–15 giây.

---

# 50. TRANG “HỌC SINH CẦN QUAN TÂM”

Mỗi dòng:

```text
Học sinh
Chỉ báo
Mức độ
Xu hướng
Lần xử lý gần nhất
Phụ huynh
Bước tiếp theo
```

Ví dụ:

```text
Nguyễn Văn A
⚠ Chuyên cần giảm
🟠 Theo dõi
↓
Đã trao đổi 12/08
PH đã phản hồi
→ Theo dõi thêm 1 tuần
```

---

# 51. CHỈ SỐ HIỆU QUẢ

Không đánh giá app bằng:

> số lần giáo viên mở app.

Đánh giá bằng:

### Hiệu quả hành chính

- thời gian nhập dữ liệu;
- thời gian lập báo cáo;
- thời gian chuẩn bị họp.

### Hiệu quả phối hợp

- tỷ lệ phụ huynh phản hồi;
- tỷ lệ nhiệm vụ phối hợp hoàn thành;
- thời gian xử lý trường hợp.

### Hiệu quả giáo dục

- số trường hợp được phát hiện sớm;
- tỷ lệ trường hợp cải thiện;
- tỷ lệ học sinh có ghi nhận tích cực;
- xu hướng chuyên cần;
- xu hướng hoàn thành nhiệm vụ.

---

# 52. MVP — PHIÊN BẢN ĐẦU TIÊN

Không nên xây toàn bộ hệ thống ngay.

MVP phải gồm:

## P0 — Bắt buộc

1. Đăng nhập
2. Quản lý lớp
3. Danh sách học sinh
4. Hồ sơ học sinh
5. Điểm danh
6. Ghi nhận sự kiện
7. Ghi nhận tích cực
8. Timeline học sinh
9. Dashboard GVCN
10. Cảnh báo sớm
11. Phối hợp phụ huynh
12. Lịch sử liên hệ
13. Nhiệm vụ
14. Báo cáo cơ bản
15. Import Excel
16. Export PDF/Excel
17. Phân quyền
18. Audit log

---

# 53. PHASE 2

Bổ sung:

1. Giáo viên bộ môn
2. Điểm danh theo môn
3. Theo dõi học tập
4. Kế hoạch can thiệp
5. Sinh hoạt lớp
6. Họp phụ huynh
7. Minh chứng
8. Hoạt động lớp
9. Mobile PWA
10. Notification nâng cao.

---

# 54. PHASE 3

Bổ sung:

1. AI trợ lý GVCN
2. Phân tích xu hướng
3. Báo cáo tự động
4. Hệ thống đề xuất hành động
5. Dashboard BGH
6. Quản lý nhiều lớp
7. Quản lý nhiều trường
8. API tích hợp hệ thống trường.

---

# 55. KHẢ NĂNG MỞ RỘNG TIỂU HỌC

Không hard-code:

```text
THCS
```

Thay bằng:

```text
education_level
```

Giá trị:

```text
PRIMARY
LOWER_SECONDARY
UPPER_SECONDARY
```

Tiểu học có thể thay:

> điểm số

bằng:

> mức đánh giá / nhận xét / năng lực / phẩm chất.

Kiến trúc phải cho phép cấu hình theo cấp học.

---

# 56. KHẢ NĂNG MỞ RỘNG THPT

THPT có thể bổ sung:

- định hướng nghề nghiệp;
- tổ hợp môn;
- kết quả thi;
- hoạt động hướng nghiệp;
- hồ sơ mục tiêu cá nhân.

Không được sửa kiến trúc lõi.

---

# 57. CẤU HÌNH THEO TRƯỜNG

Admin có thể cấu hình:

- năm học;
- khối;
- lớp;
- môn học;
- danh mục hành vi;
- mức độ;
- quy tắc cảnh báo;
- mẫu báo cáo;
- mẫu thông báo;
- vai trò;
- quyền.

---

# 58. API CỐT LÕI

Backend phải có API theo resource.

Ví dụ:

```text
POST   /api/students
GET    /api/students
GET    /api/students/:id
PUT    /api/students/:id

GET    /api/classes/:id/students

POST   /api/attendance
GET    /api/attendance

POST   /api/events
GET    /api/events

POST   /api/positive-records

GET    /api/students/:id/timeline

GET    /api/alerts
PUT    /api/alerts/:id

POST   /api/interventions
PUT    /api/interventions/:id

POST   /api/parent-contacts

POST   /api/tasks
PUT    /api/tasks/:id

GET    /api/reports/class/:id
GET    /api/reports/student/:id
```

---

# 59. YÊU CẦU KỸ THUẬT

Backend phải hỗ trợ:

- REST API;
- authentication;
- RBAC;
- audit log;
- validation;
- pagination;
- filtering;
- search;
- file upload;
- background jobs;
- notification.

Frontend:

- responsive;
- component-based;
- mobile-first cho thao tác nhanh;
- desktop-first cho báo cáo.

---

# 60. YÊU CẦU HIỆU NĂNG

Với lớp khoảng 40–50 học sinh:

- mở danh sách lớp gần như tức thời;
- điểm danh không reload toàn trang;
- thao tác hàng loạt;
- tìm kiếm phản hồi nhanh.

Với trường:

- hàng nghìn học sinh;
- hàng trăm giáo viên;
- nhiều năm học.

Không được thiết kế database chỉ phù hợp một lớp.

---

# 61. OFFLINE / MẠNG YẾU

Vì giáo viên có thể sử dụng tại lớp học với mạng không ổn định, mobile nên hỗ trợ:

- cache danh sách lớp;
- nhập điểm danh offline;
- lưu local;
- đồng bộ khi có mạng;
- cảnh báo xung đột dữ liệu.

Đây là tính năng rất đáng ưu tiên nếu triển khai thực tế.

---

# 62. BẢO MẬT

Bắt buộc:

- HTTPS;
- password hashing;
- session/token an toàn;
- RBAC;
- kiểm tra quyền ở backend;
- không chỉ ẩn UI;
- audit log;
- giới hạn file upload;
- chống truy cập IDOR;
- backup;
- mã hóa dữ liệu nhạy cảm khi cần;
- cơ chế xóa/ẩn dữ liệu theo chính sách nhà trường.

---

# 63. NGUYÊN TẮC DỮ LIỆU

Không thu thập dữ liệu chỉ vì:

> “Có thể sau này cần.”

Mỗi trường dữ liệu phải trả lời được:

> **Dữ liệu này giúp giáo viên làm việc gì tốt hơn?**

Nếu không → không đưa vào MVP.

---

# 64. CHỐNG “BỆNH DASHBOARD”

Không được có:

- 20 biểu đồ vô nghĩa;
- biểu đồ 3D;
- KPI chỉ để trang trí;
- gamification giáo viên;
- bảng xếp hạng học sinh theo vi phạm;
- điểm “hạnh kiểm tự động”;
- AI phán xét học sinh.

Dashboard phải dẫn tới hành động.

---

# 65. TRANG CHỦ TỐI ƯU

Ưu tiên thứ tự:

```text
VIỆC CẦN LÀM
      ↓
HỌC SINH CẦN QUAN TÂM
      ↓
TÌNH HÌNH LỚP
      ↓
TIẾN BỘ NỔI BẬT
      ↓
LỊCH
      ↓
BÁO CÁO
```

Không ưu tiên biểu đồ trước hành động.

---

# 66. NGUYÊN TẮC UX

Một GVCN phải có thể:

### Điểm danh lớp

≤ 30 giây.

### Ghi nhận một sự kiện

≤ 15 giây nếu sử dụng mẫu.

### Tìm hồ sơ học sinh

≤ 5 giây.

### Xem tình hình học sinh

≤ 10 giây.

### Xem ai cần quan tâm

≤ 5 giây.

### Tạo nhiệm vụ

≤ 15 giây.

---

# 67. HỆ THỐNG TEMPLATE

Cho phép trường tạo template:

### Sự kiện

“Đi muộn”

### Nhận xét

“Có tiến bộ trong…”

### Tin nhắn

“Thông báo tình hình…”

### Kế hoạch hỗ trợ

“Mục tiêu 4 tuần…”

### Báo cáo

“Mẫu báo cáo chủ nhiệm…”

Điều này giúp giảm nhập liệu.

---

# 68. NOTIFICATION ENGINE

Thông báo phải có mức ưu tiên:

### INFO

Thông tin bình thường.

### REMINDER

Nhắc việc.

### WARNING

Cần chú ý.

### URGENT

Cần xử lý sớm.

Không gửi notification cho mọi sự kiện.

---

# 69. HỆ THỐNG QUY TẮC CẢNH BÁO

Admin có thể cấu hình:

```text
IF
  late_count >= 3
  AND period <= 14 days

THEN
  alert = ATTENTION
```

Hoặc:

```text
IF
  attendance_decline
  AND academic_decline

THEN
  alert = FOLLOW_UP
```

Rule engine phải cấu hình được, không hard-code.

---

# 70. KHÔNG ĐỂ CẢNH BÁO GÂY “QUÁ TẢI”

Nếu có 30 cảnh báo cùng lúc, hệ thống phải gom nhóm.

Ví dụ:

> 7 học sinh có vấn đề chuyên cần.

Click:

> Xem danh sách.

Không hiện 7 popup.

---

# 71. HỆ THỐNG “NEXT ACTION”

Mỗi cảnh báo nên có:

> **Bước tiếp theo**

Ví dụ:

- Trao đổi học sinh;
- Liên hệ phụ huynh;
- Hỏi GVBM;
- Theo dõi 1 tuần;
- Tạo kế hoạch hỗ trợ;
- Đóng cảnh báo.

Đây là điểm biến app từ “phần mềm thống kê” thành **trợ lý công việc**.

---

# 72. HỆ THỐNG “FOLLOW-UP”

Mọi vấn đề quan trọng đều có ngày xem lại.

Ví dụ:

> Liên hệ phụ huynh ngày 19/08  
> → Hẹn xem lại ngày 26/08.

Ngày 26/08 dashboard hiện:

> 🔔 Đến hạn xem lại trường hợp Nguyễn Văn A.

---

# 73. ĐÁNH GIÁ KẾT QUẢ CAN THIỆP

Không chỉ:

> Đã xử lý.

Mà:

```text
Chưa cải thiện
Có cải thiện
Cải thiện rõ
Đã ổn định
Cần hỗ trợ thêm
```

Có thể ghi chú nguyên nhân.

---

# 74. “HỒ SƠ PHÁT TRIỂN” THAY VÌ “HỒ SƠ VI PHẠM”

Timeline phải thể hiện cân bằng:

```text
Học tập
Chuyên cần
Tích cực
Hành vi
Hoạt động
Phối hợp
Can thiệp
Tiến bộ
```

Mục tiêu cuối cùng:

> nhìn thấy **quá trình phát triển của học sinh**, không chỉ lịch sử lỗi.

---

# 75. TIÊU CHÍ ACCEPTANCE CHO MVP

MVP được coi là đạt khi GVCN có thể thực hiện toàn bộ quy trình:

```text
Tạo lớp
↓
Import học sinh
↓
Điểm danh
↓
Ghi nhận sự kiện
↓
Hệ thống phát hiện chỉ báo
↓
GVCN xem hồ sơ
↓
Trao đổi học sinh
↓
Liên hệ phụ huynh
↓
Tạo kế hoạch hỗ trợ
↓
Theo dõi
↓
Ghi nhận kết quả
↓
Xuất báo cáo
```

Không cần sử dụng Excel bên ngoài cho quy trình cốt lõi.

---

# 76. USER STORY QUAN TRỌNG

## GVCN

> Là GVCN, tôi muốn biết ngay học sinh nào cần quan tâm để không bỏ sót vấn đề.

## GVCN

> Là GVCN, tôi muốn ghi nhận sự kiện trong vài giây để không mất thời gian hành chính.

## GVCN

> Là GVCN, tôi muốn xem toàn bộ diễn biến của một học sinh để hiểu vấn đề trước khi xử lý.

## GVCN

> Là GVCN, tôi muốn biết lần cuối mình đã liên hệ phụ huynh khi nào.

## GVCN

> Là GVCN, tôi muốn theo dõi một kế hoạch hỗ trợ đến khi có kết quả.

## GVBM

> Là GVBM, tôi muốn báo cho GVCN một vấn đề mà không cần nhắn tin riêng.

## Phụ huynh

> Là phụ huynh, tôi muốn biết nhà trường đang cần gia đình phối hợp điều gì.

## BGH

> Là BGH, tôi muốn biết các trường hợp nào đang cần hỗ trợ mà không phải đọc toàn bộ dữ liệu của từng lớp.

---

# 77. CÁC CHỨC NĂNG TUYỆT ĐỐI KHÔNG NÊN LÀM TRONG MVP

Không xây ngay:

- mạng xã hội học sinh;
- bảng xếp hạng giáo viên;
- bảng xếp hạng học sinh;
- game hóa;
- chatbot nói chuyện linh tinh;
- AI “chấm hạnh kiểm”;
- AI tự động kết luận nguyên nhân;
- quá nhiều biểu đồ;
- kho tài liệu khổng lồ;
- LMS thay thế hệ thống dạy học;
- thanh toán;
- quảng cáo.

---

# 78. ROADMAP SẢN PHẨM

## Giai đoạn 1

**“GVCN quản lý lớp tốt hơn.”**

Core:

- học sinh;
- điểm danh;
- sự kiện;
- timeline;
- dashboard;
- phụ huynh;
- nhiệm vụ.

---

## Giai đoạn 2

**“GVCN phát hiện và can thiệp tốt hơn.”**

Thêm:

- cảnh báo;
- xu hướng;
- kế hoạch hỗ trợ;
- phối hợp GVBM;
- follow-up;
- báo cáo.

---

## Giai đoạn 3

**“Nhà trường phối hợp giáo dục tốt hơn.”**

Thêm:

- BGH;
- nhiều lớp;
- nhiều trường;
- dashboard quản lý;
- quy trình hỗ trợ;
- API.

---

## Giai đoạn 4

**“AI trở thành trợ lý GVCN.”**

AI:

- tóm tắt;
- phân tích;
- soạn nháp;
- đề xuất câu hỏi;
- tạo báo cáo;
- phát hiện xu hướng.

Con người vẫn quyết định.

---

# 79. KIẾN TRÚC SẢN PHẨM CUỐI CÙNG

Có thể hình dung hệ thống như sau:

```text
                         ┌───────────────┐
                         │   BAN GIÁM HIỆU│
                         └───────┬───────┘
                                 │
                                 ▼
┌────────────┐          ┌──────────────────┐          ┌─────────────┐
│ GVBM       │─────────▶│                  │◀─────────│ PHỤ HUYNH   │
└────────────┘          │  NỀN TẢNG GVCN   │          └─────────────┘
                        │                  │
┌────────────┐          │                  │
│ HỌC SINH   │─────────▶│                  │
└────────────┘          └────────┬─────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  ▼              ▼              ▼
             CHUYÊN CẦN      HỌC TẬP       HÀNH VI
                  │              │              │
                  └──────────────┼──────────────┘
                                 ▼
                         ┌──────────────┐
                         │ CẢNH BÁO SỚM │
                         └──────┬───────┘
                                ▼
                       ┌────────────────┐
                       │ CAN THIỆP      │
                       └───────┬────────┘
                               ▼
                       ┌────────────────┐
                       │ THEO DÕI       │
                       └───────┬────────┘
                               ▼
                       ┌────────────────┐
                       │ ĐÁNH GIÁ       │
                       └────────────────┘
```

---

# 80. ĐỊNH NGHĨA THÀNH CÔNG CỦA SẢN PHẨM

Sản phẩm thành công không phải khi giáo viên nói:

> “App đẹp.”

Mà khi giáo viên nói:

> **“Nếu không có app này thì tôi sẽ mất rất nhiều thời gian để nhớ, ghi chép và tổng hợp những việc này.”**

Và quan trọng hơn:

> **“Tôi phát hiện được vấn đề của học sinh sớm hơn, phối hợp với phụ huynh và giáo viên bộ môn tốt hơn, đồng thời nhìn thấy sự tiến bộ của học sinh rõ hơn.”**

## Chỉ số North Star

**Số trường hợp học sinh được phát hiện → phối hợp → theo dõi → có kết quả.**

Không phải số lượng dữ liệu được nhập.

---

# 81. ƯU TIÊN PHÁT TRIỂN CUỐI CÙNG

Nếu nguồn lực hạn chế, thứ tự code phải là:

```text
P0.1  Authentication + RBAC
P0.2  School / Academic Year / Class
P0.3  Student
P0.4  Student Profile
P0.5  Attendance
P0.6  Event / Behavior
P0.7  Positive Record
P0.8  Student Timeline
P0.9  Dashboard
P0.10 Alert Engine
P0.11 Parent Contact
P0.12 Task / Follow-up
P0.13 Basic Report
P0.14 Import / Export
P0.15 Notification
P0.16 Audit Log

P1.0  Teacher collaboration
P1.1  Academic tracking
P1.2  Intervention
P1.3  Parent portal
P1.4  Class meeting
P1.5  Evidence
P1.6  Mobile/PWA

P2.0  BGH dashboard
P2.1  Multi-class
P2.2  Multi-school
P2.3  AI assistant
P2.4  External integrations
```

**Nguyên tắc kiến trúc quan trọng nhất:** ngay từ đầu phải xây theo mô hình **School → Academic Year → Class → Student**, dữ liệu sự kiện phải có **timeline**, và mọi cảnh báo phải dẫn tới **Next Action + Follow-up**. Ba thành phần này là nền móng để hệ thống mở rộng từ một công cụ GVCN thành nền tảng phối hợp giáo dục của nhà trường.