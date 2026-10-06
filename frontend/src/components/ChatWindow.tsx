import { useEffect, useRef, useState } from "react";
import { AlertTriangle, SendHorizonal } from "lucide-react";
import MessageBubble from "./MessageBubble";
import { api } from "../api/client";
import type { ChatMessage } from "../types";

interface ChatWindowProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onConversationUpdated: () => void;
}

export default function ChatWindow({
  conversationId,
  onConversationCreated,
  onConversationUpdated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setError(null);
    if (!conversationId) {
      setMessages([]);
      return;
    }
    api
      .getMessages(conversationId)
      .then(setMessages)
      .catch((e) => setError(e.message));
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingText]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      conversation_id: conversationId ?? "",
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setStreamingText("");

    const controller = new AbortController();
    abortRef.current = controller;
    let finalConversationId = conversationId;
    let assembled = "";

    try {
      await api.streamChat(
        conversationId,
        text,
        {
          onMeta: (id) => {
            finalConversationId = id;
            if (!conversationId) onConversationCreated(id);
          },
          onToken: (chunk) => {
            assembled += chunk;
            setStreamingText(assembled);
          },
          onDone: () => {
            setMessages((prev) => [
              ...prev,
              {
                id: `local-assistant-${Date.now()}`,
                conversation_id: finalConversationId ?? "",
                role: "assistant",
                content: assembled,
                created_at: new Date().toISOString(),
              },
            ]);
            setStreamingText(null);
            onConversationUpdated();
          },
          onError: (message) => {
            setError(message);
            setStreamingText(null);
          },
        },
        controller.signal
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStreamingText(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="relative z-10 flex h-full flex-1 flex-col">
      <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !streamingText && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ember-gradient shadow-ember">
              <span className="font-display text-2xl font-bold text-obsidian-950">D</span>
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-100">
              What can I help with?
            </h2>
            <p className="mt-1 max-w-sm text-sm text-ink-500">
              Ask about AKTU or SR Institute, paste some code, or upload a PDF once
              document search is enabled.
            </p>
          </div>
        )}

        <div className="mx-auto max-w-3xl">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {streamingText !== null && (
            <MessageBubble
              message={{
                id: "streaming",
                conversation_id: conversationId ?? "",
                role: "assistant",
                content: streamingText,
                created_at: new Date().toISOString(),
              }}
              streaming
            />
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-ember-600/30 bg-ember-600/10 px-4 py-2 text-sm text-ember-400">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div className="border-t border-white/5 p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/5 bg-obsidian-800/70 p-2 backdrop-blur-xl focus-within:shadow-arcane">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message DragonAI..."
            rows={1}
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ember-gradient text-obsidian-950 transition disabled:opacity-30"
            aria-label="Send message"
          >
            <SendHorizonal size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
