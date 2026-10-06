import { useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Loader2, User, X } from "lucide-react";
import clsx from "clsx";
import Markdown from "./Markdown";
import { api } from "../api/client";

interface ResumePanelProps {
  onClose: () => void;
}

type Tool = "analyze" | "improve" | "linkedin";

const TOOLS: { id: Tool; label: string }[] = [
  { id: "analyze", label: "ATS Analysis" },
  { id: "improve", label: "Improve Resume" },
  { id: "linkedin", label: "LinkedIn Boost" },
];

export default function ResumePanel({ onClose }: ResumePanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [tool, setTool] = useState<Tool>("analyze");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    if (!file) {
      setError("Upload a PDF resume first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.resumeTool(tool, file, jobRole || undefined);
      setResult(res.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex h-[80vh] w-[90vw] max-w-2xl flex-col overflow-hidden rounded-2xl shadow-glass"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-ember-500" />
            <h2 className="font-display text-sm font-semibold text-ink-100">Resume AI</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:bg-obsidian-700 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-obsidian-700 px-3 py-2 text-xs font-medium text-ink-100 transition hover:bg-obsidian-600">
              <FileUp size={14} />
              {file ? file.name : "Upload resume PDF"}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <input
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="Target role (optional)"
              className="flex-1 rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-xs text-ink-100 placeholder:text-ink-700 focus:outline-none"
            />
          </div>

          <div className="mb-4 flex gap-1.5">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  tool === t.id
                    ? "bg-obsidian-700 text-ink-100"
                    : "text-ink-500 hover:bg-obsidian-700/50 hover:text-ink-100"
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={run}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-ember-gradient px-4 py-1.5 text-xs font-semibold text-obsidian-950 disabled:opacity-40"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Run
            </button>
          </div>

          {error && <p className="mb-3 text-sm text-ember-400">{error}</p>}
          {result && <Markdown content={result} />}
          {!result && !error && !loading && (
            <p className="rounded-lg bg-obsidian-900/40 px-4 py-6 text-center text-sm text-ink-700">
              Upload a resume and pick a tool to get started.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
