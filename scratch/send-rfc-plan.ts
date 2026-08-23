import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "path";

async function sendRfcToChatGPT() {
  console.log("=== GỬI RFC / KẾ HOẠCH NÂNG CẤP SANG CHATGPT WEB ARCHITECT ===");

  const turnId = `turn_${randomUUID()}`;
  const threadId = `thread_${randomUUID()}`;
  const cwd = process.cwd();

  const planContent = readFileSync("C:/Users/BCD/.gemini/antigravity-ide/brain/ef5b5fdb-bbf1-48df-b40d-2738f16d3a41/implementation_plan.md", "utf8");

  const prompt = [
    "# ROLE: INDEPENDENT SENIOR ARCHITECT & PRODUCT REVIEWER",
    "Review and evaluate this RFC & Implementation Plan for UX/UI & Functional Enhancements on Homeroom Module & Parent Portal for ntsmdiemdanh.",
    "",
    "## 1. USER FEEDBACK & PROBLEMS IDENTIFIED",
    "1. Header Overlap Bug: Main site header overlaps sub-navigation causing text clipping on 'TRẦN BỘI CƠ'.",
    "2. Theme Discrepancy: Dark theme in /homeroom and /portal clashes with the light theme of the main school app.",
    "3. Raw UUID Exposure: Class UUID '80a9c205-6a5c-4907-9d3a-0bce524c1209' displayed in student drawer instead of friendly class name (e.g. 'Lớp 6A1').",
    "4. Missing Auto-Fill Presets: Need 1-click preset chips for event logging (+/- points, conduct violations, positive deeds), weekly tasks, and handbook descriptions.",
    "5. Need Rich Template Library: Multi-scenario templates for homeroom teachers (start of year, midterm, parent meetings, interventions).",
    "6. Missing Hints & Tooltips: Need (?) hint buttons on all fields/actions and an interactive User Guide modal.",
    "7. Viewport & Zoom 100% Clipping: Fix student drawer layout to scroll smoothly without cutting off content at standard zoom/viewport.",
    "",
    "## 2. PROPOSED IMPLEMENTATION PLAN",
    planContent,
    "",
    "## 3. INSTRUCTION FOR CHATGPT",
    "Provide constructive architectural & UX feedback on this plan. If the plan addresses all identified user feedback points cleanly without regressions, approve it to proceed with execution.",
    "Respond with a JSON block enclosed in ```json:chatgpt-review ... ``` conforming to:",
    "{",
    '  "contract_version": "1.0",',
    '  "task_id": "TASK-GVCN-002-PLAN",',
    '  "status": "APPROVED | REQUEST_CHANGES",',
    '  "summary": "Evaluation of the enhancement plan...",',
    '  "layers_evaluated": { "requirement": "PASS", "architecture": "PASS", "implementation": "PASS", "security_regression": "PASS", "product_ux": "PASS" },',
    '  "recommendations": []',
    "}"
  ].join("\n");

  const payload = {
    model: "chatgpt-web/luna",
    stream: false,
    client_metadata: {
      "x-codex-turn-metadata": {
        turn_id: turnId,
        thread_id: threadId,
      },
    },
    input: [
      {
        type: "message",
        role: "developer",
        id: `msg_dev_${randomUUID()}`,
        content: [
          {
            type: "text",
            text: `<environment_context>\n<cwd>${cwd}</cwd>\n<workspace_roots><root>${cwd}</root></workspace_roots>\n<sandbox_mode>danger-full-access</sandbox_mode>\n</environment_context>`,
          },
        ],
      },
      {
        type: "message",
        role: "user",
        id: `msg_user_${randomUUID()}`,
        internal_chat_message_metadata_passthrough: {
          turn_id: turnId,
        },
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  };

  console.log("Sending RFC to http://127.0.0.1:17841/v1/responses...");
  const res = await fetch("http://127.0.0.1:17841/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-codex-turn-metadata": JSON.stringify({ turn_id: turnId, thread_id: threadId }),
    },
    body: JSON.stringify(payload),
  });

  console.log("Response HTTP Status:", res.status);
  const text = await res.text();
  console.log("Raw Response Body:", text);
}

sendRfcToChatGPT().catch(err => {
  console.error("Error connecting to ChatGPT Web bridge:", err);
});
