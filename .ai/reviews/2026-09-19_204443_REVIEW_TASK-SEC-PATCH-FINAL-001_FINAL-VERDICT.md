# BÁO CÁO NGHIỆM THU AN NINH CUỐI CÙNG TỪ CHATGPT WEB (LUNA - PORT 17841)

**Mã Task:** TASK-SEC-PATCH-FINAL-001
**Thời gian:** 2026-09-19_204443
**Bridge Endpoint:** http://127.0.0.1:17841
**Model:** chatgpt-web/luna

---

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.## PHÁN QUYẾT NGHIỆM THU AN NINH — ROUND 2

**STATUS: APPROVED WITH SECURITY ACCEPTANCE CONDITIONS**

**APPSEC SCORE: 92/100 — chưa đủ cơ sở để cấp mức ≥95/100 hoặc tuyên bố “đóng kín 100%”.**

### 1\. Ba kết luận cốt lõi

1. **Các lỗ hổng P0/P1/P2 được mô tả đã có biện pháp khắc phục đúng hướng**, đặc biệt là chuyển quyền Admin từ dữ liệu client sang kiểm tra session/server-side, fail-closed cho các webhook và loại bỏ hardcoded secret.
2. **Anti-SSRF đã được cải thiện đáng kể nhưng đoạn guard được cung cấp chưa đủ để chứng minh “chặn 100% SSRF”.** Chỉ kiểm tra `https` + hostname `script.google.com`/`script.googleusercontent.com` chưa tự nó chứng minh an toàn trước redirect hoặc các vấn đề DNS/rebinding. OWASP khuyến nghị allowlist đích tin cậy và đặc biệt lưu ý việc redirect có thể bypass validation; khi có thể, nên dựng request từ destination đã được allowlist thay vì tin toàn bộ URL đầu vào. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html?utm_source=chatgpt.com)
3. **7/7 regression PASS + `tsc --noEmit` PASS + RLS 3/3 PASS là bằng chứng tốt, nhưng chưa phải bằng chứng đủ cho nghiệm thu bảo mật cuối cùng.** RLS cần được kiểm tra đồng thời với database grants; Supabase cũng lưu ý rằng secret/service-role có thể bypass RLS và phải chỉ tồn tại ở backend. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

* * *

## 2\. Điểm còn thiếu để đạt ≥95/100

### A. Anti-SSRF — cần bổ sung trước khi gọi là “100%”

Đoạn:

TypeScript

```
const parsedUrl = new URL(gasWebhookUrl);

if (
  parsedUrl.protocol !== 'https:' ||
  (parsedUrl.hostname !== 'script.google.com' &&
   parsedUrl.hostname !== 'script.googleusercontent.com')
) {
  return ...
}
```

**Không nên được xem là bằng chứng hoàn chỉnh.**

Cần kiểm tra thêm:

- Port phải là **443**, không chỉ `https:`.
- Không cho phép `username/password` trong URL.
- Không cho phép fragment bất thường.
- Kiểm soát redirect của HTTP client; tốt nhất **không follow redirect tự động** hoặc validate lại mọi redirect.
- Không nhận URL tùy ý nếu kiến trúc không cần thiết; tốt hơn là lưu **một endpoint cấu hình server-side đã được allowlist**.
- Nếu request thực sự được server thực hiện, phải kiểm soát DNS/IP ở lớp network khi phù hợp với kiến trúc triển khai.
- Có test cho URL parser edge cases, redirect và DNS-rebinding scenarios.

OWASP khuyến nghị allowlist cho trường hợp ứng dụng chỉ cần gọi các dịch vụ đã xác định trước, đồng thời cảnh báo việc validation URL đầy đủ rất dễ bị bypass. [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html?utm_source=chatgpt.com)

**Vì vậy: Rule 5 & GS-8 = PARTIALLY VERIFIED, chưa FULLY VERIFIED.**

* * *

### B. `/api/admin/backup-zip`

Logic authorization được cung cấp là hợp lý về mặt nguyên tắc:

> session Admin/canExportData → cho phép; nếu không thì thử API authentication → nếu vẫn không → 403.

Nhưng để nghiệm thu P0, cần chứng minh thêm:

- `authenticateRequest()` không chấp nhận token giả/downgrade.
- `canExportData` thực sự được lấy từ nguồn server-side đáng tin cậy.
- endpoint không có phương thức HTTP khác bỏ qua guard.
- export không vô tình chứa secret, password hash, access token hoặc credential.
- response không expose filesystem/internal paths.
- API key có rotation/revocation.

* * *

### C. Server Actions

`assertAdminCaller()` là hướng đúng.

Đặc biệt việc:

```
sessionUser.id === targetUid
```

không được phép tự xóa tài khoản Admin là một invariant tốt.

Tuy nhiên cần verify **từng exported Server Action**, không chỉ hai function được nêu. Một action khác có thể tạo cùng privilege escalation path.

* * *

### D. Webhook authentication

Các đoạn:

TypeScript

```
if (!token || token !== expectedToken)
```

và:

TypeScript

```
if (!incomingSecret || incomingSecret !== expectedSecret)
```

đã chuyển sang fail-closed.

Nhưng nghiệm thu cuối cần xác nhận:

- secret chỉ tồn tại server-side;
- không hardcode;
- không xuất hiện trong logs;
- không trả secret qua error message;
- có replay protection nếu webhook provider yêu cầu;
- nếu provider hỗ trợ signature/HMAC thì nên xác minh signature thay vì chỉ dùng static token;
- timing-safe comparison nên được cân nhắc đối với secret authentication.

* * *

## 3\. RLS: PASS nhưng cần phân biệt đúng phạm vi

Kết quả:

> **Supabase RLS Penetration Test: FULL PASS (3/3)**

là bằng chứng tích cực.

Nhưng Supabase xác định rõ rằng security model gồm **hai lớp: grants + RLS**; chỉ có policy đúng chưa đủ nếu grants vẫn mở quá mức. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

Ngoài ra, `service_role`/secret key có quyền bypass RLS và phải chỉ được sử dụng ở backend. [Supabase+1](https://supabase.com/docs/guides/getting-started/api-keys?utm_source=chatgpt.com)

Do đó tôi chỉ ghi nhận:

**RLS penetration subset: PASS**

chứ chưa chuyển thành:

**Database security: 100% VERIFIED.**

* * *

## 4\. Self-registration

Thay đổi:

TypeScript

```
const validRoles: UserRole[] = [
  'supervisor',
  'teacher',
  'gvbm',
  'class_monitor'
];

const shouldBeActive = Boolean(existingProfile?.is_active);
```

giải quyết đúng hai vấn đề được mô tả:

- không tự đăng ký `admin`;
- không tự đăng ký `principal`;
- account mới không tự active.

Cần kiểm tra thêm rằng **mọi đường tạo user khác** cũng không cho phép client truyền:

```
role = admin
role = principal
is_active = true
```

để vòng bảo vệ này không bị bypass qua endpoint/action khác.

* * *

# 5\. Hardening headers

Các header:

```
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

là hardening hữu ích.

Nhưng đây không phải bằng chứng rằng toàn bộ security headers đã tối ưu. Đặc biệt cần xem xét **Content-Security-Policy (CSP)** nếu ứng dụng và dependency cho phép.

Ngoài ra, `X-Frame-Options: SAMEORIGIN` là một chính sách framing tương đối rộng; CSP `frame-ancestors` thường cho phép kiểm soát hiện đại và chi tiết hơn.

* * *

# 6\. Verdict cuối

| Hạng mục | Đánh giá |
| --- | --- |
| P0 Admin backup authorization | **PASS — theo bằng chứng cung cấp** |
| P0 Server Actions authorization | **PASS — theo bằng chứng cung cấp** |
| Client-trusted role removal | **PASS — theo bằng chứng cung cấp** |
| P1 classes-list fail-closed | **PASS — theo bằng chứng cung cấp** |
| Zalo webhook | **PASS — theo regression test** |
| Payment webhook | **PASS — theo regression test** |
| Dev `/api/analyze` | **PASS — theo mô tả patch** |
| Self-registration | **PASS — theo mô tả patch** |
| Security headers | **PASS — baseline hardening** |
| TypeScript | **PASS — 0 errors reported** |
| RLS penetration subset | **PASS — 3/3 reported** |
| Anti-SSRF | **PASS có điều kiện / cần bổ sung verification** |
| Toàn bộ attack surface | **CHƯA ĐỦ BẰNG CHỨNG 100%** |

### Quyết định nghiệm thu

**Không xác nhận tuyên bố “100% vulnerabilities closed” dựa trên handoff hiện tại.**

**Có thể ghi nhận bản build đã đạt trạng thái security remediation substantially complete, nhưng chưa cấp APPROVED ≥95/100 final-release verdict.**

Lý do chính không phải các P0/P1/P2 được nêu chưa xử lý, mà là **bằng chứng hiện tại chưa đủ để chứng minh toàn bộ attack surface đã được kiểm định**, đặc biệt là SSRF và các đường bypass authorization ngoài những test case đã chạy.

### Bộ kiểm thử cuối cùng cần chạy

```
1. SSRF URL-parser edge-case suite
2. Redirect/no-redirect SSRF suite
3. DNS/rebinding defense verification
4. Port enforcement verification
5. All exported Server Actions authorization sweep
6. All API routes unauthorized-method sweep
7. Webhook replay/signature verification
8. Secret leakage/log/source scan
9. Database grants + RLS matrix
10. Production build + dependency/security audit
```

Nếu 10 nhóm trên đều PASS và có artifact/test output tương ứng, khi đó mới có cơ sở nâng verdict lên **Final Security Acceptance ≥95/100**.

**Kết luận ngắn:** bản vá hiện tại **đã giải quyết tốt các lỗi được nêu**, nhưng **chưa đủ bằng chứng để xác nhận “đóng kín 100%”**. Điểm bảo thủ hiện tại: **92/100**.

END OF HANDOFF
