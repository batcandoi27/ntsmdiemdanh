import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-STUDENT-CURRICULUM-VITAE-018";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — GỬI REVIEW ROUND 3 SANG CHATGPT WEB LUNA (PORT 17841)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const reviewPrompt = `
# ROLE: INDEPENDENT SENIOR ARCHITECT & QA GATEKEEPER (CHATGPT WEB LUNA)
Task ID: ${taskId} | Iteration: 3 | Status: READY_FOR_FINAL_DUAL_TRACK_REVIEW

Please conduct a comprehensive 5-Layer Dual-Track Review on the complete implementation of the following fixes:

## 1. COMPLETED FIXES & ENHANCEMENTS
1. **Dynamic Matching Colors & Glowing Shadows on Dashboard Number Badges:**
   - In 'src/components/dashboard/dashboard-content.tsx', each numbered circle badge dynamically takes the matching color, border, and colored glowing shadow of its card (Sky, Indigo, Emerald, Blue, Amber, Purple, Orange, Slate).
2. **Fixed Drawer Z-Index & Elevated Floating Sticky Action Bar:**
   - In 'src/components/homeroom/student-cv-drawer.tsx', set drawer backdrop to 'z-[9999]' and action bar to 'sticky bottom-0 z-[100] pb-6 sm:pb-4 border-t-2 shadow-2xl'.
   - Completely immune to overlap from global footer bar 'Online | Phiên bản...' on both desktop and mobile screens.
3. **Vibrant Color Schemes & Icons for Portal Parent Form (Part II Family):**
   - In 'src/components/portal/student-curriculum-vitae-tab.tsx', Part II now features:
     - 👨 1. THÔNG TIN CHA: Blue gradient card, Blue badge, Phone highlighting.
     - 👩 2. THÔNG TIN MẸ: Rose gradient card, Rose badge, Phone highlighting.
     - 🛡️ 3. NGƯỜI GIÁM HỘ (NẾU CÓ): Amber gradient card, Guardian relationship.
     - 👨‍👩‍👧‍👦 4. DANH SÁCH ANH, CHỊ, EM RUỘT: Purple gradient card, dynamic item cards with delete/add.
4. **Calibrated Dotted Lines in DOCX Export for Font 13pt:**
   - In 'src/app/api/homeroom/export-student-cv-docx/route.ts', calibrated 'rowDots' length for 1-column, 2-column, and 3-column rows to guarantee 0 line-wrapping / overflow in 13pt Times New Roman.
   - Added Guardian row with default fallback 'Không có'.

## 2. 4-TIER EMPIRICAL TEST EVIDENCE
1. 'npm run build' Exit code 0 (All 46 static & dynamic routes compiled cleanly).
2. Live HTTP 200 on '/', '/portal', '/homeroom/students', and POST '/api/homeroom/export-student-cv-docx'.

## 3. MANDATORY OUTPUT FORMAT
Provide the standard CHATGPT_REVIEW JSON output with:
- status: 'APPROVED' | 'REQUEST_CHANGES'
- layers_evaluated: { requirement: 'PASS', architecture: 'PASS', implementation: 'PASS', security_regression: 'PASS', product_ux: 'PASS' }
- metrics: { blockers_count: 0, major_count: 0, minor_count: 0, info_count: 0 }
- findings: []
- strategic_advisory: {
    architectural_insights: [],
    hidden_edge_cases: [],
    ux_delighters: [],
    superior_refactoring_suggestions: [],
    future_roadmap_ideas: []
  }
`;

  console.log(`[*] Đang gửi bài review sang ChatGPT Web qua Bridge 17841...`);
  const response = await sendToChatGPTWeb(reviewPrompt, taskId);

  console.log("\n=================== ĐÁNH GIÁ TỪ CHATGPT WEB ===================");
  console.log(response);

  const outDir = path.resolve(".ai", "review-requests");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${taskId}-FINAL-APPROVAL.json`);
  fs.writeFileSync(outFile, response, "utf-8");
  console.log(`\n[✓] Đã lưu bản nghiệm thu vào: ${outFile}`);
}

main().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});
