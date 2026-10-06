import { useEffect, useState, type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import clsx from "clsx";
import Markdown from "./Markdown";
import { api } from "../api/client";
import type { DocCollection, DragonDocument } from "../types";

interface DocumentsPanelProps {
  onClose: () => void;
}

type Tab = "aktu" | "sr_institute" | "user_pdfs" | "exam_analysis";

const CATEGORY_OPTIONS: Record<Exclude<Tab, "exam_analysis">, string[]> = {
  aktu: [
    "syllabus",
    "previous_year_paper",
    "academic_calendar",
    "exam_pattern",
    "notes",
    "book",
    "circular",
    "lab_manual",
    "other",
  ],
  sr_institute: [
    "department",
    "faculty",
    "notice",
    "timetable",
    "event",
    "assignment",
    "circular",
    "campus_info",
    "handbook",
    "other",
  ],
  user_pdfs: ["general", "resume", "notes", "other"],
};

const TABS: { id: Tab; label: string; icon: typeof BookOpen }[] = [
  { id: "aktu", label: "AKTU Library", icon: GraduationCap },
  { id: "sr_institute", label: "SR Institute Library", icon: BookOpen },
  { id: "user_pdfs", label: "PDF AI", icon: FileText },
  { id: "exam_analysis", label: "Exam Analysis", icon: BarChart3 },
];

export default function DocumentsPanel({ onClose }: DocumentsPanelProps) {
  const [tab, setTab] = useState<Tab>("aktu");

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass flex h-[85vh] w-[90vw] max-w-4xl flex-col overflow-hidden rounded-2xl shadow-glass"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
          <div className="flex gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  tab === id
                    ? "bg-obsidian-700 text-ink-100"
                    : "text-ink-500 hover:bg-obsidian-700/50 hover:text-ink-100"
                )}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-obsidian-700 hover:text-ink-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          {tab === "exam_analysis" ? <ExamAnalysisTab /> : <LibraryTab collection={tab} />}
        </div>
      </motion.div>
    </div>
  );
}

function LibraryTab({ collection }: { collection: DocCollection }) {
  const [docs, setDocs] = useState<DragonDocument[]>([]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[collection][0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<{ title: string; content: string } | null>(null);
  const [toolLoading, setToolLoading] = useState<string | null>(null);

  const refresh = () => api.listDocuments(collection).then(setDocs).catch(() => setDocs([]));

  useEffect(() => {
    setCategory(CATEGORY_OPTIONS[collection][0]);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection]);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadDocument(file, collection, category);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const runTool = async (
    doc: DragonDocument,
    tool: Parameters<typeof api.runDocumentTool>[1],
    label: string
  ) => {
    setToolLoading(`${doc.id}-${tool}`);
    setError(null);
    try {
      const res = await api.runDocumentTool(doc.id, tool);
      setToolResult({ title: `${label} — ${doc.filename}`, content: res.result });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tool failed.");
    } finally {
      setToolLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-xs text-ink-100 focus:outline-none"
        >
          {CATEGORY_OPTIONS[collection].map((c) => (
            <option key={c} value={c}>
              {c.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-obsidian-700 px-3 py-2 text-xs font-medium text-ink-100 transition hover:bg-obsidian-600">
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Indexing..." : "Upload PDF"}
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="mb-3 text-sm text-ember-400">{error}</p>}

      {docs.length === 0 && (
        <p className="rounded-lg bg-obsidian-900/40 px-4 py-6 text-center text-sm text-ink-700">
          No documents indexed yet. Upload a PDF to get started.
        </p>
      )}

      <div className="space-y-2">
        {docs.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-white/5 bg-obsidian-900/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-100">{doc.filename}</p>
                <p className="text-xs text-ink-700">
                  {doc.category.replace(/_/g, " ")} · {doc.chunk_count} chunks
                </p>
              </div>
              <button
                onClick={async () => {
                  await api.deleteDocument(doc.id);
                  refresh();
                }}
                className="text-ink-700 hover:text-ember-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["summarize", "Summarize"],
                  ["notes", "Notes"],
                  ["mcqs", "MCQs"],
                  ["flashcards", "Flashcards"],
                  ["important-questions", "Important Qs"],
                ] as const
              ).map(([tool, label]) => (
                <button
                  key={tool}
                  onClick={() => runTool(doc, tool, label)}
                  disabled={toolLoading !== null}
                  className="flex items-center gap-1 rounded-md bg-obsidian-700/60 px-2 py-1 text-[11px] text-ink-300 transition hover:bg-obsidian-700 hover:text-ink-100 disabled:opacity-40"
                >
                  {toolLoading === `${doc.id}-${tool}` && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {toolResult && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-obsidian-950/80 p-8">
          <div className="glass flex max-h-full w-full max-w-2xl flex-col rounded-2xl shadow-glass">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <h3 className="font-display text-sm font-semibold text-ink-100">
                {toolResult.title}
              </h3>
              <button onClick={() => setToolResult(null)} className="text-ink-500 hover:text-ink-100">
                <X size={16} />
              </button>
            </div>
            <div className="scrollbar-thin overflow-y-auto p-5">
              <Markdown content={toolResult.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExamAnalysisTab() {
  const [collection, setCollection] = useState<"aktu" | "sr_institute">("aktu");
  const [category, setCategory] = useState("previous_year_paper");
  const [subjectHint, setSubjectHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.examAnalysis>> | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.examAnalysis(collection, category, subjectHint || undefined);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-ink-500">
        Analyzes previous papers you've uploaded under the "previous_year_paper" category
        to surface likely topics, repeated questions, and unit-wise weightage.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={collection}
          onChange={(e) => setCollection(e.target.value as "aktu" | "sr_institute")}
          className="rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-xs text-ink-100 focus:outline-none"
        >
          <option value="aktu">AKTU</option>
          <option value="sr_institute">SR Institute</option>
        </select>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-xs text-ink-100 focus:outline-none"
        />
        <input
          value={subjectHint}
          onChange={(e) => setSubjectHint(e.target.value)}
          placeholder="Subject (optional)"
          className="flex-1 rounded-lg border border-white/5 bg-obsidian-900/60 px-3 py-2 text-xs text-ink-100 placeholder:text-ink-700 focus:outline-none"
        />
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-ember-gradient px-3 py-2 text-xs font-semibold text-obsidian-950 disabled:opacity-40"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Analyze
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-ember-400">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="rounded-lg border border-scale-500/30 bg-scale-500/5 px-4 py-2 text-xs text-scale-400">
            {result.disclaimer}
          </div>
          <p className="text-xs text-ink-700">
            Based on {result.documents_analyzed} indexed document(s).
          </p>
          <Markdown content={result.analysis} />
        </div>
      )}
    </div>
  );
}
