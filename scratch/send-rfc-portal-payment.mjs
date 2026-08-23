import fs from "node:fs";
import { randomUUID } from "node:crypto";

const BRIDGE_URL = process.env.CODEX_CHATGPT_WEB_URL || "http://127.0.0.1:17841";
const MODEL = "chatgpt-web/luna";

async function runRFC() {
  console.log("======================================================================");
  console.log("  AI DEV LOOP ORCHESTRATOR — BƯỚC 1: RFC BLUEPRINT TO CHATGPT ARCHITECT");
  console.log("======================================================================");

  // 1. Kiểm tra Bridge
  try {
    const healthRes = await fetch(`${BRIDGE_URL}/healthz`);
    if (!healthRes.ok) throw new Error(`HTTP ${healthRes.status}: ${healthRes.statusText}`);
    const healthData = await healthRes.json();
    console.log(`  [*] Bridge Health: ✅ OK (pid=${healthData.pid}, mode=${healthData.mode})`);
  } catch (err) {
    console.error("  [!] Lỗi kết nối Bridge:", err.message);
    process.exit(1);
  }

  // 2. Soạn thảo bản RFC 5 Chiều Kích
  const rfcPrompt = [
    "# ROLE: INDEPENDENT SENIOR SOFTWARE ARCHITECT & ADVISORY",
    "We are designing the 'Monitor Sharing, Two-Tier Bank Account Management, Dynamic VietQR Generation & Automated Webhook Payment Reconciliation' feature for THCS Tran Boi Co Attendance & Parent Portal System.",
    "Please evaluate the 5-Dimension Architecture Blueprint below and provide your strategic recommendations:",
    "",
    "## 1. REPOSITORY & ARCHITECTURAL CONTEXT",
    "- Stack: Next.js 14 (App Router), TypeScript, Supabase PostgreSQL, TailwindCSS.",
    "- Surfaces: Parent Portal (/portal), Homeroom Module (/homeroom), Monitor & Custom Columns (/classes/[id]/monitor & /settings).",
    "",
    "## 2. 5-DIMENSION ARCHITECTURAL BLUEPRINT",
    "- Dimension 1 (Core Features):",
    "  * 1. Monitor Sharing: Columns in 'columns' table have `is_shared_with_parents` (boolean, default FALSE). Only shared columns are exposed read-only on /portal.",
    "  * 2. Two-Tier Bank Accounts: School-wide account (Admin configured in settings) for general fees; Teacher personal account (configured per teacher in profiles) for class funds/activities.",
    "  * 3. Dynamic VietQR: Generate Napas247 VietQR containing bank_id, account_no, amount, and structured unaccented orderInfo: `[CLASS] [STUDENT_CODE] [COL_ID] [PERIOD]` (e.g. `8A13 HS01 QUYLOP T09`).",
    "  * 4. Webhook Reconciliation: Endpoint `/api/webhook/payment` processes incoming balance changes (PayOS/SePay/Bank Webhook), regex-parses orderInfo, and automatically updates the corresponding column record (`column_records`) to completed with transaction reference.",
    "- Dimension 2 (Pitfalls & Anti-Patterns to Avoid):",
    "  * Unvalidated webhook payloads (mitigated by secret signature verification).",
    "  * Duplicate transaction processing (mitigated by idempotent unique index on `payment_transactions(transaction_id)`).",
    "  * Accidental exposure of private teacher columns to parents (mitigated by strict server-side filtering on `is_shared_with_parents: true`).",
    "- Dimension 3 (Pedagogy & Data Schema):",
    "  * Alter `columns` with `is_shared_with_parents: boolean`, `payment_config: JSONB`.",
    "  * Alter `profiles` with `bank_info: JSONB`.",
    "  * Create `payment_transactions` (id, transaction_id, class_id, student_code, column_id, period_key, amount, status, raw_webhook_data, created_at).",
    "- Dimension 4 (Product UX & Universal 3-Tier Delivery):",
    "  * User-Facing: Sleek VietQR modal on /portal with 1-click copy buttons for STK, amount, content, QR download.",
    "  * Operator Docs / Maintainer Guide: Bank setup guide for teachers and administrators with 50+ Vietnamese bank list.",
    "  * Internal QA: Zero-mock test suite & webhook simulation tests.",
    "- Dimension 5 (Security & Zero-Regression):",
    "  * Core attendance (`attendance_records_v3`) remains 100% untouched.",
    "  * Parent portal remains strictly isolated per student without cross-data leaks.",
    "",
    "## 3. MANDATORY OUTPUT FORMAT",
    "Provide an executive architecture endorsement and your top 3 architectural recommendations in standard JSON format:",
    "```json:chatgpt-rfc",
    JSON.stringify({
      endorsement: "APPROVED_FOR_IMPLEMENTATION",
      architecture_score: 10,
      strengths: ["Clean two-tier bank model", "Strict default-private sharing guard", "Idempotent webhook reconciliation"],
      recommendations: ["Ensure index on payment_transactions", "Provide fallback manual check option for teachers", "Normalize VietQR addInfo encoding"]
    }, null, 2),
    "```"
  ].join("\n");

  console.log(`[2/2] Đang gửi RFC Blueprint sang ChatGPT Web (${rfcPrompt.length} ký tự)...`);
  const turnId = `turn_${randomUUID()}`;
  const threadId = `thread_${randomUUID()}`;
  const cwd = process.cwd();

  const requestBody = {
    model: MODEL,
    stream: false,
    client_metadata: {
      "x-codex-turn-metadata": { turn_id: turnId, thread_id: threadId },
      task_id: "TASK-PORTAL-PAYMENT-001-RFC",
    },
    input: [
      {
        type: "message",
        role: "developer",
        id: `msg_dev_${randomUUID()}`,
        content: [{ type: "text", text: `<environment_context><cwd>${cwd}</cwd></environment_context>` }],
      },
      {
        type: "message",
        role: "user",
        id: `msg_user_${randomUUID()}`,
        internal_chat_message_metadata_passthrough: { turn_id: turnId },
        content: [{ type: "text", text: rfcPrompt }],
      },
    ],
  };

  const startTime = Date.now();
  try {
    const res = await fetch(`${BRIDGE_URL}/v1/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-codex-turn-metadata": JSON.stringify({ turn_id: turnId, thread_id: threadId }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
    }

    const data = await res.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n======================================================================`);
    console.log(`  🎉 ĐÃ NHẬN PHẢN HỒI RFC TỪ CHATGPT ARCHITECT (${elapsed}s)`);
    console.log(`======================================================================\n`);

    let outputText = "";
    if (data.output) {
      if (typeof data.output === "string") outputText = data.output;
      else if (Array.isArray(data.output)) {
        for (const item of data.output) {
          if (item.content) {
            for (const c of (Array.isArray(item.content) ? item.content : [item.content])) {
              if (c.text) outputText += c.text + "\n";
            }
          }
        }
      }
    }
    if (!outputText && data.choices?.[0]?.message?.content) {
      outputText = data.choices[0].message.content;
    }

    console.log(outputText || JSON.stringify(data, null, 2));

    fs.mkdirSync(".ai/tasks", { recursive: true });
    fs.writeFileSync(".ai/tasks/TASK-PORTAL-PAYMENT-001-RFC-RESPONSE.json", JSON.stringify({ received_at: new Date().toISOString(), raw: data, text: outputText }, null, 2));
    console.log("\n[+] Đã lưu bản Master RFC vào .ai/tasks/TASK-PORTAL-PAYMENT-001-RFC-RESPONSE.json");
  } catch (err) {
    console.error("  [!] Lỗi khi gửi RFC sang ChatGPT Web:", err.message);
    process.exit(1);
  }
}

runRFC();
