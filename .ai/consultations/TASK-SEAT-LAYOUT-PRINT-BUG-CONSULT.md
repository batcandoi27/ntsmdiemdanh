⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.## Kết luận kiến trúc

Với đoạn code hiện tại, **nguyên nhân có xác suất cao nhất không phải `height: 202mm` tự nó sai**, mà là kiến trúc print đang tạo ra một **document có nhiều nguồn kích thước/layout cùng lúc**:

1. `@page` nói trang giấy là **A4 landscape = 297 × 210 mm**.
2. `html, body` lại bị ép thành `297 × 210 mm`.
3. `#print-document-root` bị ép thành `289 × 202 mm`.
4. Root lại có `padding: 3mm 4mm`.
5. Quan trọng nhất: bạn copy **toàn bộ `<style>` và stylesheet của ứng dụng Next.js vào iframe**, sau đó chỉ override một phần CSS.
6. Các descendant trong `printContent.innerHTML` vẫn có thể mang theo `min-height`, `height`, `margin`, `position`, `transform`, `grid/flex`, pseudo-elements hoặc các rule responsive/global khác.

Chromium không coi `overflow:hidden` của một element như một mệnh lệnh rằng **document chỉ có đúng một page**. Print engine vẫn phải paginate *document/fragmentation context*. CSS paged media được thiết kế chính xác để chia nội dung thành các page; `break-inside: avoid` chỉ ngăn break tại những vị trí phù hợp, chứ không biến một document thành một page tuyệt đối. [MDN Web Docs+1](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/break-inside?utm_source=chatgpt.com)

### Vì sao lại thành 3 trang trắng?

Một tình huống rất dễ xảy ra với kiến trúc này là:

```
@page
└── physical page = 297 × 210 mm

body
└── 297 × 210 mm
    └── #print-document-root
        └── 289 × 202 mm
            └── copied application DOM
                ├── element A
                ├── element B
                ├── ...
                └── hidden/positioned/global-layout descendants
```

Chromium paginate dựa trên **used layout geometry**, không đơn giản dựa trên `offsetHeight` của `#print-document-root`.

Nếu một descendant hoặc ancestor tạo ra overflow/fragmentation context, hoặc stylesheet được copy có rule ảnh hưởng đến layout, document có thể được xem là dài hơn một page. Phần overflow đó có thể không có visible content sau khi bị `overflow:hidden`, nhưng **page boxes vẫn được tạo** → kết quả là page 2/3 trắng.

Đặc biệt, dòng này là một điểm kiến trúc yếu:

TypeScript

```
document.querySelectorAll('style, link[rel="stylesheet"]')
```

Bạn đang đưa **CSS của cả application vào print document**. Vì vậy `#print-document-root` không thực sự là một standalone print document.

`break-after`/`break-inside` cũng không phải cơ chế "khóa document thành 1 page"; theo CSS fragmentation, các break được quyết định dựa trên `break-before`, `break-after`, `break-inside` và kích thước fragmentation context. [MDN Web Docs+1](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/break-inside?utm_source=chatgpt.com)

* * *

# 1\. Không nên tiếp tục sửa iframe hiện tại bằng thêm CSS

Tôi **không khuyến nghị** tiếp tục kiểu:

TypeScript

```
height: 202mm;
max-height: 202mm;
overflow: hidden;
page-break-after: avoid;
break-after: avoid;
```

rồi thử thêm `!important`.

Đó là chữa triệu chứng.

Đặc biệt, đây không phải guarantee:

CSS

```
#print-document-root {
  height: 202mm;
  overflow: hidden;
  break-inside: avoid;
}
```

`break-inside: avoid` chỉ yêu cầu tránh fragmentation bên trong generated box; nó không biến toàn bộ browser print pipeline thành một canvas 1-page cố định. [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/break-inside?utm_source=chatgpt.com)

* * *

# 2\. Kiến trúc Production tôi khuyến nghị

## `SeatLayoutPrintDocument` → standalone print surface → `window.print()`

Tách **presentation để xem preview** khỏi **document để in**.

Kiến trúc:

```
SeatLayout
   │
   ├── Screen Preview
   │      └── Modal
   │
   └── Print Model
          │
          ▼
     PrintDocument
          │
          ├── own HTML structure
          ├── own CSS
          ├── own fonts
          └── exactly one .print-page
                    │
                    ▼
               Chrome Print
```

**Không copy toàn bộ CSS của application.**

Thay vào đó:

- chỉ render những element cần in;
- chỉ import CSS dành riêng cho print;
- reset toàn bộ margin/padding/height/min-height;
- định nghĩa duy nhất một `@page`;
- root print page có kích thước tương ứng vùng printable;
- không cho application layout tham gia vào print layout.

Đây cũng phù hợp với mô hình CSS chính thống: `@media print` dành cho presentation khi in, còn `@page` kiểm soát page dimensions/orientation. [MDN Web Docs+1](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing?utm_source=chatgpt.com)

* * *

# 3\. Nếu vẫn muốn dùng iframe: hãy biến iframe thành document thực sự độc lập

Iframe **không phải vấn đề chính**.

Iframe có thể dùng được, nhưng hiện tại bạn đang dùng nó như:

> "copy toàn bộ application vào một iframe rồi hy vọng print CSS thắng."

Hãy đổi thành:

> "iframe chứa một print document độc lập."

Quan trọng:

### Không làm

TypeScript

```
let styleTags = '';

document.querySelectorAll('style, link[rel="stylesheet"]')
  .forEach(...)
```

### Làm

TypeScript

```
const printCss = `
  @page {
    size: A4 landscape;
    margin: 0;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 297mm;
    height: 210mm;
    overflow: hidden;
  }

  .print-page {
    width: 297mm;
    height: 210mm;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
  }
`;
```

Sau đó HTML bên trong iframe **chỉ chứa print component**.

* * *

# 4\. Đừng dùng `height: 202mm` để suy ra page size

Đây cũng là một điểm nên sửa.

Bạn đang có:

CSS

```
@page {
  size: A4 landscape;
  margin: 4mm;
}
```

nhưng lại:

CSS

```
html,
body {
  width: 297mm;
  height: 210mm;
}

#print-document-root {
  width: 289mm;
  height: 202mm;
  padding: 3mm 4mm;
}
```

Có hai khái niệm khác nhau:

```
Physical page
297 × 210 mm
┌──────────────────────────────┐
│                              │
│      printable content      │
│                              │
└──────────────────────────────┘
```

và:

```
@page margin
```

Nếu bạn muốn content cách mép 4 mm, hãy để:

CSS

```
@page {
  size: A4 landscape;
  margin: 4mm;
}
```

rồi content nên dùng:

CSS

```
.print-page {
  width: 100%;
  height: 100%;
}
```

**hoặc** chọn:

CSS

```
@page {
  size: A4 landscape;
  margin: 0;
}

.print-page {
  width: 297mm;
  height: 210mm;
  padding: 4mm;
}
```

Đừng đồng thời mô hình hóa physical page và printable page bằng nhiều `width/height/max-width/max-height` khác nhau.

`@page size: A4 landscape` chính là cơ chế chuẩn để định nghĩa page box. [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40page/size?utm_source=chatgpt.com)

* * *

# 5\. CSS print baseline tôi sẽ dùng

CSS

```
@page {
  size: A4 landscape;
  margin: 0;
}

html,
body {
  margin: 0 !important;
  padding: 0 !important;
  width: 297mm !important;
  height: 210mm !important;
  min-width: 297mm !important;
  min-height: 210mm !important;
  max-width: 297mm !important;
  max-height: 210mm !important;
  overflow: hidden !important;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

.print-page {
  width: 297mm;
  height: 210mm;

  margin: 0;
  padding: 4mm;

  overflow: hidden;

  break-before: auto;
  break-after: avoid;
  break-inside: avoid;

  page-break-before: auto;
  page-break-after: avoid;
  page-break-inside: avoid;

  background: #fff;

  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

@media print {
  body {
    overflow: hidden !important;
  }

  .print-page {
    break-inside: avoid-page;
  }
}
```

`break-inside: avoid-page` là semantic rõ ràng hơn `avoid` cho trường hợp này. `page-break-inside` có thể giữ làm compatibility alias, nhưng CSS hiện đại ưu tiên `break-inside`. [MDN Web Docs+1](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/break-inside?utm_source=chatgpt.com)

* * *

# 6\. Cực kỳ quan trọng: reset các layout constraint của application

Trong print document, tôi sẽ đặc biệt tìm và loại bỏ:

CSS

```
min-height: 100vh;
height: 100vh;
min-h-screen;
h-screen;
w-screen;
overflow-y-auto;
overflow-x-auto;
position: fixed;
position: sticky;
transform: ...;
```

và các container kiểu:

CSS

```
flex: 1;
flex-grow: 1;
grid-template-rows: 1fr;
```

nếu chúng được kế thừa/copy từ application.

Ví dụ Tailwind:

```
min-h-screen
h-screen
max-h-screen
overflow-auto
overflow-y-auto
flex-1
```

rất dễ làm print DOM có geometry khác screen preview.

**Screen preview đúng không chứng minh print geometry đúng.**

Screen:

```
Modal
└── fixed visual viewport
    └── scaled A4
```

Print:

```
Paged Media
└── page box
    └── fragmentation
        └── CSS used dimensions
```

Hai layout engine context này không giống nhau.

* * *

# 7\. Font cũng phải được kiểm soát

Nếu typography phải giống 100% preview, standalone print document phải load font của nó.

Ví dụ:

HTML

```
<style>
@font-face {
  font-family: "YourFont";
  src: url("/fonts/your-font.woff2") format("woff2");
  font-display: block;
}

body {
  font-family: "YourFont", sans-serif;
}
</style>
```

Và chỉ gọi:

TypeScript

```
print()
```

sau khi font đã sẵn sàng.

Trong browser:

TypeScript

```
await iframe.contentDocument?.fonts.ready;
```

thay vì cố định:

TypeScript

```
setTimeout(..., 250);
```

`250ms` không phải synchronization mechanism.

* * *

# 8\. Images cũng phải ready

Tương tự với logo/chữ ký/hình ảnh:

TypeScript

```
await Promise.all(
  Array.from(doc.images).map((img) => {
    if (img.complete) return Promise.resolve();

    return new Promise<void>((resolve) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => resolve(), { once: true });
    });
  })
);
```

Sau đó:

TypeScript

```
await doc.fonts.ready;
```

rồi mới:

TypeScript

```
iframe.contentWindow?.print();
```

Điều này loại bỏ một class lỗi khác: print layout được paginate **trước khi font/image cuối cùng thay đổi geometry**.

* * *

# 9\. Tôi cũng sẽ bỏ `setTimeout(250)`

Thay bằng một lifecycle rõ ràng:

TypeScript

```
doc.open();
doc.write(html);
doc.close();

await waitForPrintAssets(doc);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  });
});
```

Hai `requestAnimationFrame` ở đây không phải guarantee về mặt typography, nhưng giúp browser hoàn tất layout/paint cycle sau khi resources đã ready.

Quan trọng nhất vẫn là:

TypeScript

```
await doc.fonts.ready;
await imagesReady;
```

chứ không phải delay bao nhiêu milliseconds.

* * *

# 10\. Có nên dùng `window.print()` trực tiếp trên DOM hiện tại?

**Có — đây thực ra là phương án tôi ưu tiên hơn iframe nếu print component đã được kiến trúc sạch.**

Ví dụ:

TypeScript

```
@media print {
  body > * {
    display: none !important;
  }

  #seat-layout-print-root {
    display: block !important;
  }
}
```

và:

TypeScript

```
const handlePrint = async () => {
  await document.fonts.ready;
  window.print();
};
```

Architecture:

```
<body>
  <App />

  <div id="seat-layout-print-root">
     <SeatLayoutPrintDocument />
  </div>
</body>
```

Screen:

CSS

```
#seat-layout-print-root {
  display: none;
}
```

Print:

CSS

```
@media print {
  body > * {
    display: none !important;
  }

  #seat-layout-print-root {
    display: block !important;
  }
}
```

Đây là cách **đơn giản và native nhất**.

MDN cũng mô tả chính pattern này: dùng `@media print` để ẩn header/nav/UI và chỉ giữ content muốn in, kết hợp `@page` để kiểm soát kích thước/orientation. [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing?utm_source=chatgpt.com)

* * *

# 11\. Nhưng với yêu cầu "clean standalone" của bạn, tôi chọn iframe/new print document

Nếu seat diagram là một module đặc biệt cần:

- không bị CSS Next.js ảnh hưởng;
- typography deterministic;
- màu chính xác;
- layout A4 fixed;
- không phụ thuộc modal;
- không phụ thuộc Tailwind layout;
- sau này có thể test print regression;

thì tôi chọn:

```
React component
      ↓
serialize/render PRINT-ONLY component
      ↓
standalone print document
      ↓
own CSS
      ↓
own fonts
      ↓
wait resources
      ↓
window.print()
```

Không:

```
current DOM
   ↓
copy all CSS
   ↓
iframe 0×0 hidden
   ↓
override some CSS
   ↓
hope Chrome pagination behaves
```

* * *

# 12\. Về `iframe width: 0; height: 0; visibility:hidden`

Đây **không phải thủ phạm duy nhất có thể kết luận từ code**, nhưng tôi sẽ loại bỏ nó trong production.

Đừng để print browsing context ở:

CSS

```
width: 0;
height: 0;
visibility: hidden;
```

Một print document nên có một layout viewport hợp lý.

Có thể dùng:

CSS

```
position: fixed;
left: -10000px;
top: 0;
width: 297mm;
height: 210mm;
border: 0;
```

thay vì:

CSS

```
width: 0;
height: 0;
visibility: hidden;
```

Ví dụ:

TypeScript

```
iframe.style.position = "fixed";
iframe.style.left = "-10000px";
iframe.style.top = "0";
iframe.style.width = "297mm";
iframe.style.height = "210mm";
iframe.style.border = "0";
```

Điều này làm cho print browsing context có geometry tương ứng với document thực.

**Không cần `visibility:hidden`.**

* * *

# 13\. Một nuance quan trọng về "100% guarantee"

Không có CSS/JavaScript nào có thể guarantee **100% một PDF luôn chỉ có một page** trong mọi phiên bản Chromium + mọi printer settings + mọi user scaling.

Chrome Print Preview vẫn có các user-controlled settings như:

- paper;
- margins;
- scale;
- headers/footers;
- destination/printer behavior.

Do đó có hai mức guarantee khác nhau:

### Browser-level guarantee

Ứng dụng tạo ra một document có:

```
1 × A4 landscape page
```

với content không overflow.

→ Có thể đạt rất cao.

### PDF-byte-level guarantee

Ứng dụng bắt buộc output PDF **luôn đúng 1 page bất kể user thay đổi Print Preview settings**.

→ Browser `window.print()` không phải cơ chế để guarantee tuyệt đối.

Nếu requirement thật sự là:

> "Backend phải xuất ra PDF chắc chắn exactly 1 page"

thì nên dùng **PDF generation server-side** (ví dụ Chromium/Puppeteer hoặc thư viện PDF) thay vì phụ thuộc vào UI Print Preview.

* * *

# 14\. Recommendation cuối cùng

Tôi xếp các phương án như sau:

| Phương án | Production | Cô lập CSS | Khả năng kiểm soát |
| --- | --- | --- | --- |
| Copy toàn bộ CSS vào iframe hiện tại | ❌ | ❌ | ❌ |
| iframe 0×0 + override CSS | ⚠️ | ⚠️ | ⚠️ |
| `@media print` trên DOM hiện tại | ✅ | ⚠️ | ✅ |
| **Standalone print document/iframe** | **✅✅** | **✅✅** | **✅✅** |
| Server-side PDF generation | **✅✅** | **✅✅** | **✅✅** |

### Vì vậy, với code hiện tại tôi sẽ làm 4 thay đổi kiến trúc:

**1\. Không copy:**

TypeScript

```
document.querySelectorAll('style, link[rel="stylesheet"]')
```

**2\. Tạo `SeatLayoutPrintDocument` riêng**, chỉ chứa DOM cần in.

**3\. Standalone print CSS:**

CSS

```
@page {
  size: A4 landscape;
  margin: 0;
}

.print-page {
  width: 297mm;
  height: 210mm;
  padding: 4mm;
  overflow: hidden;
  break-inside: avoid-page;
}
```

**4\. Chỉ gọi print sau khi resources ready:**

TypeScript

```
await doc.fonts.ready;
await imagesReady;
iframe.contentWindow?.print();
```

* * *

## Chẩn đoán ngắn gọn nhất

**Trang 2 và 3 trắng không phải vì Chrome "không hiểu" `height: 202mm`.** Vấn đề là bạn đang cố biến một DOM mang theo **application CSS/layout context** thành một physical page bằng `height + overflow:hidden`. Print engine paginate theo **used layout + CSS fragmentation**, nên các geometry ngoài ý muốn vẫn có thể tạo thêm page boxes. `break-inside: avoid` chỉ kiểm soát break, không phải page-count lock. [MDN Web Docs+1](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/break-inside?utm_source=chatgpt.com)

`@page { size: A4 landscape }` mới là nguồn sự thật cho physical page; print component phải là một **document/layout context độc lập**, thay vì clone CSS của Next.js. [MDN Web Docs+1](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40page?utm_source=chatgpt.com)

**Nếu đây là codebase tôi chịu trách nhiệm production, tôi sẽ bỏ hẳn chiến lược `copy all styles → iframe 0×0 → print` và chuyển sang `PrintDocument` standalone với CSS/font/resource lifecycle riêng.** Đây là thay đổi kiến trúc, không phải thêm một vài `!important` để chữa blank pages.