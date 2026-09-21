---
evidence_id: EVD-20260921060332-CHATGPT-REVIEW
bridge_endpoint: http://127.0.0.1:17841/v1/responses
model_used: chatgpt-web/luna
turn_timestamp: 2026-09-21T06:03:32.762Z
request_hash: 5368e10e347d77c3ec7dc71cdf1bcf8be7c1b447fbeb8104b5661335c116e70f
response_hash: a90cdf5b1569c4fb70df585d8090ca9bbcac45044741b3a6bdec378678d18efc
http_status: 200 OK
elapsed_seconds: 67.8
verdict: APPROVED
---

# BÁO CÁO ĐÁNH GIÁ 5 LỚP TỪ CHATGPT WEB (OFFICIAL CODE REVIEW)
**Mã nhiệm vụ:** TASK-PERF-ATTENDANCE  
**Đơn vị thẩm định:** ChatGPT Web Principal Architect (Luna Engine)  
**Phán quyết:** APPROVED 💎  

> **Local tools unavailable**
>
> `ChatGPT Web Luna` cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them.
>
> **Action:** Open `MCP` in `Codex Web GPT` and connect the `Full` harness to give the selected ChatGPT Web model access to local tools.# Thẩm định 5 lớp — TASK-PERF-ATTENDANCE

**Phán quyết: `REQUEST_CHANGES`**

Bản diff đã thực hiện đúng hướng tối ưu hóa lớn, nhưng **chưa đủ điều kiện APPROVED** theo đúng 5 lớp, đặc biệt ở **race condition, SLO 350/400ms, tính nguyên tử của batch sync và khả năng xác minh Exception-Only/Zalo**.

* * *

## Lớp 1 — Invariant & Contract Verification

### 1.1. Scoped Student Query — Đạt

`getClassAttendance()` và `getAttendanceByClasses()` đã chuyển từ:

TypeScript

```
students.select('id, student_code, full_name')
```

toàn bảng sang:

TypeScript

```
.in('id', studentIds)
```

Đồng thời có guard:

TypeScript

```
if (studentIds.length === 0) return [];
```

\=> **Đạt yêu cầu chống `IN []` và tránh full-table student query.**

### 1.2. Early Return — Đạt một phần

Có:

TypeScript

```
if (error || !data || data.length === 0) return [];
```

Điều này phù hợp với mô hình **Exception-Only V3** nếu:

> Không có attendance record = không có exception = trả `[]`.

Tuy nhiên, claim "trả về ngay `[]` trong 0ms nếu lớp đi học đủ 100%" **không thể được chứng minh từ diff**. Code vẫn phải thực hiện query attendance trước khi biết `data.length === 0`.

Vì vậy:

**Contract logic: đạt. Claim latency 0ms: chưa được chứng minh.**

* * *

### 1.3. Cache attendance statuses — Đạt về cơ chế

TTL 24h:

TypeScript

```
const STATUS_CACHE_TTL = 24 * 60 * 60 * 1000;
```

và cache được dùng trong các đường đọc.

Điểm cần lưu ý: đây là **process-local memory cache**, không phải distributed cache.

Trong môi trường serverless/multiple instances:

```
Request A → Instance 1 → cache
Request B → Instance 2 → DB
```

vẫn có thể xảy ra.

Không phải blocker về correctness, nhưng không nên mô tả nó như một cache toàn hệ thống.

* * *

### 1.4. Dirty Diff — Đạt về ý tưởng

Việc chuyển từ:

```
mọi checkbox → save/delete
```

sang:

```
initial state
       ↓
current state
       ↓
diff
       ↓
toInsert / toDeleteIds
```

là đúng kiến trúc.

Đặc biệt:

TypeScript

```
if (isChecked && !wasChecked)
```

và:

TypeScript

```
else if (!isChecked && wasChecked)
```

đã loại bỏ các write không cần thiết.

### 1.5. Contract "giảm 98% request" — Chưa đạt chứng minh

Đây là điểm rất quan trọng.

Code chỉ loại bỏ request **khi SAVE**.

Trong `init()` vẫn có:

TypeScript

```
await Promise.all(colsRes.map(async (col) => {
    const recs = await getDailyRecords(col.id, date);
}));
```

Nếu có 135 custom records/columns tương ứng, vẫn có thể phát sinh **N request đọc song song**.

Do đó:

> "Triệt tiêu cơn bão 135 request" là đúng cho **save path**, nhưng không thể áp dụng cho toàn bộ attendance workflow.

**Lớp 1: CONDITIONAL PASS**

* * *

# Lớp 2 — Code Quality & Architecture Cleanliness

## 2.1. Parallel I/O — Tốt

Đoạn:

TypeScript

```
const [classAndStudentsRes, colsRes, allRecordsRes] = await Promise.all([
    getClassAndStudents(classId),
    getColumnsByFrequency(classId, 'daily'),
    getClassAttendance(classId, date, session)
]);
```

và:

TypeScript

```
const [cls, students] = await Promise.all([
    db.getClass(classId),
    db.getStudentsByClass(classId)
]);
```

là cải tiến hợp lý.

Không có dependency giữa ba nhánh chính nên việc parallel hóa là hợp lệ.

**PASS.**

* * *

## 2.2. `batchSyncDailyRecords()` — Tên/mô tả đang overclaim

Comment:

> `Batch sync daily records in ONE single database operation`

Nhưng thực tế:

TypeScript

```
upsert(...)
```

và:

TypeScript

```
delete(...)
```

là **hai database operations**, được chạy song song bằng:

TypeScript

```
Promise.all(ops)
```

Nó không phải một atomic database operation.

Nên sửa comment thành kiểu:

```
Batch sync daily records using bulk upsert/delete operations
```

hoặc tốt hơn nữa là dùng một RPC/transaction nếu cần atomicity thực sự.

* * *

## 2.3. Atomicity — Chưa đủ

Hiện tại có tình huống:

```
UPSERT → thành công
DELETE → thất bại
```

hoặc ngược lại.

Code sẽ:

TypeScript

```
for (const res of results) {
    if (res.error) throw ...
}
```

nhưng lúc đó operation còn lại có thể đã commit.

\=> Database có thể rơi vào **partial success**.

Nếu yêu cầu nghiệp vụ là "lưu điểm danh" phải atomic thì kiến trúc hiện tại chưa đủ.

**REQUEST CHANGE.**

* * *

## 2.4. Deep clone snapshot

TypeScript

```
JSON.parse(JSON.stringify(recordsMap))
```

hoạt động với cấu trúc dữ liệu hiện tại vì đây chỉ là boolean map, nhưng không phải cách sạch nhất.

Có thể dùng:

TypeScript

```
structuredClone(recordsMap)
```

nếu target runtime hỗ trợ.

Đây không phải blocker.

* * *

# Lớp 3 — Performance & Resource Latency

SLO yêu cầu:

| SLO | Đánh giá |
| --- | --- |
| Mở danh sách ≤ 350ms | **Chưa chứng minh** |
| Lưu ≤ 400ms | **Chưa chứng minh** |
| Giảm 98% request | **Chưa chứng minh toàn workflow** |

## 3.1. Mở danh sách

Parallelization chắc chắn làm giảm critical path:

```
Trước:
A → B → C → D

Sau:
A ─┐
B ─┼→ max(A,B,C)
C ─┘
```

Nhưng vẫn còn:

TypeScript

```
Promise.all(colsRes.map(...getDailyRecords))
```

tức là số lượng request đọc vẫn phụ thuộc số custom columns.

Do đó:

> **Parallel ≠ ít request.**

Nếu mỗi request có latency 100ms thì parallel có thể nhanh hơn tuần tự rất nhiều, nhưng vẫn chịu:

- connection pool
- Supabase latency
- browser/server concurrency
- server load
- DB query time

Không có benchmark thì **không thể tuyên bố ≤350ms**.

* * *

## 3.2. Save path

Đây là phần được cải thiện mạnh nhất.

Trước:

```
135 records
→ ~135 save/delete requests
```

Sau:

```
toInsert
toDeleteIds
      ↓
batchSyncDailyRecords()
      ↓
upsert + delete
```

Về mặt request count, đây là cải thiện rất lớn.

Nhưng nếu vừa insert vừa delete:

TypeScript

```
ops.push(upsert)
ops.push(delete)
```

thì vẫn là **2 operations**, không phải 1.

Nếu mục tiêu là chứng minh **98%**, cần benchmark thực tế:

```
request count BEFORE
request count AFTER
wall-clock BEFORE
wall-clock AFTER
```

chứ không thể suy ra 98% chỉ từ diff.

**Lớp 3: FAIL — chưa có evidence SLO.**

* * *

# Lớp 4 — Backward Compatibility

Đây là lớp tôi đặc biệt không thể cho APPROVED chỉ dựa trên diff.

## 4.1. Exception-Only V3

Phần đọc mới vẫn có logic:

TypeScript

```
if (!data || data.length === 0) return [];
```

và mapping vẫn dựa trên các attendance records hiện hữu.

\=> **Không thấy dấu hiệu rõ ràng phá vỡ Exception-Only V3.**

Nhưng để certify **100%**, cần kiểm tra toàn bộ implementation của:

```
batchMarkAttendance
getClassAttendance
getAttendanceByClasses
```

đặc biệt phần phân loại:

```
daily
violation
reward
```

và các trường hợp reset.

Từ diff được cung cấp, tôi chỉ có thể đánh giá:

**No obvious regression detected.**

Không thể gọi là "100% verified".

* * *

## 4.2. Zalo bot alerting

Diff không cho thấy phần Zalo alerting được sửa.

Đó là tín hiệu tốt.

Nhưng yêu cầu là:

> bảo toàn 100% logic Exception-Only V3 và Zalo bot alerting.

Không có full function/test nên chưa thể chứng minh.

Đặc biệt cần kiểm tra xem các nhánh:

TypeScript

```
try {
   ...
} catch {
   ...
}
```

của Zalo notification có còn đúng vị trí sau các thay đổi async hay không.

**Status: NOT VERIFIED.**

* * *

# Lớp 5 — Security & Edge Cases

Đây là lớp có **blocker thực sự**.

## 5.1. Empty `IN` — PASS

Đã xử lý:

TypeScript

```
if (studentIds.length === 0) return [];
```

và các delete cũng chỉ được tạo khi array có phần tử:

TypeScript

```
if (studentsToResetAttendance.length > 0)
```

\=> **PASS.**

* * *

# 5.2. Race condition — FAIL / BLOCKER

Đây là vấn đề nghiêm trọng nhất.

Giả sử:

### Teacher A mở bảng

```
initialCustomRecords:
student A / column X = false
```

### Teacher B mở cùng bảng

B tick:

```
false → true
```

và lưu.

Database hiện tại:

```
true
```

### Teacher A vẫn đang ở màn hình cũ

A không tick:

```
false
```

Sau đó A save.

Code của A:

TypeScript

```
const wasChecked = initialCustomRecords[...] || false;
const isChecked = customRecords[...] || false;

if (!isChecked && wasChecked) {
    toDeleteIds.push(...)
}
```

Trong trường hợp này nếu snapshot của A là `true`, A sẽ gửi:

```
DELETE id
```

và có thể xóa thay đổi vừa được Teacher B ghi.

Nói cách khác:

> **Dirty Diff giải quyết unnecessary writes nhưng chưa giải quyết optimistic concurrency.**

* * *

## 5.3. Worse case: concurrent delete/update

`batchSyncDailyRecords()` không kiểm tra version:

TypeScript

```
.delete()
.in('id', toDeleteIds)
```

Nó không có điều kiện kiểu:

```
delete only if updated_at == original_updated_at
```

hoặc:

```
delete only if version == original_version
```

Do đó không có cơ chế phát hiện:

```
"Database đã thay đổi kể từ lúc tôi load."
```

### Cần một trong các giải pháp:

**Option A — Optimistic concurrency**

Snapshot:

TypeScript

```
{
    id,
    updatedAt,
    value
}
```

và DELETE/UPDATE chỉ thành công nếu `updated_at` vẫn khớp.

**Option B — Version column**

```
version = version + 1
```

và:

```
WHERE id = ? AND version = originalVersion
```

**Option C — Server-side transactional RPC**

Server nhận:

```
original state
desired state
```

sau đó transaction kiểm tra conflict rồi commit.

Trong hệ thống điểm danh nhiều giáo viên, **Option C hoặc optimistic concurrency là đáng cân nhắc nhất.**

* * *

# 5.4. Delete errors trong `batchMarkAttendance`

Đoạn mới:

TypeScript

```
const deleteOps: Promise<any>[] = [];
...
deleteOps.push(
    dbClient.from('attendance').delete()...
);
...
await Promise.all(deleteOps);
```

Có một vấn đề:

Supabase query promise có thể resolve với:

TypeScript

```
{
    data,
    error
}
```

chứ không nhất thiết reject Promise.

Nếu một DELETE trả:

TypeScript

```
{ error: ... }
```

thì:

TypeScript

```
await Promise.all(deleteOps)
```

vẫn có thể hoàn thành bình thường.

Trong diff không thấy kiểm tra:

TypeScript

```
const results = await Promise.all(deleteOps);

for (const result of results) {
    if (result.error) ...
}
```

Điều này đặc biệt nguy hiểm vì code có thể tiếp tục sang UPSERT dù reset/delete trước đó thất bại.

**REQUEST CHANGE.**

* * *

# Tổng hợp

| Lớp | Kết quả | Nhận xét |
| --- | --- | --- |
| **1\. Invariant & Contract** | ⚠️ CONDITIONAL | Scoped query/empty guard tốt, nhưng request reduction chưa chứng minh |
| **2\. Architecture** | ⚠️ CONDITIONAL | Parallelization tốt; batch chưa atomic và comment overclaim |
| **3\. Performance** | ❌ FAIL | Chưa có benchmark chứng minh 350/400ms và 98% |
| **4\. Compatibility** | ⚠️ NOT VERIFIED | Chưa đủ evidence để certify 100% Exception-Only + Zalo |
| **5\. Security/Edge Cases** | ❌ FAIL | Race condition có thể ghi đè/xóa thay đổi của GV khác |

# Các thay đổi bắt buộc trước APPROVED

### P0 — Phải sửa

**1\. Chống race condition**

Không được:

TypeScript

```
DELETE WHERE id IN (...)
```

một cách vô điều kiện dựa trên snapshot cũ.

Phải có optimistic concurrency/version check hoặc transaction/RPC.

* * *

**2\. Xử lý lỗi của các DELETE song song**

Thay:

TypeScript

```
await Promise.all(deleteOps);
```

bằng cơ chế kiểm tra `result.error`.

* * *

**3\. Làm batch sync atomic nếu contract yêu cầu lưu nhất quán**

Hiện tại:

```
UPSERT ─┐
        ├── Promise.all
DELETE ─┘
```

không phải transaction.

Nên cân nhắc:

```
Client
  ↓
RPC / Server Action
  ↓
BEGIN
  ↓
validate version
  ↓
bulk upsert
  ↓
bulk delete
  ↓
COMMIT
```

Nếu conflict:

```
ROLLBACK
→ CONFLICT
```

* * *

### P1 — Phải có evidence

Chạy benchmark trước/sau và ghi rõ:

```
OPEN ATTENDANCE
────────────────────────
Before:
  HTTP requests = ?
  DB queries    = ?
  p50           = ?
  p95           = ?
  p99           = ?

After:
  HTTP requests = ?
  DB queries    = ?
  p50           = ?
  p95           = ?
  p99           = ?
```

và:

```
SAVE ATTENDANCE
────────────────────────
Before requests = ?
After requests  = ?
Reduction       = ?%

Before latency  = ?
After latency   = ?
```

Chỉ sau khi có số liệu thực tế mới được tuyên bố đạt:

```
≤350ms
≤400ms
≥98% reduction
```

* * *

# Phán quyết cuối cùng

## `REQUEST_CHANGES`

**Không phải vì hướng tối ưu sai.** Ngược lại, phần lớn kiến trúc tối ưu là hợp lý và có khả năng tạo cải thiện lớn.

Nhưng với tiêu chuẩn **Principal Architect / Task Contract Strength 4**, hiện tại có **3 blocker**:

1. **Race condition chưa được bảo vệ** → có khả năng làm mất thay đổi của giáo viên khác.
2. **Batch sync không atomic + DELETE errors chưa được kiểm tra đầy đủ.**
3. **Chưa có benchmark/evidence để chứng minh SLO 350ms / 400ms / 98%.**

Nếu chỉ xét "code có vẻ tối ưu hơn trước" thì bản này đã tiến bộ rõ rệt. Nhưng nếu câu hỏi là **"đã đủ an toàn và đủ bằng chứng để APPROVED production chưa?"**, thì **chưa**.
