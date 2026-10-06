import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Terminal, X } from "lucide-react";
import { api } from "../api/client";
import type { AutomationResult } from "../types";

interface AutomationPanelProps {
  onClose: () => void;
}

const QUICK_COMMANDS = [
  "open chrome",
  "open vs code",
  "open spotify",
  "open discord",
  "open steam",
  "open calculator",
  "open notepad",
  "open downloads",
  "search google for aktu syllabus",
  "search youtube for lofi beats",
];

export default function AutomationPanel({ onClose }: AutomationPanelProps) {
  const [text, setText] = useState("");
  const [log, setLog] = useState<{ text: string; result: AutomationResult }[]>([]);
  const [pending, setPending] = useState<{ action: string; label: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (commandText: string) => {
    if (!commandText.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.runAutomationCommand(commandText);
      if (!res.matched) {
        setError(`No automation command recognized in: "${commandText}"`);
      } else if (res.requires_confirmation && res.action && res.label) {
        setPending({ action: res.action, label: res.label });
      } else {
        setLog((prev) => [{ text: commandText, result: res }, ...prev]);
      }
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed.");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setLoading(true);
    try {
      const res = await api.confirmAutomationCommand(pending.action);
      setLog((prev) => [{ text: pending.label, result: res }, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed.");
    } finally {
      setPending(null);
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex h-[70vh] w-[90vw] max-w-xl flex-col overflow-hidden rounded-2xl shadow-glass"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-ember-500" />
            <h2 className="font-display text-sm font-semibold text-ink-100">Automation</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-obsidian-700 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run(text)}
              placeholder='Try "open chrome", "shutdown", "search google for..."'
              className="flex-1 rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-700 focus:outline-none"
            />
            <button
              onClick={() => run(text)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-ember-gradient px-4 py-2 text-sm font-semibold text-obsidian-950 disabled:opacity-40"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Run
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_COMMANDS.map((c) => (
              <button
                key={c}
                onClick={() => run(c)}
                className="rounded-full bg-obsidian-700/60 px-2.5 py-1 text-[11px] text-ink-300 transition hover:bg-obsidian-700 hover:text-ink-100"
              >
                {c}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-ember-400">{error}</p>}
        </div>

        {pending && (
          <div className="mx-5 mb-3 flex items-center justify-between rounded-lg border border-ember-600/40 bg-ember-600/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-ember-400">
              <AlertTriangle size={15} />
              Confirm: {pending.label}?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="rounded-md px-3 py-1 text-xs text-ink-300 hover:bg-obsidian-700"
              >
                Cancel
              </button>
              <button
                onClick={confirm}
                className="rounded-md bg-ember-gradient px-3 py-1 text-xs font-semibold text-obsidian-950"
              >
                Confirm
              </button>
            </div>
          </div>
        )}

        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5">
          {log.length === 0 && (
            <p className="rounded-lg bg-obsidian-900/40 px-4 py-6 text-center text-sm text-ink-700">
              Run a command above and results will appear here.
            </p>
          )}
          <div className="space-y-2">
            {log.map((entry, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-obsidian-900/40 px-3 py-2 text-sm">
                <p className="text-ink-500">{entry.text}</p>
                <p className="text-ink-100">{entry.result.result ?? entry.result.message}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
