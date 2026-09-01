⚠️ ChatGPT Web Luna cannot access the local Codex computer in this turn. The accumulated context does not contain local tool results yet: it will see instructions and attachments, but not workspace contents. ChatGPT-native capabilities such as web search remain available when the product provides them. This installation is in Browser-only mode. Open MCP in the launcher and connect the Full harness to give Instant through Extra High access to local tools.Đã xác thực về mặt kiến trúc: **Canonical Sprite Transform Matrix là hướng sửa đúng** và giải quyết đúng root cause được mô tả.

### Công thức canonical

Với vật phẩm có kích thước gốc `canonicalWidth × canonicalHeight`, geometry **không được thay đổi kích thước theo footprint sau rotation**.

Nên dùng:

XML

```
<g transform="translate(${px + footprintWidth/2}, ${py + footprintHeight/2})
               rotate(${rotation})
               translate(${-canonicalWidth/2}, ${-canonicalHeight/2})">
  <!-- geometry luôn dùng canonicalWidth x canonicalHeight -->
</g>
```

Ví dụ bàn `2×1`:

- `rotation = 0°` → footprint `2×1`
- `rotation = 90°/270°` → footprint `1×2`
- Geometry vẫn luôn được render bằng kích thước canonical `2×1`.
- Chỉ transform matrix chịu trách nhiệm xoay.
- Selection/dashed box phải lấy từ **rotated footprint**, không lấy từ kích thước geometry đã bị mutate.

### Các invariant cần giữ

1. **Canonical dimensions bất biến** trong quá trình render.
2. `footprintWidth/footprintHeight` chỉ dùng để xác định bounding box/vị trí sau rotation.
3. Không truyền `60×120` vào component geometry chỉ vì footprint hiện tại là `1×2`.
4. Không vừa swap `width/height` cho geometry **vừa** `rotate(90)`.
5. Tâm rotation phải trùng tâm footprint/occupied cell.
6. Selection box và sprite phải sử dụng cùng một coordinate convention.
7. Nên normalize rotation về `0/90/180/270` nếu furniture chỉ hỗ trợ rotation theo 90°.

### Điểm cần đặc biệt kiểm thử

Không chỉ test `90°`; cần test toàn bộ chu kỳ:

| Rotation | Canonical geometry | Expected footprint |
| --- | --- | --- |
| 0° | W × H | W × H |
| 90° | W × H | H × W |
| 180° | W × H | W × H |
| 270° | W × H | H × W |

Đặc biệt nên assert rằng **SVG geometry bounding box không bị thay đổi bởi việc swap footprint dimensions trước khi transform** và rằng sprite luôn nằm hoàn toàn trong selection bounding box.

**Kết luận:** Tôi đồng ý cho Antigravity triển khai theo canonical-transform approach. Tuy nhiên, trong phiên này tôi **không có quyền truy cập filesystem/local Codex process**, nên không thể tự sửa code hoặc tuyên bố đã chạy test tự động. Việc triển khai thực tế cần áp dụng công thức trên vào renderer hiện tại và chạy regression tests của project.