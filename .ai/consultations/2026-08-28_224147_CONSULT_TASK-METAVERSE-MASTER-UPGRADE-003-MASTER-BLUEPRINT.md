⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.# COMPREHENSIVE ARCHITECTURAL BLUEPRINT

## TASK-METAVERSE-MASTER-UPGRADE-003

Dưới đây là phương án chuẩn hóa ở mức **Senior Fullstack/Game/Enterprise Architecture**, với nguyên tắc xuyên suốt:

- Tách rõ **UI/Game State**, **Business Rules**, **Persistence**, **Authorization**.
- Không dùng `localStorage` làm nơi lưu quyền bảo mật hoặc refresh token nhạy cảm.
- Mọi quota, XP, đổi vật phẩm, token và ranking phải được **server-authoritative**.
- Metaverse 2D nên được thiết kế theo mô hình **data-driven**, không hard-code 28 nhà, thú, vật phẩm hoặc nhiệm vụ vào component.
- Các thao tác có khả năng bị spam/gian lận phải có **idempotency, audit log, transaction/concurrency control**.

* * *

# I. KIẾN TRÚC TỔNG THỂ ĐỀ XUẤT

## 1\. Logical Architecture

```
/student/*
    │
    ▼
Student Portal Shell
    ├── Global Top 3 Floating Podium
    ├── Auth / Student Context
    ├── Notification Center
    └── Route Content
             │
             ▼
Frontend Domain Modules
    ├── Metaverse 2D
    ├── Pet / Egg Evolution
    ├── Mission Bank
    ├── Evidence Upload
    ├── Rankings
    ├── House Tour
    └── Virtual Shop
             │
             ▼
Backend / BFF / API Layer
    ├── Authentication & Authorization
    ├── Student Profile Service
    ├── Mission Service
    ├── Evidence Service
    ├── Google Drive Integration Service
    ├── Evolution / Rebirth Rules Service
    ├── Ranking Service
    ├── Metaverse State Service
    ├── House / Inventory Service
    └── Audit / Anti-abuse Service
             │
             ▼
Persistence / Integrations
    ├── Relational Database
    ├── Cache / Ranking Cache
    ├── Object/File Metadata
    ├── Google OAuth / Drive
    └── Background Job / Scheduler
```

## 2\. Bounded Context đề xuất

Không nên để một bảng `students` hoặc một file service xử lý toàn bộ 9 nhóm chức năng. Chia domain thành:

| Domain | Trách nhiệm |
| --- | --- |
| Identity | User, student, lớp, giới tính, quyền |
| Student Profile | Nickname, profile metadata |
| Progression | Level, XP, evolution |
| Rebirth Rights | Quota, token, unlock/reset |
| Mission | Mission definition, weekly selection, completion |
| Evidence | Metadata, upload, review |
| Integration | Google OAuth, Drive upload |
| Ranking | Multiple leaderboard |
| Metaverse | Map, avatar/pet placement, house |
| Residential | Interior, visit, heart, achievements |
| Commerce | Catalog, inventory, purchase, equip |
| Reward | Monthly rewards, Rebirth Token |
| Audit | Immutable action history |

* * *

# II. CHI TIẾT 9 HẠNG MỤC

# 1\. GOOGLE DRIVE IN-PLACE UPLOAD & OAUTH PERSISTENT SESSION

## 1.1. Diễn giải nghiệp vụ

Học sinh:

1. Lần đầu kết nối tài khoản Google.
2. Cấp quyền cần thiết.
3. Hệ thống ghi nhận trạng thái liên kết.
4. Trong form nộp minh chứng, chọn ảnh/video.
5. Upload ngay trong `/student/...`.
6. Không bắt học sinh tự mở Google Drive, tạo file rồi copy link.
7. Sau khi upload thành công, evidence được liên kết với học sinh, nhiệm vụ và metadata hệ thống.

## 1.2. Khuyến nghị bảo mật quan trọng

Yêu cầu gốc đề xuất:

> OAuth2 / Google Apps Script Webhook Token lưu tại localStorage

Tôi **không khuyến nghị lưu persistent OAuth refresh token hoặc secret webhook token trong `localStorage`**.

Nguy cơ chính:

- XSS có thể đọc token.
- Token có thể bị lấy cắp bởi script độc hại.
- Client có thể giả mạo integration state.
- Khó revoke và audit đúng cách.

### Kiến trúc khuyến nghị

```
Student Browser
    │
    │ Connect Google
    ▼
Backend OAuth Start
    │
    ▼
Google OAuth Consent
    │
    ▼
Backend OAuth Callback
    │
    ├── encrypt/store refresh credential server-side
    └── return safe application session state
             │
             ▼
Student opens Evidence Form
             │
             ▼
POST /evidence/upload-session
             │
             ├── authorize student
             ├── validate mission
             └── create upload intent
                     │
                     ▼
Google Drive Integration
                     │
                     ▼
Evidence metadata saved
```

## 1.3. Token model

### Client

Chỉ lưu:

TypeScript

```
type GoogleIntegrationStatus = {
  connected: boolean;
  accountEmailMasked?: string;
  expiresAt?: string;
};
```

Nếu cần access token phía client cho upload trực tiếp thì dùng **short-lived token**, không dùng refresh token.

### Server

Lưu:

```
google_account_connections
- id
- user_id
- provider
- provider_account_id
- encrypted_refresh_token
- granted_scopes
- status
- last_refresh_at
- revoked_at
- created_at
- updated_at
```

Refresh token phải được mã hóa bằng KMS/secret encryption strategy phù hợp.

## 1.4. API đề xuất

```
GET  /api/integrations/google/status
POST /api/integrations/google/connect
GET  /api/integrations/google/callback
POST /api/integrations/google/disconnect

POST /api/evidence/upload-intents
POST /api/evidence
GET  /api/evidence/:id
```

## 1.5. Upload contract

TypeScript

```
type CreateEvidenceUploadIntentRequest = {
  missionId: string;
  files: Array<{
    name: string;
    mimeType: string;
    size: number;
  }>;
};

type EvidenceFile = {
  fileId: string;
  provider: "google_drive";
  providerFileId: string;
  mimeType: string;
  size: number;
  checksum?: string;
};

type EvidenceMetadata = {
  evidenceId: string;
  studentId: string;
  missionId: string;
  submittedAt: string;
};
```

## 1.6. Google Apps Script

Nếu đã tồn tại Apps Script webhook, nên coi nó là **integration adapter**, không phải nguồn xác thực chính.

Không để client gọi webhook bằng static secret:

```
Browser -> Apps Script secret webhook
```

Ưu tiên:

```
Browser -> Application Backend -> Verified Integration Adapter
```

Backend ký request hoặc dùng server-to-server authentication.

## Acceptance Criteria

-  Học sinh có thể kết nối Google từ portal.
-  Không cần mở tab Google Drive để upload thủ công.
-  Upload ảnh/video thành công và evidence có metadata student/mission.
-  Refresh credential không nằm trong `localStorage`.
-  Có trạng thái reconnect khi quyền Google bị revoke.
-  File không thể bị gắn sang student khác bằng cách sửa request.
-  Upload retry không tạo evidence trùng ngoài ý muốn.

* * *

# 2\. CHUẨN HÓA NHÃN ĐỊNH DANH TRỰC QUAN

## Requirement chuẩn hóa

Hiện tại:

```
8A13_XX • Lv.7
```

Mới:

```
8A13_XX
```

Level phải chuyển sang:

- Badge.
- Tooltip.
- Inspect panel.
- Profile card.

## Data/UI model

TypeScript

```
type MapEntityVisual = {
  displayCode: string; // 8A13_XX
  level: number;
  levelBadge: {
    visible: boolean;
    text: string;
  };
};
```

## Rendering

```
Entity
 ├── Character/Pet SVG
 ├── Gender decoration
 ├── Level Badge
 └── Bottom Name Label
        └── 8A13_XX
```

Không concatenate UI text như:

TypeScript

```
`${student.code} • Lv.${level}`
```

Nên có hai field rendering độc lập.

## Acceptance Criteria

-  Nhãn dưới chân chỉ hiển thị mã định danh.
-  Không còn `• Lv.Y` trong map label.
-  Level vẫn truy cập được qua badge/tooltip.
-  Không làm thay đổi identifier dùng trong API/database.

* * *

# 3\. QUOTA SỬA ĐỔI & REBIRTH TOKEN

Đây là một domain quan trọng và cần **server-authoritative state machine**.

## 3.1. Rule Matrix

| Thuộc tính | Quy tắc |
| --- | --- |
| Nickname | Đặt một lần |
| Evolution Branch | Tối đa 3 lần sửa |
| Egg Color | Tối đa 1 lần/tháng |
| Rebirth Token | Dùng để cấp/reset quyền sửa theo chính sách |
| Hết quota | Locked |
| Token reward | Đạt thành tích/nhiệm vụ tháng |

## 3.2. Không dùng frontend counter

Sai:

TypeScript

```
localStorage.evolutionChanges++
```

Vì học sinh có thể xóa/sửa browser storage.

Đúng:

```
PATCH request
    │
    ▼
Backend Rule Engine
    │
    ├── lock row/state
    ├── calculate current quota
    ├── validate period
    ├── consume quota/token transactionally
    ├── apply mutation
    └── append audit log
```

## 3.3. Data model

```
student_customization_state
- student_id PK
- nickname
- nickname_initialized_at
- evolution_branch
- evolution_change_count
- egg_color
- egg_color_period_key
- egg_color_change_count
- version
- updated_at
```

```
student_rebirth_wallet
- student_id PK
- available_tokens
- lifetime_earned
- lifetime_consumed
- updated_at
```

```
rebirth_token_ledger
- id
- student_id
- direction: EARN | CONSUME | ADJUST
- amount
- source_type
- source_id
- idempotency_key
- created_at
```

```
student_customization_audit
- id
- student_id
- field
- old_value
- new_value
- quota_before
- quota_after
- token_consumed
- reason
- created_at
```

## 3.4. Nickname state

```
UNINITIALIZED
    │
    └── set nickname
          │
          ▼
INITIALIZED_LOCKED
```

Không cho "đổi nickname" thông thường.

Nếu tương lai Rebirth Token được phép reset nickname, phải là policy riêng:

```
INITIALIZED_LOCKED
    │
    └── consume valid rebirth policy
          │
          ▼
SPECIAL_RESET_GRANTED
```

Không nên mặc định rằng một token mở tất cả mọi field. Cần có `rebirth_policy`.

## 3.5. Rebirth Policy

TypeScript

```
type RebirthPolicy = {
  code: string;
  target: "EVOLUTION" | "EGG_COLOR" | "NICKNAME";
  effect: "RESET_QUOTA" | "ADD_QUOTA" | "UNLOCK_ONCE";
  tokenCost: number;
};
```

Điều này giúp sau này thay đổi game economy mà không migrate logic lớn.

## 3.6. Monthly reset

Egg color phải dựa vào server period:

```
period_key = 2026-08
```

Khi đổi:

```
egg_color_change_count = 1
egg_color_period_key = current_month
```

Request tháng mới tự tính quota mới, thay vì cron bắt buộc reset toàn bộ.

## Acceptance Criteria

-  Nickname chỉ khởi tạo một lần.
-  Evolution branch tối đa 3 lần theo policy.
-  Egg color tối đa một lần trong cùng tháng.
-  Không thể bypass quota bằng refresh/devtools.
-  Token được consume atomically.
-  Không xảy ra double-spend khi click hai lần.
-  Mọi thay đổi có audit trail.

* * *

# 4\. LEVEL 1 BASELINE & GENDER SVG

## 4.1. Quy tắc khởi tạo

Khi sinh metaverse instance cho lớp:

```
number_of_students == number_of_pet_or_egg_entities
```

Mỗi student:

```
level = 1
xp = 0
```

Không random level.

## 4.2. Provisioning idempotent

Cần tránh:

- reload tạo thêm trứng.
- chạy job lần hai nhân đôi entity.

Dùng unique constraint:

```
UNIQUE(world_id, student_id)
```

Pseudo-flow:

```
FOR each active student:
    INSERT metaverse_entity(world_id, student_id, level=1)
    ON CONFLICT DO NOTHING
```

## 4.3. Gender visual strategy

Database:

TypeScript

```
type Gender = "male" | "female";
```

Không để frontend tự đoán từ tên.

```
Student.gender
      │
      ▼
Avatar Visual Resolver
      │
      ├── male visual preset
      └── female visual preset
```

Ví dụ:

TypeScript

```
type VisualPreset = {
  accessoryLayer?: string;
  auraLayer?: string;
  ornamentLayer?: string;
};
```

Quan trọng: chỉ thay đổi presentation layer, không làm gender ảnh hưởng XP/ranking/gameplay.

## SVG layer order

```
Layer 1: Shadow
Layer 2: Pet/Egg body
Layer 3: Evolution features
Layer 4: Gender accessory
Layer 5: Aura/effects
Layer 6: Level badge
Layer 7: Name label
```

## Acceptance Criteria

-  100% học sinh mới là Level 1.
-  Số entity đúng bằng số học sinh active theo snapshot khởi tạo.
-  Không có duplicate entity khi provision lại.
-  Gender lấy từ DB.
-  Visual nam/nữ tinh tế, có thể thay đổi bằng configuration.
-  Không thay đổi game stat theo gender.

* * *

# 5\. GLOBAL TOP 3 & MULTI-RANKING

## 5.1. Portal Shell

`Top 3 Floating Podium` không nên copy vào từng page.

```
StudentPortalLayout
    ├── Header
    ├── Top3FloatingPodium
    ├── Sidebar/Mobile Nav
    └── <Outlet />
```

Áp dụng:

```
/student
/student/metaverse
/student/missions
/student/ranking
/student/shop
...
```

## 5.2. Ranking categories

TypeScript

```
type RankingCategory =
  | "XP"
  | "STREAK"
  | "MISSIONS_COMPLETED"
  | "DISCIPLINE";
```

Nên thêm period:

TypeScript

```
type RankingPeriod =
  | "WEEK"
  | "MONTH"
  | "SEMESTER"
  | "ALL_TIME";
```

## 5.3. Score snapshots

Không nên mỗi render chạy query aggregate toàn bộ bảng lịch sử.

Dùng:

```
ranking_snapshots
- period_key
- category
- student_id
- rank
- score
- calculated_at
```

Top 3 global cache:

```
ranking:top3:{classId}:{category}:{periodKey}
```

## 5.4. Định nghĩa chính xác metric

### XP

```
SUM(approved_xp_events)
```

### Streak

```
max/current consecutive valid active days
```

Phải định nghĩa timezone.

### Mission Completed

```
COUNT(approved mission completions)
```

### Discipline

Nên lấy từ bảng điểm nề nếp đã được approved, không lấy trực tiếp client.

## 5.5. Tie-breaking

Phải xác định trước:

```
1. Score DESC
2. Earlier achievement timestamp ASC
3. Stable student ID ASC
```

Tránh ranking nhảy lung tung khi bằng điểm.

## Acceptance Criteria

-  Top 3 hiển thị tại tất cả `/student/*`.
-  Không tạo nhiều duplicate network request trên mỗi route.
-  Có đủ 4 tab ranking.
-  Metric có định nghĩa backend thống nhất.
-  Ranking có tie-break deterministic.
-  Cache không làm hiển thị nhầm lớp.

* * *

# 6\. NGÂN HÀNG NHIỆM VỤ & QUY TẮC 1 NHIỆM VỤ/NHÓM/TUẦN

## 6.1. Five categories

```
LEARNING
LIFE_HABIT
SOCIAL_COMMUNICATION
CRITICAL_THINKING
SURVIVAL_SKILLS
```

## 6.2. Mission definition

```
mission_definitions
- id
- code
- category
- title
- description
- difficulty
- xp_reward
- evidence_required
- active
- version
```

Nên version hóa mission để thay đổi mô tả không phá lịch sử cũ.

## 6.3. Weekly selection rule

Unique invariant:

```
UNIQUE(student_id, week_key, category)
```

Đây là lớp bảo vệ database quan trọng nhất.

Luồng:

```
Student selects mission
      │
      ▼
Backend determines week_key
      │
      ├── already selected category this week?
      │       └── yes => reject
      │
      └── no => create weekly assignment
```

Không chỉ disable button ở frontend.

## 6.4. Week definition

Phải chốt:

- ISO week?
- Monday 00:00 đến Sunday 23:59?
- Timezone nào?

Khuyến nghị:

```
School timezone = Asia/Ho_Chi_Minh
Week = Monday 00:00 → Sunday 23:59:59
```

## 6.5. Mission lifecycle

```
AVAILABLE
  ↓
SELECTED
  ↓
IN_PROGRESS
  ↓
EVIDENCE_SUBMITTED
  ↓
APPROVED ───────► REWARDED

or

REJECTED ───────► RESUBMISSION_POLICY
```

## Acceptance Criteria

-  Có mission phong phú cho đủ 5 nhóm.
-  Mỗi học sinh mỗi tuần chỉ có tối đa 1 mission/category.
-  Không bypass được bằng simultaneous requests.
-  Backend xác định tuần theo timezone trường.
-  Lịch sử selection không mất khi mission definition thay đổi.

* * *

# 7\. RESIDENTIAL HOUSE TOUR MODAL

## 7.1. Interaction

```
Metaverse Map
    │
    ▼
Click House Tile
    │
    ▼
GET House Public Profile
    │
    ▼
House Tour Modal
    ├── Room Scene
    ├── Furniture
    ├── Pet Collection
    ├── Achievement Trophies
    └── ❤️ Visit / Heart
```

## 7.2. Privacy model

Không nên trả toàn bộ thông tin chủ nhà.

Public DTO:

TypeScript

```
type PublicHouseTour = {
  studentCode: string;
  houseTheme: string;
  room: RoomState;
  visibleFurniture: FurnitureItem[];
  visiblePets: PetSummary[];
  visibleAchievements: AchievementSummary[];
  heartCount: number;
  viewerHasHearted: boolean;
};
```

Không trả:

- email.
- thông tin phụ huynh.
- private submission.
- internal IDs nhạy cảm.
- private evidence links.

## 7.3. Heart model

```
house_hearts
- house_id
- visitor_student_id
- created_at

UNIQUE(house_id, visitor_student_id)
```

Để một học sinh chỉ thả tim một lần nếu đó là rule.

Nếu muốn daily heart:

```
UNIQUE(house_id, visitor_student_id, period_key)
```

## 7.4. Visit tracking

```
house_visits
- id
- house_id
- visitor_id
- visited_at
- source
```

Nên rate limit để tránh spam analytics.

## Acceptance Criteria

-  Click đúng bất kỳ house tile hợp lệ nào mở modal.
-  Nội dung tải theo chủ nhà thực tế.
-  Không lộ private student data.
-  Heart idempotent.
-  Furniture/pet/trophy lấy từ state database.
-  Modal hoạt động tốt mobile.

* * *

# 8\. BỎ YÊU CẦU GIẤY GHI BÍ DANH

## Business change

Loại bỏ hoàn toàn requirement:

```
"Ảnh phải có mảnh giấy ghi bí danh"
```

Thay bằng trusted metadata:

```
Evidence
├── evidence_id
├── student_id
├── mission_id
├── submitted_at
├── file_id
├── class_id
└── reviewer_status
```

## UI

Trước:

```
⚠ Hãy chụp ảnh cùng giấy ghi bí danh
```

Sau:

```
Upload ảnh/video minh chứng nhiệm vụ.
Hệ thống tự động liên kết bài nộp với tài khoản học sinh.
```

## Teacher lookup

Teacher dashboard:

```
Evidence
  → Student code
  → Student name / permitted identity
  → Class
  → Mission
  → Submission time
  → Review status
```

## Integrity improvement

Không yêu cầu nickname trong ảnh không có nghĩa là evidence hoàn toàn chống giả mạo.

Nên có:

- file metadata/checksum.
- upload timestamp.
- provider file ID.
- immutable submission record.
- optional teacher review.
- optional duplicate-file detection trong tương lai.

## Acceptance Criteria

-  Không còn validation yêu cầu giấy ghi nickname.
-  Evidence tự liên kết đúng student.
-  Giáo viên tra cứu được người nộp.
-  Không thể sửa `studentId` client-side để giả mạo bài người khác.

* * *

# 9\. VIRTUAL SHOP EXPANSION

## Categories

```
FURNITURE
├── BED
├── DESK
├── RUG
└── WALL_ART

ACCESSORY
├── WITCH_HAT
├── DRAGON_WINGS
└── SUNGLASSES

WALLPAPER
MAGIC_NEON_LIGHT
```

Không hard-code toàn bộ item vào component switch-case.

## Catalog model

```
shop_items
- id
- sku
- category
- subcategory
- name
- description
- price_currency
- price_amount
- asset_key
- rarity
- active
- stackable
- equippable
```

## Inventory

```
student_inventory
- id
- student_id
- item_id
- quantity
- acquired_at
- source
```

## Purchase transaction

```
Validate item active
      │
Check balance
      │
BEGIN TRANSACTION
      ├── debit wallet
      ├── grant inventory
      ├── append purchase ledger
      └── COMMIT
```

Không thực hiện:

```
frontend: coins -= price
frontend: inventory.push(item)
```

là authoritative state.

## Placement/equipment

```
house_placements
- house_id
- inventory_item_id
- x
- y
- rotation
- z_index
```

```
student_equipped_items
- student_id
- slot
- inventory_item_id
```

## Validation

Backend kiểm tra:

- item thuộc inventory.
- item có thể equip vào slot đó.
- furniture placement thuộc house bounds.
- không place item vào nhà người khác.

## Acceptance Criteria

-  Catalog có các category yêu cầu.
-  Item data-driven.
-  Mua hàng atomic.
-  Không double-spend currency.
-  Không thể equip item chưa sở hữu.
-  Furniture placement persist sau reload.
-  Asset có fallback nếu SVG/image lỗi.

* * *

# III. ĐỀ XUẤT DATABASE CORE

Các bảng/domain cốt lõi:

```
users
students
classes
student_profiles

student_progress
student_customization_state
student_customization_audit

student_rebirth_wallet
rebirth_token_ledger
rebirth_policies

google_account_connections
evidence_files
evidence_submissions

mission_categories
mission_definitions
student_weekly_missions
mission_completions

ranking_snapshots
xp_events
discipline_events

metaverse_worlds
metaverse_entities
houses
house_rooms
house_placements
house_hearts
house_visits

shop_items
student_inventory
student_wallets
wallet_ledger
student_equipped_items

achievements
student_achievements

audit_logs
```

Các bảng ledger/audit nên ưu tiên append-only.

* * *

# IV. MASTER EXECUTION PLAN

## PHASE 0 — ARCHITECTURE & BASELINE AUDIT

### Mục tiêu

Khảo sát implementation hiện có và xác định:

- route `/student/*`.
- auth/session hiện tại.
- schema student/gender/class.
- mission flow.
- upload/evidence flow.
- metaverse rendering engine.
- existing shop/inventory.
- ranking calculation.
- database migration strategy.

### Deliverables

- Architecture map.
- Current-state inventory.
- Gap analysis 9 requirements.
- API contract inventory.
- Data migration plan.
- Risk register.

### Acceptance

-  Không có feature mới được implement trước khi xác định ownership domain.
-  Mỗi requirement map tới frontend/backend/database.
-  Xác định breaking changes.

* * *

## PHASE 1 — FOUNDATION & DATA MIGRATIONS

### Atomic work

1. Chuẩn hóa `gender`.
2. Thêm progression Level 1 baseline.
3. Tạo customization quota tables.
4. Tạo Rebirth wallet/ledger.
5. Tạo mission weekly constraint.
6. Chuẩn hóa house/inventory schema.
7. Thêm audit/ledger infrastructure.

### Critical migrations

```
migration_001_student_progress_baseline
migration_002_customization_quota
migration_003_rebirth_ledger
migration_004_weekly_mission_unique_constraint
migration_005_house_social
migration_006_shop_catalog_expansion
```

### Acceptance

-  Migration rerun-safe.
-  Unique constraints hoạt động.
-  Existing data không mất.
-  Rollback strategy được xác định.

* * *

## PHASE 2 — BUSINESS RULE ENGINE

### Implement

- Nickname one-time initialization.
- Evolution quota = 3.
- Monthly egg color quota.
- Rebirth policy.
- Token earn/consume.
- Weekly mission selection.
- Level baseline provisioning.

### Testing

- Unit test từng rule.
- Concurrent mutation tests.
- Month boundary tests.
- Week boundary tests.
- Double token consume tests.

### Acceptance

-  Frontend không quyết định quota.
-  DB invariant bảo vệ concurrent requests.
-  Audit đầy đủ.

* * *

## PHASE 3 — GOOGLE INTEGRATION & EVIDENCE PIPELINE

### Implement

- OAuth connect.
- Callback.
- Persistent server-side connection.
- Upload intent.
- Drive upload adapter.
- Evidence persistence.
- Disconnect/reconnect.
- Remove nickname-paper validation.

### Test cases

```
TC-G01 First connect
TC-G02 Reopen portal with valid connection
TC-G03 Permission revoked
TC-G04 Upload image
TC-G05 Upload video
TC-G06 Retry upload
TC-G07 Student attempts cross-student evidence access
```

### Acceptance

-  In-place upload hoàn chỉnh.
-  Không cần thao tác Drive thủ công.
-  Sensitive credential không ở localStorage.

* * *

## PHASE 4 — METAVERSE CORE UPGRADE

### Implement

1. Level 1 provisioning.
2. One student ↔ one entity.
3. Gender visual resolver.
4. Simplified bottom labels.
5. Level badge/tooltip.
6. House click interaction.

### Acceptance

-  Map entity count chính xác.
-  Re-render không tạo duplicate.
-  Label đúng `8A13_XX`.
-  Gender SVG layer hoạt động.

* * *

## PHASE 5 — HOUSE TOUR & SOCIAL

### Implement

- Public house profile.
- House Tour modal.
- Room/furniture rendering.
- Pet collection.
- Achievement trophies.
- Visit.
- Heart.

### Acceptance

-  28 house slots hoặc số slot cấu hình được đều có interaction hợp lệ.
-  Privacy filtering server-side.
-  Heart không bị spam/double-count.

* * *

## PHASE 6 — MISSION BANK EXPANSION

### Implement

- Seed nhiều mission cho 5 categories.
- Mission admin/content configuration.
- Weekly picker.
- One-per-category-per-week enforcement.
- Evidence workflow.

### Content recommendation

Mỗi category nên có tối thiểu nhiều difficulty tiers:

```
Easy
Medium
Hard
Epic / Challenge
```

Ví dụ không nên chỉ thêm nhiều nhiệm vụ giống nhau; cần diversity theo:

- evidence type.
- duration.
- individual/social.
- indoor/outdoor.
- recurring/one-off.
- skill dimension.

### Acceptance

-  Đủ 5 category.
-  Selection rule enforced backend.
-  Mission bank dễ mở rộng không sửa core code.

* * *

## PHASE 7 — RANKING & GLOBAL TOP 3

### Implement

- Ranking aggregation.
- Snapshot/cache.
- XP tab.
- Streak tab.
- Mission tab.
- Discipline tab.
- Portal-level floating podium.

### Acceptance

-  Có mặt trên toàn bộ `/student/*`.
-  Ranking thống nhất với source events.
-  Không aggregate nặng mỗi route render.
-  Tie-break deterministic.

* * *

## PHASE 8 — VIRTUAL SHOP EXPANSION

### Implement

- Catalog categories.
- New assets.
- Purchase.
- Wallet ledger.
- Inventory.
- Equip.
- House placement.
- Wallpaper/neon rendering.

### Acceptance

-  Mọi item mới có SKU/data record.
-  Không hard-code ownership.
-  Purchase atomic.
-  Placement persist.

* * *

## PHASE 9 — INTEGRATION, QA & HARDENING

## E2E critical journeys

### Journey A — New Student

```
Create student
→ gender loaded
→ Level 1
→ one pet/egg
→ nickname initialize
→ map label
→ house available
```

### Journey B — Mission

```
Select 1 mission/category
→ submit evidence
→ Google Drive upload
→ metadata auto attached
→ teacher review
→ XP reward
→ ranking updated
```

### Journey C — Customization

```
Change evolution
→ quota decrements
→ repeat until locked
→ earn Rebirth Token
→ consume under policy
→ change allowed
```

### Journey D — Social

```
Open house
→ inspect furniture/pets/trophies
→ heart
→ revisit
→ idempotent state
```

### Journey E — Shop

```
Buy item
→ currency debit
→ inventory grant
→ equip/place
→ reload
→ state preserved
```

### Journey F — Ranking

```
Complete mission
→ XP event
→ aggregation
→ ranking
→ global Top 3
→ visible across student routes
```

* * *

# V. PRIORITY ORDER

## P0 — Data Integrity / Security

1. OAuth architecture.
2. Server-side token storage.
3. Evidence authorization.
4. Quota engine.
5. Rebirth token ledger.
6. Mission weekly unique constraint.
7. Wallet/purchase atomicity.

**Không nên release feature UI trước khi các invariant này được bảo vệ.**

## P1 — Core Product

1. Level 1 baseline.
2. One student-one entity.
3. Gender visuals.
4. Label cleanup.
5. Google in-place upload.
6. Mission expansion.
7. Ranking/Top 3.

## P2 — Engagement

1. House Tour.
2. Hearts/visits.
3. Shop expansion.
4. Advanced house decoration.

## P3 — Optimization

1. Ranking cache.
2. Background aggregation.
3. Asset lazy loading.
4. SVG atlas/optimization.
5. Analytics.
6. Anti-abuse heuristics.

* * *

# VI. DEFINITION OF DONE TOÀN DỰ ÁN

Master Upgrade chỉ được coi là hoàn thành khi đồng thời đạt:

### Functional

-  Hoàn thành toàn bộ 9 yêu cầu.
-  Tất cả rule quota chạy backend.
-  Google upload in-place hoạt động.
-  Level khởi tạo đồng nhất = 1.
-  Số entity không lệch số học sinh.
-  Gender visual đúng database.
-  Top 3 global trên toàn `/student/*`.
-  4 loại ranking hoạt động.
-  1 mission/category/week được enforce.
-  House Tour hoạt động.
-  Evidence không cần giấy nickname.
-  Shop categories mới hoạt động.

### Data Integrity

-  Không duplicate metaverse entity.
-  Không double-spend Rebirth Token.
-  Không double-spend currency.
-  Không bypass quota bằng client.
-  Không bypass weekly mission rule.
-  Audit được các mutation quan trọng.

### Security

-  Không lưu refresh token nhạy cảm trong `localStorage`.
-  OAuth credentials được bảo vệ server-side.
-  Evidence access authorization đúng.
-  House Tour không lộ private student data.
-  API ownership được kiểm tra server-side.

### Performance

-  Ranking không query aggregate nặng mỗi render.
-  Metaverse không reload toàn bộ world khi thay đổi một entity.
-  Asset loading được lazy/cache hợp lý.
-  Top 3 không gây request storm khi đổi route.

* * *

# VII. QUYẾT ĐỊNH KIẾN TRÚC QUAN TRỌNG NHẤT

Tôi đề xuất chốt 6 quyết định trước khi bắt đầu implementation:

1. **Google OAuth refresh credentials chỉ tồn tại dưới dạng bảo vệ phía server**, không persistent raw token trong `localStorage`.
2. **Quota, Rebirth Token, currency và mission limit là server-authoritative**.
3. **Database unique constraints là lớp bảo vệ cuối cùng** cho `1 mission/category/week` và các ownership invariant.
4. **Metaverse dùng data-driven entity/asset configuration**, không hard-code số học sinh, nhà, thú hay item.
5. **Ranking dùng event/snapshot/cache architecture**, không tính lại toàn bộ mọi thứ ở từng page.
6. **Mọi economy mutation dùng transaction + immutable ledger/audit**.

Kiến trúc này cho phép triển khai theo từng phase mà vẫn giữ được khả năng mở rộng về sau: thêm evolution branch, loại Rebirth Token, category nhiệm vụ, map lớp, vật phẩm, ranking season hoặc các cơ chế xã hội mà không phải viết lại nền tảng.