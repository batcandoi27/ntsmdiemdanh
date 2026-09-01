⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là bản phân tích Markdown theo góc nhìn **Senior Fullstack Architect & Security Lead**, tập trung vào nguyên nhân gốc, kiến trúc sửa lỗi và hành vi UX/security cần đạt được.

CHẨN ĐOÁN & THIẾT KẾ CƠ CHẾ FEATURE FLAGS TẠI /settings

# CHẨN ĐOÁN & THIẾT KẾ CƠ CHẾ FEATURE FLAGS TẠI `/settings`

**Task ID:** `TASK-SETTINGS-FEATURE-FLAGS-FIX-021`  
**Phạm vi:** Feature Flags / Settings / Supabase / RLS / Navigation / UX  
**Mục tiêu:** Khắc phục triệt để tình trạng các nút toggle tính năng tại `/settings` không bật/tắt được hoặc phát sinh lỗi khi lưu.

* * *

## 1\. Executive Summary

Lỗi không nằm đơn thuần ở component toggle.

Vấn đề cốt lõi là **luồng ghi dữ liệu đang đặt ở phía client và cố gắng** `**upsert**` **trực tiếp vào bảng** `**settings**` **bằng Supabase Anon client**, trong khi bảng này được bảo vệ bởi Row Level Security (RLS).

Kết quả là:

```
Browser
  │
  │ Supabase Anon Client
  ▼
settings table
  │
  └── RLS policy
       │
       └── INSERT/UPDATE bị từ chối
```

Do đó UI có thể nhận lỗi kiểu:

```
permission denied
new row violates row-level security policy
```

hoặc tương đương tùy cách Supabase/Postgres trả lỗi.

Ngoài ra, `FeatureFlagsContext` thiếu một cơ chế **Optimistic UI + rollback** hoàn chỉnh. Vì vậy ngay cả khi thao tác toggle được thực hiện trên UI, trạng thái hiển thị và trạng thái thực tế trên database có thể không đồng bộ.

Kiến trúc đúng nên chuyển quyền ghi feature flags sang **Server Action**, sử dụng `supabaseAdmin`/Service Role ở server:

```
/settings
   │
   ▼
FeatureFlagsContext
   │
   ├── Optimistic state update
   │
   ├── LocalStorage cache
   │
   ├── BroadcastChannel sync
   │
   ▼
saveFeatureFlags()
   │
   ▼
supabaseAdmin
   │
   ▼
settings
```

Navigation (`SiteHeader`, `BottomNav`) sau đó phải đọc **feature flag state tập trung**, thay vì tự duy trì các điều kiện bật/tắt riêng.

* * *

# 2\. Root Cause Analysis

## 2.1. Root Cause #1 — Client-side Anon RLS Permission Denied

### Luồng hiện tại có vấn đề

Nếu code hiện tại thực hiện tương tự:

```
const supabase = createClient(...);

await supabase
  .from("settings")
  .upsert({
    key: "feature_flags",
    value: flags,
  });
```

thì request được gửi từ browser với quyền của **Anon/authenticated client**, không phải Service Role.

Supabase RLS vẫn được áp dụng.

Việc người dùng nhìn thấy trang `/settings` **không đồng nghĩa** với việc client được phép `INSERT` hoặc `UPDATE` bảng `settings`.

Đây là hai quyền hoàn toàn khác nhau:

```
UI authorization
    ≠
Database authorization
```

### Tại sao trước đây có thể hoạt động?

Một số khả năng phổ biến:

1. RLS policy trước đây rộng hơn.
2. Logic cũ từng chạy ở server.
3. Schema/policy database đã thay đổi.
4. Client code được viết với giả định rằng authenticated user có quyền ghi settings.
5. Feature flags ban đầu chỉ được cập nhật local, sau đó mới chuyển sang persistence database.

Dù nguyên nhân lịch sử cụ thể là gì, kiến trúc **client →** `**settings**` **trực tiếp** không nên được coi là đường ghi chuẩn cho các application settings có tính chất quản trị.

* * *

# 3\. Tại sao không nên giải quyết bằng cách mở RLS?

Một cách sửa nhanh nhưng không nên chọn là tạo policy kiểu:

```
allow authenticated users to update settings
```

hoặc thậm chí:

```
allow anon users to update settings
```

Điều này có thể làm toggle "hoạt động", nhưng tạo ra lỗ hổng bảo mật nghiêm trọng.

Feature flag thường có thể ảnh hưởng đến:

- navigation;
- module được hiển thị;
- chức năng quản trị;
- hành vi ứng dụng;
- rollout tính năng;
- experimental features.

Nếu browser có quyền trực tiếp sửa bản ghi settings thì người dùng có thể bypass UI và gửi request thủ công.

**Nguyên tắc cần giữ:**

> Client được phép yêu cầu thay đổi feature flags; server mới là nơi quyết định request đó có được phép thực hiện hay không.

* * *

# 4\. Root Cause #2 — Thiếu Optimistic UI State & Rollback

Toggle UX nên phản hồi ngay lập tức.

Ví dụ:

```
OFF
 │
 │ click
 ▼
ON  ← UI phản hồi ngay
 │
 ├── save thành công → giữ ON
 │
 └── save thất bại → rollback về OFF
```

Nếu UI chỉ chờ database:

```
click
  ↓
request
  ↓
database
  ↓
response
  ↓
setState
```

thì sẽ có cảm giác:

- toggle không phản hồi;
- toggle bị delay;
- click nhiều lần gây race condition;
- UI không rõ request thành công hay thất bại.

Nghiêm trọng hơn, nếu code chỉ thay đổi UI mà không rollback khi persistence thất bại:

```
UI = ON
DB = OFF
```

thì ứng dụng rơi vào trạng thái **false confidence**: người dùng nghĩ feature đã bật nhưng reload trang lại thấy nó tắt.

* * *

# 5\. Root Cause #3 — Thiếu Server Action với Service Role

Giải pháp nên là tạo một server-side boundary rõ ràng.

Ví dụ API nội bộ:

```
saveFeatureFlags(flags)
getFeatureFlags()
```

Trong đó:

- `getFeatureFlags` đọc trạng thái canonical từ database.
- `saveFeatureFlags` xác thực request rồi ghi database.
- chỉ server mới được sử dụng `supabaseAdmin`.
- Service Role key tuyệt đối không được expose cho browser.

Kiến trúc:

```
Browser
   │
   │ saveFeatureFlags(flags)
   ▼
Server Action
   │
   ├── validate input
   ├── authenticate user/session
   ├── authorize settings access
   ├── sanitize/normalize flags
   │
   ▼
supabaseAdmin
   │
   ▼
Postgres / settings
```

* * *

# 6\. Thiết kế `getFeatureFlags`

`getFeatureFlags` là nguồn lấy **canonical state** từ database.

Pseudo-implementation:

```
"use server";

export async function getFeatureFlags() {
  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("*")
    .eq("key", "feature_flags")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load feature flags");
  }

  return normalizeFeatureFlags(data?.value);
}
```

Điểm quan trọng:

### Không trả raw database object cho client

Nên normalize:

```
database
   ↓
validation
   ↓
default values
   ↓
FeatureFlags type
   ↓
client
```

Ví dụ:

```
type FeatureFlags = {
  featureA: boolean;
  featureB: boolean;
  featureC: boolean;
};
```

Nếu database thiếu một flag:

```
undefined
```

thì server nên áp dụng default thay vì để UI xử lý một tập trạng thái không xác định.

* * *

# 7\. Thiết kế `saveFeatureFlags`

`saveFeatureFlags` phải là **single persistence boundary**.

Pseudo-implementation:

```
"use server";

export async function saveFeatureFlags(
  flags: FeatureFlags
) {
  const validatedFlags = validateFeatureFlags(flags);

  // Authenticate user
  // Authorize user to modify settings

  const { data, error } = await supabaseAdmin
    .from("settings")
    .upsert(
      {
        key: "feature_flags",
        value: validatedFlags,
      },
      {
        onConflict: "key",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error("Unable to save feature flags");
  }

  return normalizeFeatureFlags(data.value);
}
```

## Security requirement

**Không được chỉ dựa vào việc button Settings đã bị ẩn/không bị ẩn.**

Authorization phải được thực hiện server-side.

Ví dụ:

```
Request
  ↓
Session
  ↓
User identity
  ↓
Role / permission
  ↓
Allowed?
  ├── No → reject
  └── Yes
       ↓
    supabaseAdmin
```

Service Role là cơ chế bypass RLS ở server, **không phải cơ chế authorization thay thế cho authorization logic**.

Nói cách khác:

> Service Role bypasses database RLS; application vẫn phải kiểm tra người gọi có quyền thay đổi settings hay không.

* * *

# 8\. Optimistic Update trong `FeatureFlagsContext`

Context nên là nơi quản lý lifecycle của feature flags.

Trạng thái tối thiểu:

```
type FeatureFlagsState = {
  flags: FeatureFlags;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
};
```

Khi người dùng click:

```
previousFlags
      │
      ▼
optimisticFlags
      │
      ├── update Context
      ├── update localStorage
      ├── notify other tabs
      │
      ▼
saveFeatureFlags()
```

Nếu thành công:

```
serverFlags
   ↓
Context
   ↓
LocalStorage
   ↓
BroadcastChannel
```

Nếu thất bại:

```
save error
    ↓
restore previousFlags
    ↓
restore LocalStorage
    ↓
broadcast rollback
    ↓
show error
```

* * *

# 9\. Rollback phải dựa trên Previous State

Không nên rollback bằng cách đơn giản:

```
setFlag(!currentValue);
```

vì người dùng có thể click nhiều lần trong lúc request đang chạy.

Nên snapshot state trước mutation:

```
const previousFlags = flags;

setFlags(nextFlags);

try {
  const saved = await saveFeatureFlags(nextFlags);
  setFlags(saved);
} catch (error) {
  setFlags(previousFlags);
}
```

Với hệ thống có nhiều request đồng thời, nên bổ sung request/version mechanism để tránh response cũ ghi đè response mới.

Ví dụ:

```
Request #1: OFF → ON
Request #2: ON  → OFF

Response #2 arrives
Response #1 arrives later
```

Nếu không kiểm soát ordering, response #1 có thể làm state quay lại `ON` ngoài ý muốn.

Do đó nên cân nhắc:

- serialize saves;
- request ID;
- version number;
- hoặc queue/debounce persistence.

* * *

# 10\. LocalStorage Cache

LocalStorage nên được sử dụng như **cache**, không phải canonical source.

Thứ tự ưu tiên:

```
Database
   ↑
canonical state

LocalStorage
   ↑
fast cache / offline-ish UX
```

Khi app khởi động:

```
1. Read LocalStorage
2. Render nhanh với cached flags
3. Fetch getFeatureFlags()
4. Replace cache bằng server state
```

Điều này giúp giảm cảm giác "toggle bị reset" khi reload.

### Nhưng không được coi LocalStorage là authority

Người dùng có thể sửa:

```
localStorage
```

bất kỳ lúc nào.

Vì vậy:

```
LocalStorage = performance/UX mechanism
Database     = source of truth
```

* * *

# 11\. Multi-tab Synchronization

Nếu người dùng mở:

```
Tab A: /settings
Tab B: /dashboard
```

và bật một feature ở Tab A, Tab B nên nhận được thay đổi mà không cần refresh.

Giải pháp phù hợp là `BroadcastChannel`.

Ví dụ concept:

```
const channel = new BroadcastChannel("feature-flags");
```

Khi save thành công:

```
channel.postMessage({
  type: "FEATURE_FLAGS_UPDATED",
  flags: savedFlags,
});
```

Tab khác:

```
channel.onmessage = (event) => {
  if (event.data.type === "FEATURE_FLAGS_UPDATED") {
    setFlags(event.data.flags);
  }
};
```

Khi tab nhận message:

```
BroadcastChannel
      ↓
FeatureFlagsContext
      ↓
React re-render
      ↓
SiteHeader / BottomNav
      ↓
navigation cập nhật
```

Nên đóng channel khi component/context bị unmount:

```
return () => channel.close();
```

* * *

# 12\. Navigation Dynamic Filter

Feature flag chỉ thực sự hữu ích nếu các thành phần phụ thuộc vào nó cùng sử dụng một state.

## SiteHeader

Không nên hard-code:

```
const navigation = [
  ...
  {
    href: "/feature",
    enabled: true,
  }
];
```

rồi mỗi component tự có logic riêng.

Nên có navigation definition tập trung:

```
const navigationItems = [
  {
    href: "/feature",
    featureFlag: "featureA",
  },
];
```

Sau đó filter:

```
const visibleItems = navigationItems.filter(
  item =>
    !item.featureFlag ||
    flags[item.featureFlag]
);
```

* * *

# 13\. BottomNav

`BottomNav` phải dùng cùng source:

```
FeatureFlagsContext
        │
        ├── SiteHeader
        │
        └── BottomNav
```

Không nên có:

```
FeatureFlagsContext A
      ↓
SiteHeader

Local state B
      ↓
BottomNav
```

vì sẽ tạo ra tình trạng:

```
Header: feature ON
BottomNav: feature OFF
```

Kiến trúc đúng:

```
                 ┌───────────────┐
                 │ Feature Flags │
                 │    Context   │
                 └───────┬───────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        SiteHeader              BottomNav
              │                     │
              └──────────┬──────────┘
                         ▼
                 Same feature state
```

* * *

# 14\. End-to-End Flow Sau Khi Sửa

## Initial load

```
/settings
   │
   ▼
FeatureFlagsContext
   │
   ├── LocalStorage → immediate cached state
   │
   └── getFeatureFlags()
           │
           ▼
      supabaseAdmin
           │
           ▼
       settings DB
           │
           ▼
      canonical flags
           │
           ├── Context
           └── LocalStorage
```

## User toggles ON

```
User clicks toggle
        │
        ▼
previousFlags = OFF
        │
        ▼
Optimistic state = ON
        │
        ├── UI immediately shows ON
        ├── LocalStorage = ON
        └── Broadcast = ON
        │
        ▼
saveFeatureFlags(ON)
        │
        ▼
Server validation/authz
        │
        ▼
supabaseAdmin
        │
        ▼
Database = ON
        │
        ▼
return canonical state
```

## Save fails

```
User click
   ↓
UI = ON
   ↓
saveFeatureFlags()
   ↓
ERROR
   ↓
rollback
   ↓
UI = OFF
   ↓
LocalStorage = OFF
   ↓
Broadcast OFF
   ↓
Error notification
```

Đây mới là behavior nhất quán.

* * *

# 15\. Ý nghĩa của từng toggle và phạm vi ảnh hưởng

Mỗi toggle phải được hiểu là một **feature contract**, không chỉ là một boolean trong database.

Do không có danh sách tên toggle cụ thể trong yêu cầu hiện tại, không nên tự suy đoán tên hoặc chức năng của từng flag. Tuy nhiên, mỗi flag trong UI nên được document theo cấu trúc sau:

| Thuộc tính | Nội dung cần có |
| --- | --- |
| Name | Tên tính năng |
| Key | Key duy nhất trong `FeatureFlags` |
| Description | Tính năng làm gì |
| ON | Hành vi khi bật |
| OFF | Hành vi khi tắt |
| Scope | Màn hình/module nào bị ảnh hưởng |
| Navigation | Có thêm/xóa menu không |
| Persistence | Lưu vào DB hay chỉ local |
| Security | Có cần authorization đặc biệt không |
| Default | Giá trị mặc định |

Ví dụ format:

```
Feature: [Tên tính năng]

OFF:
- Tính năng không được render/không khả dụng.
- Navigation liên quan bị ẩn nếu có.

ON:
- Tính năng được render.
- Navigation liên quan xuất hiện nếu có.

Scope:
- Chỉ ảnh hưởng [module/page/component].

Không ảnh hưởng:
- Các module không phụ thuộc vào feature flag này.
```

### Quan trọng

Ẩn menu **không phải security boundary**.

Ví dụ:

```
featureA = false
```

thì việc không hiển thị:

```
/feature-a
```

chỉ là UX/navigation behavior.

Nếu `/feature-a` cần được bảo vệ, route/server/API tương ứng vẫn phải thực hiện authorization độc lập.

* * *

# 16\. Data Model Recommendation

Nếu bảng `settings` đang lưu settings dạng key/value, có thể giữ pattern:

```
settings
--------------------------------
key             feature_flags
value           {...JSON...}
```

Ví dụ:

```
{
  "featureA": true,
  "featureB": false,
  "featureC": true
}
```

Cần đảm bảo `key` có unique constraint nếu sử dụng:

```
upsert(..., { onConflict: "key" })
```

Đồng thời schema/type nên thống nhất giữa:

```
Database JSON
     ↓
Server validation
     ↓
TypeScript FeatureFlags
     ↓
React Context
     ↓
Navigation
```

Tránh tình trạng mỗi layer dùng một tên khác nhau cho cùng một flag.

* * *

# 17\. Error Handling

UI không nên nuốt lỗi:

```
catch {
  // nothing
}
```

Người dùng cần biết save có thành công hay không.

Nên có:

```
Saving...
```

sau đó:

```
Saved
```

hoặc:

```
Unable to save setting. Reverted to previous value.
```

Trong production, không nên hiển thị raw database error cho người dùng nếu error chứa thông tin nội bộ.

Nên:

```
Internal error
      ↓
server logs detailed cause

User
      ↓
safe human-readable message
```

* * *

# 18\. Loading và Hydration

LocalStorage chỉ tồn tại trên browser.

Vì vậy cần tránh để server render một state khác hoàn toàn với client state rồi gây hydration mismatch.

Pattern an toàn:

```
Server default
      ↓
Client hydration
      ↓
LocalStorage
      ↓
Server revalidation
```

Đặc biệt với navigation, cần quyết định rõ behavior trong khoảng thời gian:

```
hydrating → fetching canonical flags
```

Có thể:

- dùng default-safe state;
- hoặc render navigation sau khi flags đã được hydrate.

Lựa chọn phụ thuộc vào yêu cầu UX và tính chất của từng feature.

* * *

# 19\. Security Checklist

## Server

- `supabaseAdmin` chỉ tồn tại server-side.
- Service Role key không được gửi xuống browser.
- Authenticate session.
- Authorize người dùng có quyền thay đổi settings.
- Validate feature flag payload.
- Chỉ cho phép các key nằm trong allow-list.
- Không cho client ghi tùy ý vào settings khác.

## Client

- Không `upsert` trực tiếp `settings`.
- Không chứa Service Role key.
- Optimistic update.
- Rollback khi save thất bại.
- LocalStorage chỉ là cache.
- BroadcastChannel chỉ là synchronization mechanism.

## Navigation

- SiteHeader sử dụng centralized flags.
- BottomNav sử dụng centralized flags.
- Navigation visibility không được coi là authorization.
- Route/API vẫn phải kiểm tra quyền nếu cần.

* * *

# 20\. Testing Strategy

## Unit tests

Test `FeatureFlagsContext`:

```
initial flags
optimistic ON
optimistic OFF
save success
save failure
rollback
multiple updates
localStorage hydration
broadcast update
```

## Server Action tests

```
getFeatureFlags()
saveFeatureFlags()
invalid payload
unknown feature key
unauthenticated user
unauthorized user
database failure
successful upsert
```

## Integration tests

### Scenario A — Successful toggle

```
Open /settings
→ Toggle OFF → ON
→ UI immediately becomes ON
→ DB becomes ON
→ Reload
→ remains ON
```

### Scenario B — Database failure

```
Toggle OFF → ON
→ UI immediately becomes ON
→ save fails
→ UI rolls back OFF
→ error appears
```

### Scenario C — Multi-tab

```
Tab A: /settings
Tab B: application

A toggles feature ON
→ B receives BroadcastChannel event
→ B updates navigation
```

### Scenario D — Direct URL

```
Feature flag OFF
→ navigation hides feature
→ user manually enters feature URL
→ authorization/route policy still applies
```

* * *

# 21\. Acceptance Criteria

Feature flag implementation chỉ được coi là hoàn tất khi thỏa mãn:

### Persistence

- Toggle thay đổi được.
- Database được cập nhật thành công.
- Reload vẫn giữ đúng state.

### UX

- Toggle phản hồi tức thì.
- Có trạng thái saving nếu cần.
- Save failure rollback chính xác.
- Có error feedback.

### Synchronization

- LocalStorage phản ánh state mới.
- Các tab khác nhận thay đổi.
- Không có stale navigation sau khi flag thay đổi.

### Architecture

- Không còn client-side direct write vào `settings`.
- `saveFeatureFlags` là write boundary.
- `getFeatureFlags` là read boundary.
- Server sử dụng `supabaseAdmin`.

### Security

- Service Role không leak.
- Server xác thực và authorize.
- Client không thể tự ý ghi settings bằng Anon API.
- Navigation hiding không được dùng thay cho authorization.

* * *

# 22\. Kiến trúc mục tiêu

```
                         ┌─────────────────────┐
                         │      /settings      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ FeatureFlagsContext │
                         └──────────┬──────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          LocalStorage       BroadcastChannel    Optimistic UI
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  saveFeatureFlags   │
                         │    Server Action    │
                         └──────────┬──────────┘
                                    │
                           Auth + Authorization
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    supabaseAdmin    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   settings table    │
                         │   PostgreSQL + RLS   │
                         └─────────────────────┘

                                    ▲
                                    │
                         ┌──────────┴──────────┐
                         │  getFeatureFlags    │
                         │    Server Action    │
                         └─────────────────────┘


               FeatureFlagsContext
                       │
              ┌────────┴────────┐
              ▼                 ▼
         SiteHeader          BottomNav
              │                 │
              └────────┬────────┘
                       ▼
              Dynamic Navigation
```

* * *

# 23\. Kết luận

Nguyên nhân chính của hiện tượng toggle không hoạt động không phải chỉ là lỗi React state. Đây là vấn đề **kiến trúc persistence + authorization + state synchronization**.

Ba thay đổi quan trọng nhất là:

### 1\. Bỏ client-side direct write

Không để:

```
Browser → Anon Supabase → settings
```

làm đường ghi chính.

### 2\. Đưa persistence về Server Action

Chuẩn hóa:

```
Client
  ↓
saveFeatureFlags()
  ↓
auth + authorization + validation
  ↓
supabaseAdmin
  ↓
settings
```

### 3\. Xây lại state lifecycle

```
Optimistic UI
      +
Rollback
      +
LocalStorage cache
      +
BroadcastChannel
      +
Centralized Context
```

Sau đó:

```
FeatureFlagsContext
        ↓
SiteHeader
        +
BottomNav
```

đảm bảo toàn bộ UI nhìn thấy **cùng một feature-flag state**.

Về mặt security, **không nên mở rộng RLS chỉ để làm cho toggle chạy được**. RLS vẫn nên bảo vệ database; server-side application boundary mới là nơi thực hiện authorization và sử dụng Service Role khi cần bypass RLS cho thao tác quản trị.

Kết quả mong muốn cuối cùng là:

```
Click toggle
    ↓
UI đổi ngay
    ↓
Server lưu an toàn
    ↓
Success → state được xác nhận
Failure → rollback
    ↓
Các tab đồng bộ
    ↓
Header + BottomNav cập nhật
    ↓
Reload vẫn giữ đúng trạng thái
```

Đây là kiến trúc ổn định hơn, có khả năng mở rộng thêm feature flags về sau và quan trọng nhất là **tách đúng trách nhiệm giữa UI state, persistence, synchronization và security**.