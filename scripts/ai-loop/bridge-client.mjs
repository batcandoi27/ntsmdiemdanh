// AI Dev Loop - ChatGPT Web Bridge Client
import { randomUUID } from "node:crypto";

export const BRIDGE_URL = process.env.CODEX_CHATGPT_WEB_URL || "http://127.0.0.1:17841";
export const MODEL = "chatgpt-web/luna";

export async function checkBridgeHealth() {
  try {
    const res = await fetch(`${BRIDGE_URL}/healthz`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function sendToChatGPTWeb(prompt, taskId = "TASK-AUTO-LOOP") {
  const health = await checkBridgeHealth();
  if (!health.ok) {
    throw new Error(`ChatGPT Web Bridge is not accessible at ${BRIDGE_URL}: ${health.error}`);
  }

  const turnId = `turn_${randomUUID()}`;
  const threadId = `thread_${randomUUID()}`;
  const cwd = process.cwd();

  const requestBody = {
    model: MODEL,
    stream: false,
    client_metadata: {
      "x-codex-turn-metadata": { turn_id: turnId, thread_id: threadId },
      task_id: taskId,
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
        content: [{ type: "text", text: prompt }],
      },
    ],
  };

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
    throw new Error(`Bridge Response Error HTTP ${res.status}: ${errText || res.statusText}`);
  }

  const data = await res.json();
  
  // Extract text response
  let responseText = "";
  if (data.output) {
    for (const item of data.output) {
      if (item.content) {
        for (const c of item.content) {
          if (c.text) responseText += c.text;
        }
      }
    }
  } else if (typeof data.text === "string") {
    responseText = data.text;
  } else if (data.response) {
    responseText = data.response;
  } else {
    responseText = JSON.stringify(data, null, 2);
  }

  return responseText;
}
