import fs from "node:fs";
import path from "node:path";
import { sendToChatGPTWeb, checkBridgeHealth } from "./bridge-client.mjs";

const taskId = "TASK-STUDENT-PORTAL-REFACTOR-019";

async function main() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP — PRE-FLIGHT DUAL-AI PLANNING & MASTER SYNTHESIS");
  console.log("  NGHIÊN CỨU SÂU: REFACTOR CỔNG HỌC SINH (HUMAN-CENTERED & SAFE-BY-DESIGN)");
  console.log("======================================================================");

  const health = await checkBridgeHealth();
  if (!health.ok) {
    console.error("[!] Bridge Health Error:", health.error);
    process.exit(1);
  }
  console.log("[*] Bridge Health: OK (pid=" + health.data?.pid + ")");

  const prompt = `
# ROLE: INDEPENDENT SENIOR ARCHITECT & PRODUCT VISIONARY (CHATGPT WEB LUNA)
Task ID: ${taskId} | Mode: PRE-FLIGHT_DUAL_PLANNING_AND_DIALECTICAL_SYNTHESIS

We are initiating a foundational refactoring of the Student Portal (/student) based on the comprehensive research report 'bao_cao_cai_tien_cong_hoc_sinh_nghien_cuu_sau.docx' (incorporating Self-Determination Theory SDT, Non-punitive Gamification, Child Data Protection under Vietnam Law 91/2025/QH15, Decree 356/2025/ND-CP, UNICEF, and UNESCO AI Guidance).

## 1. RESEARCH FINDINGS TO BE REFACTORED (KEEP / MODIFY / REMOVE):
1. **REMOVE PUNITIVE DECAY & DOWN-LEVELING:**
   - Remove -2 level loss after 30 days and starvation penalties.
   - Replace with 'Welcome Back' warm return animations, soft restoration, and non-punitive pet companionship. Level is a permanent milestone.
2. **REMOVE LEARNING/SCORE BUFFS FROM FORGE & SHOP (NO PAY-TO-WIN / COSMETIC ONLY):**
   - Remove +50-120% XP / grade multipliers on furniture/forge items.
   - Item tiers (Tier 1-5) provide purely visual cosmetic effects (ambient glow, particle sparkles, unique titles, aesthetic self-expression).
3. **REFOCUS CLASSROOM WORLD & HOMES:**
   - Shift 'House Tour / Bedroom inspection' to 'Creative Study Space / Garden'.
   - Default privacy: no real-world personal location or private household info.
4. **REFACTOR TOP PODIUM & LEADERBOARDS (GROWTH OVER COMPARISON):**
   - Replace public class-wide competitive leaderboard as default home view with 'My Weekly Growth', personal progress milestones, and teacher encouragements.
5. **REVISE QUEST VERIFICATION & 4 ANCHORS (PROPORTIONAL EVIDENCE):**
   - Shift from 'AI-proof guarantee' claims to 4 proportional confidence tiers: Self-report, Form/Quiz, Artifact (when necessary), Random check.
   - Fix database default: 'physical_anchor_verified' defaults to NULL/pending (NOT TRUE).
   - Tách 'completion' khỏi 'official assessment' (score_achieved không default 10).
6. **REFACTOR CO-OP SPACESHIP (INCLUSIVE COLLECTIVE GOALS):**
   - Move away from '100% all members required to get buff' (which scapegoats struggling students).
   - Use collective milestone contributions + catch-up windows + peer appreciation.
7. **REVISE RADAR CHART & COUNSELOR BOX:**
   - Growth Compass: focuses on evidence, progress trends, and next steps instead of a composite 8.3/10 personality score.
   - Counselor Box: transparent privacy notice with explicit safety exception protocol.
8. **DATA INTEGRITY & WEBHOOK HARDENING:**
   - Replace getLastRow() with event range values.
   - Add HMAC signature, timestamp nonce, idempotency key to prevent double rewards.

## 2. DUAL-AI CONSULTATION PROTOCOL
Please provide your independent **Plan B (ChatGPT Web Luna)** and evaluate the technical **Plan A (Antigravity)** to synthesize the final **Master Consensus Plan** with the mandatory 8-column Decision Ledger:

Columns:
| ID | Category | Anti Proposal (Plan A) | ChatGPT Proposal (Plan B) | Evidence / Code Context | Main Debate | Decision (ACCEPTED/REJECTED/DEFERRED) | Origin (ANTI/CHATGPT/JOINT) | Confidence (HIGH/MED) |

Please output the complete, high-precision technical and UX blueprint.
`;

  console.log(`[*] Đang gửi bài tham vấn lập kế hoạch sang ChatGPT Web qua Bridge 17841...`);
  const response = await sendToChatGPTWeb(prompt, taskId);

  console.log("\n=================== PHẢN HỒI KẾ HOẠCH TỪ CHATGPT WEB ===================");
  console.log(response);

  const planDir = path.resolve(".ai", "plans", taskId);
  if (!fs.existsSync(planDir)) fs.mkdirSync(planDir, { recursive: true });
  fs.writeFileSync(path.join(planDir, "01-chatgpt-plan-b.md"), response, "utf-8");
  console.log(`\n[✓] Đã lưu Plan B từ ChatGPT Web vào: ${path.join(planDir, "01-chatgpt-plan-b.md")}`);
}

main().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});
