import { motion } from "framer-motion";
import { Flame, User } from "lucide-react";
import clsx from "clsx";
import Markdown from "./Markdown";
import type { ChatMessage } from "../types";

interface MessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

export default function MessageBubble({ message, streaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={clsx("flex gap-3 px-2 py-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-obsidian-700 text-ink-100" : "bg-ember-gradient text-obsidian-950 shadow-ember"
        )}
      >
        {isUser ? <User size={15} /> : <Flame size={15} strokeWidth={2.5} />}
      </div>

      <div
        className={clsx(
          "max-w-[75%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-obsidian-700 text-ink-100"
            : "glass text-ink-100 shadow-glass"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
        ) : (
          <Markdown content={message.content} />
        )}
        {streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-ember rounded-sm bg-ember-500 align-middle" />
        )}
      </div>
    </motion.div>
  );
}
