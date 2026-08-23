import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

async function sendRfcV3() {
  console.log("=== GỬI RFC PLAN V3 (SYSTEM DESIGN & TWO-PANE LAYOUT) SANG CHATGPT WEB ===");

  const turnId = `turn_${randomUUID()}`;
  const threadId = `thread_${randomUUID()}`;
  const cwd = process.cwd();

  const prompt = [
    "# ROLE: INDEPENDENT SENIOR ARCHITECT & QUALITY GATEKEEPER",
    "Review the RFC Implementation Plan v3 for TASK-GVCN-003: System Design Unification, Two-Pane Split Workspace Restoration, Header Wrap/Overlap Elimination, and High-Contrast Accessibility (WCAG AA).",
    "",
    "## 1. PROBLEM IDENTIFICATION & ROOT CAUSE ANALYSIS",
    "1. Header Overlap Bug: When screen width narrows, 'THCS TRẦN BỘI CƠ' in SiteHeader lacked 'whitespace-nowrap', causing text to wrap vertically and expand header height >64px. Sub-navbar hard-coded at 'sticky top-16' collided into the global header.",
    "2. Low Contrast / Text-Background Clash Bug: Native selects and dropdown menus lacked explicit 'text-slate-900 bg-white' surfaces, leading to white-on-white text or poor active-state color contrast.",
    "3. Workflow UX: User requested restoring the highly efficient 'Two-Pane Split Workspace' (Master List on Left, Detail Work Area on Right) with a clean Light Theme.",
    "",
    "## 2. PROPOSED ARCHITECTURAL SOLUTION",
    "- 1. Global SiteHeader: Add 'shrink-0 whitespace-nowrap' and flex-wrap isolation to prevent logo text wrapping. Transition SubNavbar from brittle hard-coded offsets to natural flow layout.",
    "- 2. System Design Tokens: Enforce strict semantic tokens (App BG: slate-50, Surface: white/slate-200, Primary Text: slate-900, Active: indigo-600/white, Inactive: slate-100/slate-700).",
    "- 3. Two-Pane Split Architecture (/homeroom layout):",
    "   - Left Master Pane (340px): Class switcher, student live search, compact student list with attendance badges & instant selection.",
    "   - Right Detail Pane (flex-1): Tabbed views for Dashboard, Student Dossier, Organization & Seating, Events & Presets, Cooperation, Digital Handbook, and A4 Print Center.",
    "- 4. Explicit Dropdown Surface & Contrast: Every select, custom dropdown, and button state strictly declares foreground and background colors with WCAG AA compliance (>4.5:1 text, >7:1 headings).",
    "",
    "Please review this architecture plan across Requirement, Architecture, Implementation, Security, and Product UX layers, and provide your recommendations or approval."
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

  console.log("Sending RFC v3 to http://127.0.0.1:17841/v1/responses...");
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
  console.log("\n=== CHATGPT WEB LUNA RFC V3 REVIEW RESPONSE ===\n", text);
}

sendRfcV3().catch(err => {
  console.error("Error connecting to ChatGPT Web bridge:", err);
});
