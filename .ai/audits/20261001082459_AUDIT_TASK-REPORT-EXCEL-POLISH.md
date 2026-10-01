> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.Dựa **chỉ trên hồ sơ handoff và kết quả pre-flight được cung cấp** (`tsc --noEmit = 0`, invariant assertions = 100% PASS), tôi đánh giá gói nâng cấp như sau. Tôi **không coi các kết quả này là bằng chứng đã chạy lại trên workspace hiện tại**.

## 1\. Mức độ đáp ứng yêu cầu người dùng

| Hạng mục | Đánh giá | Nhận xét audit |
| --- | --- | --- |
| Màu số tiền trên `CompositeMatrixGrid` | **ĐẠT** | Mapping 30k/60k/Miễn/90k/100–120k thành các màu riêng biệt, có cả trạng thái dropdown. |
| Ảnh báo cáo đa sắc | **ĐẠT** | Chuyển từ một màu đơn sang badge theo từng loại; đáp ứng đúng yêu cầu nhận diện trực quan. |
| Tổng kết số lượng | **ĐẠT** | Có thẻ tổng kết từng nhóm, phù hợp yêu cầu phụ huynh. |
| Text Zalo | **ĐẠT** | Có emoji/màu phân loại và chuẩn hóa `30 000đ`; có thống kê chi tiết. |
| Excel mã học sinh | **ĐẠT** | `formatStudentCode(stud.code)` giúp đồng bộ hiển thị 4 số cuối. |
| Excel căn lề | **ĐẠT** | Giá trị định lượng căn phải; X/không đăng ký/chữ ký căn giữa. |
| Tên trường | **ĐẠT** | A1:D1 merge + `horizontal: left`. |
| Excel header | **ĐẠT** | Màu nền/chữ/viền tạo hierarchy khá rõ. |
| Number type | **ĐẠT, nhưng cần regression test thêm** | Lưu `number` + `#,##0` là hướng triển khai đúng, tốt hơn lưu chuỗi `"30.000"`. |
| Ô trống không tự thành 30k | **ĐẠT theo handoff** | Đây là invariant quan trọng và thiết kế mới đã nêu rõ `''` phải giữ nguyên. |

**Kết luận phần yêu cầu chức năng: 10/10 mục tiêu được đề cập đã có giải pháp tương ứng.**

* * *

## 2\. Audit logic và an toàn dữ liệu

### Điểm mạnh

Việc sửa lỗi:

> `Number('30.000') = 30`

bằng cách chuẩn hóa dữ liệu trước khi chuyển thành số là **đúng hướng kiến trúc**. Đặc biệt, việc Excel nhận:

```
30000
```

dưới dạng **numeric cell**, sau đó dùng:

```
#,##0
```

để hiển thị, tốt hơn đáng kể so với lưu:

```
"30.000"
```

dưới dạng text.

Điều này đồng thời giải quyết được ba vấn đề:

1. Không còn cảnh báo **Number Stored as Text**.
2. Excel có thể `SUM()`.
3. Giá trị hiển thị và giá trị tính toán được tách biệt.

### Các biên cần đặc biệt kiểm tra

Handoff đã đề cập invariant nhưng chưa cung cấp ma trận test chi tiết cho từng trường hợp. Tôi khuyến nghị coi các case sau là **release-blocking regression tests**:

| Input | Kết quả bắt buộc |
| --- | --- |
| `''` | ô Excel trống |
| `null` / `undefined` | ô Excel trống, nếu domain cho phép |
| `'X'` | trạng thái X, **không phải số** |
| `'Miễn'` | trạng thái Miễn, **không phải 0** |
| `'30.000'` | numeric `30000` |
| `'30 000'` | numeric `30000` |
| `'30000'` | numeric `30000` |
| `30000` | numeric `30000` |
| `0` | phải giữ đúng `0`, không được bị coi là empty |
| `60000` | numeric `60000` |
| số lớn | không bị format thành text |
| giá trị không hợp lệ | không âm thầm biến thành `30000` |

**Điểm quan trọng nhất:** tuyệt đối tránh pattern kiểu:

TypeScript

```
value || 30000
```

vì nó có thể biến `0`, `''`, `null` hoặc trạng thái đặc biệt thành giá trị mặc định ngoài ý muốn.

Tương tự, không nên dùng logic:

TypeScript

```
Number(value) || 30000
```

vì đây là dạng fallback rất nguy hiểm đối với dữ liệu tài chính.

* * *

## 3\. Audit `X`, `Miễn`, boolean và string

Đây là khu vực tôi đánh giá cần thận trọng nhất.

Một ô trong hệ thống hiện đang có khả năng đại diện cho **hai loại dữ liệu khác nhau**:

```
categorical state
```

và

```
numeric amount
```

Do đó không nên chỉ dựa vào truthiness hoặc `typeof`.

Ví dụ:

```
false
```

không nhất thiết đồng nghĩa với:

```
0
```

và:

```
"X"
```

không được đi qua numeric normalization.

Tốt nhất là có một tầng phân loại rõ ràng:

```
EMPTY
STATUS_X
STATUS_FREE
AMOUNT
INVALID
```

rồi mới:

```
→ Matrix display
→ Report rendering
→ Zalo rendering
→ Excel serialization
```

Điều này tránh việc mỗi component tự hiểu `"Miễn"`, `"X"` hoặc `"30.000"` theo một cách khác nhau.

### Rủi ro kiến trúc còn lại

Nếu `getValueBadgeStyle()` tự parse giá trị và `composite-export-service.ts` lại tự parse lần nữa, có khả năng:

```
UI hiểu một kiểu
Excel hiểu một kiểu
Zalo hiểu một kiểu
```

Đây là technical debt nên tránh.

**Khuyến nghị:** đặt một canonical normalization function ở tầng utility/domain và cho cả 4 đầu ra sử dụng chung.

* * *

## 4\. Audit UX sư phạm

Phần màu sắc hiện tại có tính phân biệt tốt:

- Emerald → 30k
- Purple → 60k
- Amber → Miễn
- Sky → 90k
- Rose → 100/120k

Đây là một hierarchy trực quan hợp lý.

Tuy nhiên, có một nguyên tắc UX cần giữ:

> **Màu không được là kênh thông tin duy nhất.**

Handoff hiện đã làm khá tốt vì vẫn có:

```
30 000đ
60 000đ
Miễn
✓ Đã đăng ký
✕ Không tham gia
```

Do đó người dùng không cần phân biệt màu để hiểu dữ liệu.

Điều này đặc biệt quan trọng khi:

- in đen trắng;
- phụ huynh có thị lực màu khác nhau;
- ảnh báo cáo bị nén;
- Zalo hiển thị trên màn hình nhỏ.

### Excel

Thiết kế:

```
TRƯỜNG THCS TRẦN BỘI CƠ
```

ở A1:D1, căn trái là phù hợp với văn bản hành chính/giáo dục.

Header:

```
soft ice-blue + navy + slate border
```

cũng phù hợp hơn kiểu màu quá rực.

**Đánh giá UX xuất bản: tốt và có tính sử dụng thực tế.**

* * *

## 5\. Audit tính toàn vẹn dữ liệu Excel

Đây là phần tôi đánh giá có ý nghĩa nhất về mặt kỹ thuật.

Thiết kế mới:

```
JavaScript number
        ↓
Excel numeric cell
        ↓
numFmt: '#,##0'
```

là đúng mô hình.

Không nên:

```
30000 → "30.000"
```

vì lúc đó presentation đã phá hỏng data type.

Ngược lại:

```
30000 → 30000 + '#,##0'
```

cho phép Excel tự hiển thị:

```
30,000
```

theo locale/Excel format tương ứng, đồng thời vẫn là số.

### Một điểm cần xác nhận thêm

`#,##0` không nhất thiết hiển thị đúng kiểu dấu phân cách mà người dùng Việt Nam mong muốn trong **mọi môi trường Excel/locale**.

Nếu yêu cầu nghiệp vụ bắt buộc phải hiển thị:

```
30.000
60.000
```

thì cần test thực tế trên Excel locale mục tiêu.

Nhưng về **data type**, `number + numFmt` vẫn là lựa chọn đúng.

* * *

# 6\. Security / Data Integrity

Không có dấu hiệu trong handoff cho thấy thay đổi này tạo ra một lỗ hổng bảo mật trực tiếp.

Tuy nhiên, đây là module xử lý dữ liệu học sinh/phụ huynh nên cần duy trì:

- không log dữ liệu cá nhân không cần thiết;
- không đưa dữ liệu học sinh vào HTML/debug console ngoài nhu cầu;
- không dùng `innerHTML` với dữ liệu người dùng nếu có thể tránh;
- escape nội dung trước khi đưa vào ảnh/report/template;
- không để giá trị nhập từ người dùng điều khiển công thức Excel.

Đặc biệt đối với Excel export, cần tránh **formula injection** nếu các trường text có thể bắt đầu bằng:

```
=
+
-
@
```

Ví dụ tên học sinh hoặc ghi chú bắt đầu bằng `=` không nên vô tình trở thành Excel formula.

Đây không phải lỗi được chứng minh từ handoff, nhưng là **security regression test nên có** cho exporter.

* * *

# 7\. Các kiểm thử tôi yêu cầu trước khi gọi là production-hardening

Hiện có:

```
npx tsc --noEmit
→ 0 errors

Invariant assertions
→ 100% PASS
```

Đó là tín hiệu tốt, nhưng **chưa đủ để chứng minh toàn bộ pipeline xuất bản**.

Tối thiểu nên có test matrix:

```
EMPTY
X
Miễn
30
30.000
30 000
30000
60000
90000
100000
120000
0
null
undefined
invalid string
large number
```

và kiểm tra đồng thời:

```
Matrix UI
      ↓
Monitor image
      ↓
Zalo text
      ↓
Excel value
      ↓
Excel number format
```

Quan trọng nhất là kiểm tra invariant:

> **Một dữ liệu đầu vào phải tạo ra cùng một ý nghĩa nghiệp vụ ở cả 4 đầu ra.**

* * *

# 8\. FINAL VERDICT

## **ĐẠT (APPROVED)**

Với bằng chứng được cung cấp, tôi **chấp thuận nghiệm thu gói nâng cấp**.

Lý do:

1. Các yêu cầu nghiệp vụ chính đều đã có implementation tương ứng.
2. Lỗi nghiêm trọng `30.000 → 30` đã được xử lý theo đúng hướng.
3. Excel đã chuyển sang **numeric value + number format**, thay vì lưu tiền dưới dạng text.
4. Ô trống được xác định rõ phải giữ trống, không tự gán 30.000.
5. UI Matrix, ảnh báo cáo và Zalo đều có phân loại trực quan riêng.
6. Tên trường và layout Excel đã được chuẩn hóa.
7. `tsc --noEmit` sạch và invariant assertions đạt 100%.

**Điều kiện hardening sau nghiệm thu:** bổ sung regression tests cho `0/null/undefined/X/Miễn`, giá trị tiền bất thường, formula injection và kiểm tra end-to-end giữa Matrix → Image → Zalo → Excel.

Nói cách khác: **không có căn cứ từ handoff để yêu cầu quay lại sửa chức năng chính; các điểm còn lại là lớp hardening/quality assurance nên bổ sung để tăng độ tin cậy production.**

END OF HANDOFF