import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-RICH-FURNITURE-SVG-PET-007";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — THAM VẤN CHATGPT WEB (RICH SVG FURNITURE ARTWORK & LIVE PET IN ROOM)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const consultPrompt = `
# ROLE: SENIOR 2D GAME ARTIST & VECTOR GRAPHICS ARCHITECT
Task ID: ${taskId}
Topic: NÂNG CẤP ĐỒ HỌA VECTOR SVG CHI TIẾT TỪNG MÓN NỘI THẤT & HIỂN THỊ LINH VẬT SVGPET SỐNG ĐỘNG TRONG PHÒNG

Kính gửi Senior Architect,

Người dùng gửi phản hồi:
"mịa sao không thấy được hình dạng món đồ vậy ? - liệu có thể dùng hình ảnh svg hay gì cho đẹp hơn ko ? tôi muốn nhìn rõ món đồ  ngôi nhà thì linh vật luôn hiện ở chế độ 2D hoặc 3D cho đẹp"

---

## PHÂN TÍCH YÊU CẦU ĐỒ HỌA:
1. **Thay thế toàn bộ khối hình chữ nhật & emoji đơn điệu bằng Bộ Đồ Họa Vector SVG Chi Tiết Cao:**
   - **Giường ngủ (Bed):** Vẽ rõ thành giường gỗ sồi/cyber, đệm êm, 2 gối trắng có bóng đổ, chăn gấp có nếp nhăn và đổi màu theo palette.
   - **Bàn học & Bàn làm việc (Desk/Table):** Vẽ mặt bàn có máy tính laptop mở màn hình sáng, tập sách vở mở, cốc cà phê bốc khói.
   - **Ghế Sofa / Ghế Gaming (Gaming Sofa):** Vẽ đệm ngồi êm ái, lưng tựa gaming cong vút, tay vịn sắc nét.
   - **Tủ sách (Bookshelf):** Vẽ ngăn kệ gỗ chứa các cuốn sách bìa màu sắc xếp hàng và bình hoa nhỏ.
   - **Thảm lông (Carpet/Rug):** Vẽ hoa văn thảm dệt tinh xảo, tua rua mép thảm, dải màu gradient sang trọng.
   - **Đèn neon (Neon Lamp):** Chao đèn phát sáng, tỏa luồng ánh sáng radial quang học ấm áp.
   - **Cây tri thức (Magic Tree):** Tán lá phân tầng có bóng đổ, hoa quả phát sáng và chậu cây sứ.
2. **Linh Vật SvgPet Luôn Hiển Thị Sống Động Ở Tâm Phòng:**
   - Thay thế vòng tròn chữ bằng component **\`SvgPet\` thực tế** đặt trên Bục đá cổ (Pedestal) phát sáng hào quang aura ma thuật, hiển thị đúng cấp độ, hình thái và nơ/sao giới tính.

Kính nhờ Senior Architect:
1. Đưa ra hướng dẫn thiết kế Vector SVG chi tiết cho từng loại vật phẩm.
2. Xác lập Execution Plan để Antigravity triển khai code và kiểm thử tự động.
`;

  console.log(`[*] Đang gửi yêu cầu tham vấn (${consultPrompt.length} ký tự) sang ChatGPT Web...`);
  const response = await sendToChatGPTWeb(consultPrompt, taskId);

  console.log("\n=================== PHẢN HỒI THIẾT KẾ TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "consultations");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-BLUEPRINT.md`);
  fs.writeFileSync(outFile, typeof response === "string" ? response : JSON.stringify(response, null, 2), "utf8");
  console.log(`[+] Đã lưu bản thiết kế tại: ${outFile}`);
}

main().catch(err => {
  console.error("[!] Lỗi thực thi:", err);
  process.exit(1);
});
