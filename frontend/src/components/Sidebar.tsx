import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Plus, Search, Settings, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { Conversation } from "../types";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onSearch: (query: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onSearch,
  onOpenSettings,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  return (
    <aside className="relative z-10 flex h-full w-72 flex-col border-r border-white/5 bg-obsidian-800/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-5 pt-6 pb-4">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-ember-gradient shadow-ember">
          <Flame size={18} className="text-obsidian-950" strokeWidth={2.5} />
        </div>
        <span className="font-display text-lg font-semibold tracking-tight text-ink-100">
          Dragon<span className="text-ember-500">AI</span>
        </span>
      </div>

      <div className="px-4 pb-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-obsidian-700 px-3 py-2.5 text-sm font-medium text-ink-100 transition hover:bg-obsidian-600 hover:shadow-ember"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2">
          <Search size={14} className="text-ink-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onSearch(e.target.value);
            }}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm text-ink-100 placeholder:text-ink-700 focus:outline-none"
          />
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-ink-700">
            No conversations yet. Start one above.
          </p>
        )}
        {conversations.map((c) => (
          <motion.div
            layout
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={clsx(
              "group mb-1 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition",
              activeId === c.id
                ? "bg-obsidian-700 text-ink-100"
                : "text-ink-300 hover:bg-obsidian-700/50"
            )}
          >
            <span className="truncate">{c.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className="ml-2 shrink-0 text-ink-700 opacity-0 transition hover:text-ember-500 group-hover:opacity-100"
              aria-label={`Delete ${c.title}`}
            >
              <Trash2 size={14} />
            </button>
          </motion.div>
        ))}
      </nav>

      <div className="border-t border-white/5 p-3">
        <button
          onClick={onOpenSettings}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-obsidian-700/50 hover:text-ink-100"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>
    </aside>
  );
}
