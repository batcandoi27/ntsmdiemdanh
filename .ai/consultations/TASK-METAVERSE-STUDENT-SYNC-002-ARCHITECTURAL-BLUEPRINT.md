⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Dưới đây là đặc tả nên được chốt theo hướng **server-authoritative, deterministic, reactive UI và kiểm thử được bằng invariant**, thay vì chỉ “render đủ 40–43 con vật”. Mục tiêu production là: **số học sinh = số avatar/trứng 1:1, không trùng/mất ID, trạng thái level và khu vực nhất quán, khu khóa không thể bypass, hover/tap có đầy đủ dữ liệu và mọi invariant đều có automated test.**

## 1\. Kiến trúc tổng thể

Nên chia hệ thống thành 5 lớp:

```
Class Roster / Student Service
          │
          ▼
   Metaverse State Service
   ├── Student → Avatar mapping
   ├── Level / XP
   ├── Vitality / Streak
   ├── Coins / Scores
   ├── Missions / Badges
   └── Current Zone
          │
          ▼
     Rule Engine
   ├── Zone unlock rules
   ├── Spawn/placement rules
   └── Visibility rules
          │
          ▼
     Metaverse Renderer
   ├── 2D grid/map
   ├── Egg / creature
   ├── ID + Level label
   ├── lock/fog overlay
   └── hover/tap popover
          │
          ▼
   Automated Tests / Telemetry
```

**Nguyên tắc quan trọng:** frontend không được tự quyết định học sinh nào tồn tại, level bao nhiêu hoặc khu vực nào được mở. Frontend chỉ render state và thực thi rule đã được server xác nhận.

* * *

# 2\. Đặc tả yêu cầu 1 — Đồng bộ 100% học sinh

### 2.1. Invariant bắt buộc

Với tập học sinh của lớp:

`N = số học sinh active trong roster`

thì:

`N = số avatar/trứng active trên metaverse`

Đồng thời:

- mỗi student có **đúng 1 avatar**;
- mỗi avatar thuộc **đúng 1 student**;
- không duplicate `studentId`;
- không orphan avatar;
- học sinh inactive/removed không được tiếp tục xuất hiện;
- refresh/reconnect không được tạo thêm avatar;
- thay đổi roster phải được phản ánh idempotent.

Ví dụ lớp có 43 học sinh:

```
Roster = 43
Metaverse entities = 43
Unassigned students = 0
Duplicate student IDs = 0
Orphan entities = 0
```

Đây nên là **hard invariant**, không phải chỉ là điều kiện UI.

### 2.2. Identity model

Không nên dùng index mảng làm identity.

Nên có:

```
studentId       // ID nội bộ duy nhất
displayCode     // mã định danh hiển thị, ví dụ 8A13_15
avatarId        // ID entity metaverse
anonymousName   // bí danh linh vật
level
xp
...
```

`displayCode` dùng cho UI; `studentId`/`avatarId` dùng làm identity kỹ thuật.

Nếu mã định danh có yêu cầu bảo mật/ẩn danh, **không expose database primary key hoặc thông tin cá nhân thật ra client**.

### 2.3. Spawn rule

```
Level 0
→ Residential / Home Ring
→ Egg state

Level >= 1
→ Central activity zones
→ Creature state
```

Việc chuyển khu vực phải là một **pure function/rule** có thể test:

```
resolveSpawn(studentState, worldRules) -> SpawnLocation
```

Không nên rải logic `if level === ...` ở nhiều component.

### 2.4. Placement

Bản đồ nên có hệ tọa độ logic:

```
zoneId
cellId
x
y
occupancy
```

Placement service chịu trách nhiệm:

1. lấy danh sách entity;
2. phân loại theo level;
3. lấy các cell hợp lệ;
4. deterministic placement;
5. kiểm tra collision;
6. fallback nếu zone đầy.

Nếu cần random hóa vị trí, dùng seed ổn định theo `avatarId`, tránh việc mỗi render lại làm avatar nhảy sang vị trí khác.

* * *

# 3\. Đặc tả yêu cầu 2 — Khóa khu vực theo Level

Nên khai báo rule bằng data/config thay vì hard-code trong component.

Ví dụ:

```
Home             requiredLevel = 0
Village Center   requiredLevel = 1
Library          requiredLevel = 5
Arena            requiredLevel = 10
Cosmic Forest    requiredLevel = 20
```

### 3.1. Rule engine

```
isZoneUnlocked(studentLevel, zoneRequiredLevel)
    = studentLevel >= zoneRequiredLevel
```

UI:

```
if unlocked
    → allow interaction
else
    → block interaction
    → show lock modal
    → show fog/lock overlay
```

Thông báo:

> 🔒 Khu vực này bị khóa! Cần đạt Cấp độ Level X để mở khóa và khám phá bản đồ khu vực này.

### 3.2. Cực kỳ quan trọng: khóa ở cả frontend và backend

Không được chỉ:

```
button.disabled = true
```

vì user có thể gọi API trực tiếp.

Mọi command kiểu:

```
enterZone()
startArena()
openLibrary()
interactWithZone()
```

phải được server validate:

```
authorizeZoneAccess(studentId, zoneId)
```

Nếu không đủ level:

```
403 / DOMAIN_LEVEL_LOCKED
```

Frontend chỉ chuyển response đó thành modal UX.

### 3.3. Fog of War

Mỗi zone có state:

```
LOCKED
UNLOCKED
ACTIVE
```

Locked zone nên có:

- overlay mờ;
- icon khóa;
- giảm saturation/opacity;
- required level;
- click target vẫn hoạt động để hiển thị lý do bị khóa.

**Không nên chỉ disable pointer events**, vì như vậy người dùng không thể bấm để nhận thông báo.

### 3.4. Boundary tests

Phải test tối thiểu:

```
Level 4 → Library Lv5 = locked
Level 5 → Library Lv5 = unlocked

Level 9 → Arena Lv10 = locked
Level 10 → Arena Lv10 = unlocked

Level 19 → Cosmic Forest Lv20 = locked
Level 20 → Cosmic Forest Lv20 = unlocked
```

Đây là dạng test rất quan trọng vì bắt được lỗi `>` thay vì `>=`.

* * *

# 4\. Đặc tả yêu cầu 3 — ID + Level label

Mỗi entity phải render:

```
[Mã định danh] • Lv.[Level]
```

Ví dụ:

```
8A13_01 • Lv.0
8A13_15 • Lv.3
```

Nên tạo một formatter duy nhất:

```
formatAvatarLabel(displayCode, level)
```

Không để từng component tự ghép string.

### Quy tắc

- ID không được null/undefined;
- level phải là integer hợp lệ;
- không hiển thị database ID;
- label phải update ngay khi level thay đổi;
- không được duplicate label do rendering stale state.

Với 43 học sinh, automated test phải xác nhận **43 label tương ứng với 43 identity duy nhất**.

* * *

# 5\. Đặc tả yêu cầu 4 — Rich Hover/Touch Popover

Nên tách thành:

```
AvatarEntity
      │
      └── AvatarInteractionController
                │
                └── AvatarDetailPopover
```

Popover nhận một **view model** đã chuẩn hóa:

```
AvatarDetailVM {
  displayCode
  anonymousName
  avatarSvg
  eggColor
  level
  currentXp
  requiredXp
  vitalityPercent
  streakDays
  coins
  competitionScore
  conductScore
  completedMissions
  badges
  currentZone
}
```

### 5.1. Nội dung

Popover phải hiển thị:

- mã định danh;
- bí danh linh vật;
- SVG/avatar;
- màu trứng;
- Level;
- XP hiện tại;
- XP cần để lên level;
- progress bar;
- sinh lực %;
- streak;
- Coins;
- điểm thi đua/rèn luyện;
- nhiệm vụ hoàn thành;
- badges;
- khu vực hiện tại.

### 5.2. Desktop

- `mouseenter`/hover mở;
- `mouseleave` không được đóng ngay khi pointer di chuyển từ avatar sang card;
- card có vùng hover riêng;
- positioning tránh overflow viewport;
- không che avatar quá mức.

### 5.3. Mobile

Không thể phụ thuộc hover.

Nên hỗ trợ:

```
tap avatar → open popover/bottom sheet
tap outside → close
Esc → close
```

Touch target nên đủ lớn cho thao tác ngón tay.

### 5.4. Performance

Không nên mount 43 popover đầy đủ cùng lúc.

Dùng:

```
43 lightweight avatar nodes
+
1 shared detail popover
```

Khi user chọn avatar:

```
selectedAvatarId = X
```

rồi render dữ liệu X vào shared popover.

Cách này tốt hơn đáng kể về memory và DOM/render cost.

* * *

# 6\. State model đề xuất

Nên có một canonical state:

```
MetaverseState
├── world
│   ├── zones[]
│   └── rules
├── class
│   ├── classId
│   └── rosterVersion
└── avatars[]
```

Mỗi avatar:

```
AvatarState
├── identity
│   ├── studentId
│   ├── displayCode
│   └── anonymousName
├── progression
│   ├── level
│   └── xp
├── wellbeing
│   ├── vitality
│   └── streak
├── economy
│   └── coins
├── achievement
│   ├── competitionScore
│   ├── conductScore
│   ├── completedMissions
│   └── badges
└── world
    ├── zoneId
    └── position
```

**Single source of truth:** roster/progression backend.

* * *

# 7\. Đồng bộ realtime

Nếu cổng học sinh có nhiều client đồng thời, nên dùng event-driven synchronization:

```
Student update
      ↓
Domain event
      ↓
Metaverse state update
      ↓
Realtime channel
      ↓
All connected clients
```

Các event có thể gồm:

```
STUDENT_ADDED
STUDENT_REMOVED
STUDENT_LEVEL_CHANGED
STUDENT_XP_CHANGED
STUDENT_VITALITY_CHANGED
STUDENT_ZONE_CHANGED
AVATAR_UPDATED
```

Cần có:

- `version` hoặc sequence number;
- idempotent event handling;
- reconnect → full snapshot;
- sau snapshot → tiếp tục delta events;
- không duplicate event;
- stale event không được ghi đè state mới hơn.

* * *

# 8\. Execution Plan cho Antigravity

## Phase 1 — Audit code hiện tại

Trước khi sửa UI:

- xác định nguồn roster hiện tại;
- tìm model student/avatar;
- tìm map/grid renderer;
- tìm zone definitions;
- tìm level/XP logic;
- tìm realtime mechanism;
- xác định state management;
- xác định test framework hiện có.

**Không tạo implementation song song nếu hệ thống đã có canonical state.**

Deliverable:

```
Current architecture map
+
list of affected files/components/services
+
existing test baseline
```

* * *

## Phase 2 — Xây domain model và invariants

Implement/fix:

1. Student → Avatar 1:1 mapping.
2. `displayCode`.
3. avatar state.
4. zone configuration.
5. level access rule.
6. deterministic spawn rule.
7. validation/invariant functions.

Tạo các pure functions:

```
buildAvatarRoster()
resolveSpawn()
isZoneUnlocked()
formatAvatarLabel()
buildAvatarDetailVM()
```

Ưu tiên pure function vì dễ unit-test.

* * *

## Phase 3 — Đồng bộ 100%

Implement reconciliation:

```
reconcileRoster(roster, currentAvatars)
```

Expected behavior:

```
new student
→ create exactly one avatar

existing student
→ preserve avatar identity/state

removed student
→ remove/deactivate avatar

duplicate
→ reconcile to one canonical avatar
```

Sau mỗi reconciliation phải assert:

```
avatarCount === activeStudentCount
uniqueStudentIds === avatarCount
```

* * *

## Phase 4 — Map placement

Implement zone/cell registry:

```
Zone
 └── Cells[]
```

và:

```
resolveSpawn(student)
```

Test:

- Lv0 luôn vào residential;
- Lv1+ không spawn nhầm vào residential-only egg slot;
- không collision;
- zone đầy có fallback;
- cùng state + cùng seed → cùng vị trí.

* * *

## Phase 5 — Level-gated zones

Implement:

```
ZoneAccessService
```

với server validation.

Sau đó frontend:

```
LockedZone
 ├── Fog
 ├── Lock icon
 ├── Required level
 └── Click handler → modal
```

Không hard-code level trong JSX/component.

* * *

## Phase 6 — Identity label

Tạo component dùng chung:

```
AvatarLabel
```

Render:

```
8A13_15 • Lv.3
```

Test snapshot/UI:

- đúng format;
- đúng ID;
- đúng level;
- update sau progression event.

* * *

## Phase 7 — Rich Popover

Implement shared popover:

```
Avatar → selectedAvatarId
       ↓
AvatarDetailVM
       ↓
Popover
```

Kiểm thử cả:

- desktop hover;
- hover transition avatar → card;
- keyboard focus;
- Escape;
- mobile tap;
- outside tap;
- viewport edge positioning.

* * *

## Phase 8 — Realtime consistency

Test scenario:

```
Client A: level 4
Client B: level 4

A receives level-up → level 5

Expected:
A = Lv5
B = Lv5

Library:
previously locked
→ now unlocked
```

Đây là nơi cần kiểm tra race condition và stale events.

* * *

# 9\. Test Matrix production

### Unit tests

Bắt buộc có:

- roster reconciliation;
- 1:1 mapping;
- duplicate prevention;
- removed student;
- spawn rules;
- level boundary;
- zone authorization;
- label formatter;
- XP calculation;
- popover view model.

### Integration tests

Kiểm tra:

```
Roster API
→ state
→ avatar generation
→ map placement
→ rendered count
```

### E2E tests

Scenario quan trọng nhất:

**Test A — 43 học sinh**

```
Given class has 43 active students
When metaverse loads
Then exactly 43 avatars are visible
And all 43 display codes are unique
And every student has exactly one avatar
```

**Test B — Level 0**

```
Lv0
→ egg
→ residential zone
```

**Test C — Level 1**

```
Lv1
→ creature
→ eligible central zone
```

**Test D — locked library**

```
Lv4
→ click Library
→ locked modal
→ Library remains inaccessible
```

**Test E — unlock**

```
Lv5
→ click Library
→ access granted
```

**Test F — Arena**

```
Lv9 = locked
Lv10 = unlocked
```

**Test G — Cosmic Forest**

```
Lv19 = locked
Lv20 = unlocked
```

**Test H — rich detail**

Click/hover avatar → verify toàn bộ required fields.

**Test I — mobile**

Tap avatar → detail card/bottom sheet → dismiss.

**Test J — realtime**

Level-up một học sinh → mọi client nhận cùng state.

* * *

# 10\. Production acceptance criteria

Có thể dùng bộ tiêu chí sau làm Definition of Done:

| Hạng mục | Acceptance |
| --- | --- |
| Student/avatar | **100% 1:1** |
| Duplicate avatar | **0** |
| Orphan avatar | **0** |
| Missing student | **0** |
| ID label | **100% avatar** |
| Level label | **100% avatar** |
| Level gate | Frontend + backend |
| Locked modal | 100% locked-zone clicks |
| Fog/lock overlay | 100% locked zones |
| Hover detail | Đủ toàn bộ fields |
| Mobile tap | Hoạt động |
| Realtime sync | Idempotent + ordered/versioned |
| Level boundary | Tested |
| 40–43 student load | E2E tested |
| Refresh/reconnect | Không duplicate |
| Roster mutation | Reconciled correctly |

* * *

# 11\. Thứ tự ưu tiên triển khai

Antigravity nên làm theo thứ tự này, **không nên bắt đầu bằng animation/UI polish**:

```
1. Audit + baseline tests
        ↓
2. Canonical student/avatar state
        ↓
3. 1:1 roster reconciliation
        ↓
4. Zone + level rule engine
        ↓
5. Server-side authorization
        ↓
6. Deterministic map placement
        ↓
7. ID/Lv labels
        ↓
8. Lock/Fog UI + modal
        ↓
9. Rich hover/tap popover
        ↓
10. Realtime synchronization
        ↓
11. E2E + race/reconnect testing
        ↓
12. Performance/accessibility polish
```

### Tiêu chuẩn cuối cùng

Không nên coi TASK-METAVERSE-STUDENT-SYNC-002 hoàn thành chỉ vì “nhìn thấy đủ 43 con”.

**Definition of Done thực sự là:**

> Với mọi trạng thái roster hợp lệ, hệ thống duy trì invariant Student ↔ Avatar = 1:1; progression quyết định state và vị trí theo rule deterministic; zone access được enforce server-side; ID/Level luôn nhất quán; detail popover đầy đủ trên desktop/mobile; realtime/reconnect không tạo divergence; và toàn bộ các invariant quan trọng đều được automated E2E/integration tests chứng minh.

Nếu Antigravity triển khai đúng theo kiến trúc này, phần Metaverse sẽ có nền tảng đủ chắc để sau đó mở rộng thêm **level progression, quest, economy, leaderboard, guild/team, seasonal events và AI NPC** mà không phải viết lại core synchronization.