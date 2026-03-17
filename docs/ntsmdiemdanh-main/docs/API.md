# API Documentation – App Điểm Danh v3.0

## Authentication

Mỗi request cần 1 trong 2:
- **API Key**: Header `X-API-Key: <key>` (tạo trong Settings → API)
- **Bearer Token**: Header `Authorization: Bearer <firebase_id_token>`

Rate limit: **100 requests/phút/IP**

---

## Endpoints

### GET /api/v1/classes
Danh sách lớp (lọc theo quyền user).

**Response:**
```json
{ "success": true, "data": [{ "id": "8A13", "className": "8A13", ... }] }
```

---

### GET /api/v1/classes/{id}/students
Danh sách HS của lớp.

**Response:**
```json
{ "success": true, "data": [{ "id": "...", "fullName": "Nguyễn Văn A", "order": 1, ... }] }
```

---

### GET /api/v1/attendance/{date}/{classId}
Điểm danh 1 lớp 1 ngày. Chỉ trả records ngoại lệ (vắng/trễ/phép).

**Params:** `?session=morning` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-25",
    "classId": "8A13",
    "recordCount": 3,
    "note": "Chỉ hiện records ngoại lệ. HS không có record = có mặt.",
    "records": [{ "studentId": "...", "status": "absent", ... }]
  }
}
```

---

### GET /api/v1/export/json
Export dữ liệu toàn trường (Admin only).

**Params:**
- `?classes=true` (default)
- `?students=true` (default)
- `?timetables=true`
- `?attendance=true`

---

## Error Format
```json
{ "success": false, "error": "Mô tả lỗi" }
```

## Status Codes
| Code | Ý nghĩa |
|------|---------|
| 200 | OK |
| 400 | Bad Request |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 429 | Rate limited |
| 500 | Server error |
