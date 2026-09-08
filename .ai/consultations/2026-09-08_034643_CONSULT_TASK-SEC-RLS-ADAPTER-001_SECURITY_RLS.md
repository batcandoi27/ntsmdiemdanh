---
task_id: TASK-SEC-RLS-ADAPTER-001
topic: Refactor SupabaseAdapter & Next.js: Xóa bỏ rò rỉ SUPABASE_SERVICE_ROLE_KEY và Bypass RLS, Chuẩn Hóa Kiến Trúc Least Privilege
consultant: ChatGPT Web (Principal Macro Architect)
bridge_endpoint: http://127.0.0.1:17841/v1/responses
created_at: 2026-09-07T20:46:43.178Z
elapsed_seconds: 47.4
---

⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là kiến trúc tôi khuyến nghị. Điểm quan trọng nhất: **không sửa lỗi `profiles` bằng `service_role`**. Hãy sửa mô hình quyền ở PostgreSQL, rồi để mọi CRUD thông thường đi qua client Supabase với RLS.

Supabase xác nhận rằng `service_role`/secret key bypass RLS và phải được giữ hoàn toàn ở backend; đồng thời **GRANT và RLS là hai lớp khác nhau**, nên chỉ viết policy mà không thu hẹp GRANT vẫn có thể để lộ quyền không mong muốn. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

## 1\. Kiến trúc mục tiêu

```
Browser
  │
  │ publishable/anon key + user's JWT
  ▼
Supabase Data API
  │
  ├── GRANT: chỉ các operation cần thiết
  │
  └── RLS: kiểm tra từng row
          │
          ├── classes
          ├── teacher_classes
          └── profiles / teacher directory
```

Không còn đường đi:

```
Client Component
   ↓
db.ts
   ↓
supabase-adapter.ts
   ↓
supabase-admin.ts
   ↓
SERVICE_ROLE / SECRET
```

Thay vào đó:

```
Client Component
   ↓
db.ts
   ↓
supabase-adapter.ts
   ↓
browser/SSR Supabase client
   ↓
RLS
```

Còn administrative operation là một dependency hoàn toàn khác:

```
Server Action / Route Handler
   ↓
server-only module
   ↓
supabase-admin.ts
   ↓
SECRET KEY
   ↓
Supabase
```

Supabase cũng khuyến nghị SSR client sử dụng cookie/session riêng, trong khi client dùng secret key phải là một client server-side tách biệt. [Supabase+1](https://supabase.com/docs/guides/auth/server-side/creating-a-client?utm_source=chatgpt.com)

* * *

# 2\. Một điểm quan trọng về `profiles`

**RLS không phải cơ chế bảo vệ từng column.**

Ví dụ:

SQL

```
USING (true)
```

trên `profiles` nghĩa là row đó được đọc. Nó **không** có nghĩa là chỉ `full_name` được đọc.

Nếu `profiles` chứa:

```
id
full_name
role
phone
citizen_id
email
address
...
```

thì policy:

SQL

```
create policy ...
on profiles for select
using (true);
```

không đủ để bảo vệ `phone`, `citizen_id`, v.v.

Supabase có hỗ trợ column-level privileges, nhưng tài liệu cũng khuyến nghị kiến trúc tách dữ liệu public/private khi có thể. [Supabase](https://supabase.com/docs/guides/database/postgres/column-level-security?utm_source=chatgpt.com)

### Kiến trúc tốt nhất

Tôi khuyến nghị:

```
profiles
├── id
├── full_name
├── role
├── phone              ← private
├── citizen_id         ← private
├── email              ← private
└── ...
```

và tạo bảng public riêng:

```
teacher_directory
├── teacher_id
├── full_name
└── role
```

Hoặc, nếu chưa thể migration schema ngay, dùng **column-level GRANT** cho `profiles`.

Đối với hệ thống trường học, tôi ưu tiên bảng `teacher_directory` vì nó làm boundary bảo mật rõ ràng hơn.

* * *

# 3\. SQL migration — phương án khuyến nghị

Giả sử:

- `classes.id` là ID lớp.
- `teacher_classes.class_id` → `classes.id`.
- `teacher_classes.teacher_id` → `profiles.id`.
- `teacher_classes.is_homeroom` xác định GVCN.
- Việc xem tên GVCN là dữ liệu công khai trong phạm vi ứng dụng.

Migration có thể là:

SQL

```
-- supabase/migrations/20260908_least_privilege_rls.sql

begin;

----------------------------------------------------------------
-- 1. Enable RLS
----------------------------------------------------------------

alter table public.classes enable row level security;
alter table public.teacher_classes enable row level security;
alter table public.profiles enable row level security;

----------------------------------------------------------------
-- 2. Remove broad/default grants
----------------------------------------------------------------

revoke all on table public.classes from anon, authenticated;
revoke all on table public.teacher_classes from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;

----------------------------------------------------------------
-- 3. PUBLIC TEACHER DIRECTORY
--
-- Preferred architecture:
-- expose only the fields that are intentionally public.
----------------------------------------------------------------

create table if not exists public.teacher_directory (
  teacher_id uuid primary key
    references public.profiles(id) on delete cascade,

  full_name text not null,
  role text not null
);

alter table public.teacher_directory enable row level security;

revoke all on table public.teacher_directory from anon, authenticated;

grant select on table public.teacher_directory to anon, authenticated;

drop policy if exists "teacher_directory_read_public"
  on public.teacher_directory;

create policy "teacher_directory_read_public"
on public.teacher_directory
for select
to anon, authenticated
using (true);

----------------------------------------------------------------
-- 4. classes
--
-- Only use USING (true) if class metadata itself is intentionally
-- public to unauthenticated users.
----------------------------------------------------------------

grant select on table public.classes to anon, authenticated;

drop policy if exists "classes_read_public"
  on public.classes;

create policy "classes_read_public"
on public.classes
for select
to anon, authenticated
using (true);

----------------------------------------------------------------
-- 5. teacher_classes
--
-- Only expose relationship metadata required by the attendance UI.
----------------------------------------------------------------

grant select on table public.teacher_classes to anon, authenticated;

drop policy if exists "teacher_classes_read_public"
  on public.teacher_classes;

create policy "teacher_classes_read_public"
on public.teacher_classes
for select
to anon, authenticated
using (true);

----------------------------------------------------------------
-- 6. profiles
--
-- Keep profiles PRIVATE.
-- No SELECT grant to anon/authenticated.
--
-- Existing application code that needs public teacher information
-- should use teacher_directory instead.
----------------------------------------------------------------

-- No public SELECT grant here intentionally.

commit;
```

### Nhưng có một vấn đề

`teacher_directory` phải được đồng bộ với `profiles`.

Nếu hiện tại bạn chưa muốn thêm bảng mới, có thể dùng **column-level privileges** trên `profiles`:

SQL

```
begin;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;

grant select (id, full_name, role)
on table public.profiles
to anon, authenticated;

drop policy if exists "profiles_public_directory_read"
on public.profiles;

create policy "profiles_public_directory_read"
on public.profiles
for select
to anon, authenticated
using (
  role = 'teacher'
);

commit;
```

Khi đó:

TypeScript

```
supabase
  .from('profiles')
  .select('id, full_name, role')
```

được phép, còn:

TypeScript

```
supabase
  .from('profiles')
  .select('citizen_id')
```

sẽ bị PostgreSQL chặn.

**Không dùng `select('*')`** với column-level privileges. Supabase cũng ghi rõ rằng khi dùng restricted columns, wildcard không được sử dụng. [Supabase](https://supabase.com/docs/guides/database/postgres/column-level-security?utm_source=chatgpt.com)

Tuy nhiên, tôi vẫn chọn `teacher_directory` là thiết kế dài hạn.

* * *

# 4\. RLS cho ghi/xóa phải hoàn toàn khác SELECT

Đừng làm:

SQL

```
create policy "authenticated_can_update"
on public.classes
for update
to authenticated
using (true);
```

Đây chính là kiểu policy biến RLS thành hình thức.

Thay vào đó, authorization phải dựa trên user:

SQL

```
create policy "teacher_can_update_own_data"
on public.some_table
for update
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);
```

Hoặc nếu quyền phụ thuộc role:

SQL

```
using (
  exists (
    select 1
    from public.teacher_classes tc
    where tc.teacher_id = (select auth.uid())
      and tc.class_id = some_table.class_id
  )
)
```

Trong các policy thực tế, nên dùng `(select auth.uid())` thay vì gọi `auth.uid()` lặp lại trên từng row; Supabase khuyến nghị pattern này vì planner có thể cache giá trị cho statement. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

* * *

# 5\. `supabase-adapter.ts` — loại bỏ hoàn toàn admin client

Nguyên tắc bắt buộc:

```
supabase-adapter.ts
    ├── KHÔNG import supabase-admin
    ├── KHÔNG đọc SUPABASE_SERVICE_ROLE_KEY
    ├── KHÔNG đọc SUPABASE_SECRET_KEY
    └── KHÔNG có typeof window ? admin : client
```

Một adapter an toàn về mặt kiến trúc sẽ chỉ nhận một Supabase client thường:

TypeScript

```
// src/services/supabase-adapter.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DbAdapter } from './types';

export class SupabaseAdapter implements DbAdapter {
  constructor(
    private readonly client: SupabaseClient
  ) {}

  async getClasses() {
    const { data, error } = await this.client
      .from('classes')
      .select(`
        id,
        name,
        teacher_classes (
          teacher_id,
          is_homeroom,
          teacher_directory:teacher_id (
            teacher_id,
            full_name,
            role
          )
        )
      `)
      .order('name');

    if (error) {
      throw new Error(`Failed to load classes: ${error.message}`);
    }

    return data;
  }

  async saveAttendanceV3(input: unknown) {
    // Preserve the application's existing validation and payload
    // structure here.

    const { data, error } = await this.client
      .from('attendance')
      .upsert(input);

    if (error) {
      throw new Error(`Failed to save attendance: ${error.message}`);
    }

    return data;
  }

  async saveStudent(input: unknown) {
    const { data, error } = await this.client
      .from('students')
      .upsert(input);

    if (error) {
      throw new Error(`Failed to save student: ${error.message}`);
    }

    return data;
  }

  async deleteStudent(studentId: string) {
    const { error } = await this.client
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) {
      throw new Error(`Failed to delete student: ${error.message}`);
    }
  }

  async updateSettings(input: unknown) {
    // Keep the existing application's validation and row filter here.

    const { data, error } = await this.client
      .from('settings')
      .update(input)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update settings: ${error.message}`);
    }

    return data;
  }
}
```

### Lưu ý quan trọng

Phần query/table names ở trên phải được map với `DbAdapter` thực tế của project. Tôi không có snapshot nội dung hiện tại của `supabase-adapter.ts`, nên không nên giả vờ rằng các parameter/return types trên chính xác 100% với repository.

**Điểm bắt buộc của refactor không phụ thuộc interface:** adapter không được có bất kỳ dependency nào tới admin client.

* * *

# 6\. `db.ts`

Không nên có:

TypeScript

```
import { SupabaseAdapter } from './supabase-adapter';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const db = new SupabaseAdapter(
  typeof window === 'undefined'
    ? supabaseAdmin
    : supabase
);
```

Thay vào đó, dependency injection:

TypeScript

```
// src/services/db.ts

import { SupabaseAdapter } from './supabase-adapter';
import { supabase } from '@/lib/supabase';

export const db = new SupabaseAdapter(supabase);
```

Nếu ứng dụng dùng SSR authentication bằng cookies, tốt hơn nữa là **không dùng singleton Supabase client cho server request**. Tạo request-scoped server client bằng `@supabase/ssr`, còn browser sử dụng browser client. Supabase có hướng dẫn riêng cho mô hình SSR này. [Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client?utm_source=chatgpt.com)

Ví dụ:

```
src/
├── lib/
│   ├── supabase-browser.ts
│   ├── supabase-server.ts
│   └── supabase-admin.ts        ← server only
│
└── services/
    ├── db.ts                    ← normal/RLS
    └── supabase-adapter.ts      ← normal/RLS
```

* * *

# 7\. `supabase-admin.ts` — server-only tuyệt đối

Nếu vẫn cần administrative operations, hãy cô lập chúng:

TypeScript

```
// src/lib/supabase-admin.ts

import 'server-only';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseSecretKey) {
  throw new Error('Missing SUPABASE_SECRET_KEY');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
```

Điểm quan trọng:

- `import 'server-only'`
- Không fallback.
- Không có secret literal.
- Không export module này từ barrel file dùng bởi client.
- Không import module này từ `db.ts`.
- Không import module này từ `supabase-adapter.ts`.
- Chỉ import nó từ server-only administrative code.

Supabase hiện khuyến nghị **secret key mới** thay cho legacy `service_role` key; cả hai đều có quyền bypass RLS, nhưng secret key mới có thêm cơ chế bảo vệ khi bị dùng từ browser. [Supabase](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys?utm_source=chatgpt.com)

`.env.local`:

env

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

SUPABASE_SECRET_KEY=sb_secret_...
```

Không commit file này.

* * *

# 8\. Tách Admin Service khỏi `DbAdapter`

Đây là boundary quan trọng nhất.

### Normal application path

TypeScript

```
// src/services/db.ts

export const db = new SupabaseAdapter(supabase);
```

Các method như:

```
saveAttendanceV3
saveStudent
deleteStudent
updateSettings
```

**đều phải chạy dưới RLS**.

Nếu một operation thất bại vì RLS, đó là tín hiệu authorization cần sửa — **không được đổi adapter sang admin client**.

### Administrative path

TypeScript

```
// src/services/admin/admin-service.ts

import 'server-only';

import { supabaseAdmin } from '@/lib/supabase-admin';

export async function performAdministrativeOperation(...) {
  // Explicit privileged operation only.
}
```

Và chỉ gọi từ:

```
app/.../actions.ts
app/api/.../route.ts
```

những file server-only.

Tuyệt đối không:

TypeScript

```
// ❌
import { supabaseAdmin } from '@/lib/supabase-admin';

export const db = ...
```

và cũng không:

TypeScript

```
// ❌
export * from '@/lib/supabase-admin';
```

từ một barrel module mà client có thể import.

* * *

# 9\. Một cải tiến còn tốt hơn: Admin Action phải kiểm tra authorization trước

`server-only` **không có nghĩa là mọi server action đều được phép làm mọi thứ**.

Ví dụ:

TypeScript

```
'use server';

import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function deleteUserAsAdmin(userId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Verify the caller's application role here.
  // Do not trust a client-supplied "isAdmin" boolean.

  // Only after authorization:
  // await supabaseAdmin...
}
```

Tức là:

```
Authentication
      ↓
Authorization
      ↓
Privileged operation
```

chứ không phải:

```
Server Action
      ↓
service_role
      ↓
hope it's okay
```

* * *

# 10\. Query GVCN

Sau khi RLS đúng, browser có thể làm:

TypeScript

```
const { data, error } = await supabase
  .from('teacher_classes')
  .select(`
    teacher_id,
    is_homeroom,
    teacher:teacher_directory (
      teacher_id,
      full_name,
      role
    )
  `)
  .eq('class_id', classId)
  .eq('is_homeroom', true)
  .maybeSingle();
```

Không cần:

```
service_role
```

Không cần:

```
supabaseAdmin
```

Không cần:

```
RLS bypass
```

Nếu user là `anon`, PostgreSQL chạy với role `anon`; nếu user đăng nhập, request chạy với role `authenticated`. Đây chính là lý do policy có thể cho phép `anon` đọc **chỉ dữ liệu thực sự public**. [Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

* * *

# 11\. Red-team verification

## A. Search source tree

Chạy:

Bash

```
rg -n "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|service_role|sb_secret_|supabaseAdmin" src app
```

Mục tiêu:

```
supabase-adapter.ts → 0
db.ts              → 0
client components  → 0
browser libraries  → 0
```

`SUPABASE_SECRET_KEY` chỉ xuất hiện ở server-only boundary.

* * *

## B. Dependency graph

Tìm toàn bộ import:

Bash

```
rg -n "supabase-admin|supabaseAdmin" src app
```

Expected:

```
src/lib/supabase-admin.ts
src/services/admin/...
app/**/actions.ts
app/api/**/route.ts
```

Không được xuất hiện trong:

```
src/services/db.ts
src/services/supabase-adapter.ts
components/**
app/**/page.tsx
app/**/client components
```

* * *

# 12\. Kiểm tra production bundle

Build:

Bash

```
npm run build
```

Sau đó scan output:

Bash

```
rg -n \
  "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|service_role|sb_secret_" \
  .next/static .next/server
```

Nếu secret thực tế có giá trị cụ thể, scan cả giá trị:

Bash

```
rg -n "sb_secret_[A-Za-z0-9_-]+" .next
```

Mục tiêu:

```
.next/static → KHÔNG CÓ SECRET
```

`server` bundle có thể chứa server-side reference đến environment variable, nhưng **không nên có literal secret value** bị embed vào static/client asset.

Đặc biệt kiểm tra:

```
.next/static/chunks/
```

vì đây là phần được gửi xuống browser.

* * *

# 13\. Kiểm tra bằng browser DevTools

Production deployment:

1. Mở DevTools.
2. Network.
3. Download JS chunks.
4. Search:

```
service_role
sb_secret_
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY
```

Không được tìm thấy secret.

Cần phân biệt:

```
NEXT_PUBLIC_SUPABASE_URL
publishable/anon key
```

với:

```
SUPABASE_SECRET_KEY
service_role
```

Publishable/anon key **được thiết kế để có thể nằm trong client**, nhưng dữ liệu phải được bảo vệ bằng GRANT + RLS. Supabase hiện mô tả Data API theo chính mô hình publishable key + RLS này. [Supabase+1](https://supabase.com/docs/guides/database/secure-data?utm_source=chatgpt.com)

* * *

# 14\. RLS attack tests

### Test 1 — anonymous đọc tên GVCN

```
anonymous
  ↓
teacher_classes SELECT
  ↓
teacher_directory SELECT
  ↓
full_name = OK
```

Expected:

```
200 / data returned
```

### Test 2 — anonymous đọc CCCD

```
anonymous
  ↓
profiles.citizen_id
```

Expected:

```
permission denied
```

hoặc column không được exposed.

### Test 3 — anonymous UPDATE

```
anonymous
  ↓
UPDATE classes
```

Expected:

```
permission denied
```

### Test 4 — authenticated teacher sửa row không thuộc quyền

```
Teacher A
   ↓
UPDATE attendance belonging to Teacher B
```

Expected:

```
0 rows affected / RLS violation
```

### Test 5 — service/admin path

Chỉ administrative endpoint/server action được quyền bypass.

Không được có tình trạng:

```
ordinary saveStudent()
    ↓
service_role
```

* * *

# 15\. pgTAP nên có

Supabase hỗ trợ test RLS bằng `supabase test db` và `supabase-test-helpers`. [Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

Tạo:

Bash

```
supabase test new attendance_rls
```

Test matrix tối thiểu:

| Actor | SELECT GVCN | SELECT private | UPDATE own | UPDATE other's |
| --- | --- | --- | --- | --- |
| anon | ✅ | ❌ | ❌ | ❌ |
| teacher A | ✅ | theo policy | ✅ | ❌ |
| teacher B | ✅ | theo policy | ✅ | ❌ |
| admin | theo policy | theo policy | theo policy | theo policy |

* * *

# 16\. Một cảnh báo về `security definer`

Không nên tạo một view/function `security definer` chỉ để "né" RLS một cách tùy tiện.

Supabase lưu ý rằng view thông thường có thể bypass RLS; PostgreSQL 15+ hỗ trợ `security_invoker = true` để view tuân theo RLS của bảng nguồn. Với `security definer`, phải khóa `search_path`, schema-qualify object names và giới hạn quyền `EXECUTE`. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

Nếu sau này cần function kiểu:

SQL

```
private.user_can_manage_class(...)
```

hãy đặt ở schema private và dùng pattern:

SQL

```
create function private.user_can_manage_class(...)
returns boolean
language sql
security definer
set search_path = ''
...
```

chứ không đặt một `SECURITY DEFINER` function quyền cao vào exposed `public` schema.

* * *

# 17\. Definition of Done

Tôi sẽ coi TASK-SEC-RLS-ADAPTER-001 đạt chuẩn khi toàn bộ điều kiện sau đúng:

```
[ ] supabase-adapter.ts không import supabase-admin.ts
[ ] db.ts không import supabase-admin.ts
[ ] không còn typeof window ? supabaseAdmin : supabase
[ ] không có service_role trong client dependency graph
[ ] không có secret fallback hardcoded
[ ] supabase-admin.ts có import 'server-only'
[ ] SUPABASE_SECRET_KEY chỉ tồn tại server
[ ] mọi CRUD bình thường chạy bằng RLS client
[ ] classes có SELECT policy phù hợp
[ ] teacher_classes có SELECT policy phù hợp
[ ] teacher directory chỉ expose full_name/role cần thiết
[ ] phone/CCCD/email không public
[ ] UPDATE có USING + WITH CHECK phù hợp
[ ] DELETE có policy riêng
[ ] GRANT được thu hẹp, không chỉ dựa vào RLS
[ ] production .next/static không chứa secret
[ ] anonymous không UPDATE được
[ ] teacher A không sửa dữ liệu teacher B
[ ] anonymous vẫn đọc được tên GVCN
[ ] RLS tests/pgTAP pass
```

**Kết luận kiến trúc:** lỗi hiện tại không nên được sửa bằng cách làm `supabaseAdmin` "thông minh hơn". Phải **xóa admin client khỏi dependency graph của `SupabaseAdapter`**, đưa public teacher data vào một boundary dữ liệu riêng, và để `anon`/`authenticated` truy cập dữ liệu đó qua **GRANT + RLS**. Admin client chỉ tồn tại như một capability riêng biệt ở server. Đây là cách đạt được Zero-Leak + Least Privilege thay vì chỉ che giấu `service_role` khỏi browser. [Supabase+1](https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com)

Nếu áp dụng đúng boundary này, việc `profiles` bị `null` sẽ trở thành vấn đề **authorization/schema design**, không còn là lý do để bypass toàn bộ RLS.