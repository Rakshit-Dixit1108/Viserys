import type { ChatMessage, Conversation, StreamEvents } from "../types";

const API_BASE = "http://127.0.0.1:8000/api";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listConversations: (query?: string) =>
    fetch(`${API_BASE}/conversations${query ? `?q=${encodeURIComponent(query)}` : ""}`).then(
      (r) => json<Conversation[]>(r)
    ),

  createConversation: (title = "New chat") =>
    fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then((r) => json<Conversation>(r)),

  renameConversation: (id: string, title: string) =>
    fetch(`${API_BASE}/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).then((r) => json<Conversation>(r)),

  deleteConversation: (id: string) =>
    fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" }).then((r) => json(r)),

  getMessages: (conversationId: string) =>
    fetch(`${API_BASE}/conversations/${conversationId}/messages`).then((r) =>
      json<ChatMessage[]>(r)
    ),

  health: () => fetch(`${API_BASE}/system/health`).then((r) => json(r)),

  /**
   * Streams an assistant reply over Server-Sent Events. Uses fetch + a
   * manual reader (rather than EventSource) because the request needs a
   * POST body.
   */
  async streamChat(
    conversationId: string | null,
    message: string,
    events: StreamEvents,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, message }),
      signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      events.onError?.(`Request failed (${res.status}): ${body || res.statusText}`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const lines = frame.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (!data) continue;
        const parsed = JSON.parse(data);
        if (event === "meta") events.onMeta?.(parsed.conversation_id);
        else if (event === "token") events.onToken?.(parsed.text);
        else if (event === "done") events.onDone?.();
        else if (event === "error") events.onError?.(parsed.message);
      }
    }
  },
};
