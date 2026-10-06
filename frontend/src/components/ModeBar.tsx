import { useEffect, useState } from "react";
import { BookOpen, Briefcase, Code2, FileText, GraduationCap, MessageSquare } from "lucide-react";
import clsx from "clsx";
import { api } from "../api/client";
import type { ChatMode, DragonDocument, InterviewType } from "../types";

interface ModeBarProps {
  mode: ChatMode;
  docId: string | null;
  interviewType: InterviewType;
  onModeChange: (mode: ChatMode) => void;
  onDocIdChange: (docId: string | null) => void;
  onInterviewTypeChange: (type: InterviewType) => void;
}

const MODES: { id: ChatMode; label: string; icon: typeof MessageSquare }[] = [
  { id: "general", label: "General", icon: MessageSquare },
  { id: "aktu", label: "AKTU AI", icon: GraduationCap },
  { id: "sr_institute", label: "SR Institute AI", icon: BookOpen },
  { id: "pdf", label: "PDF AI", icon: FileText },
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "interview", label: "Interview Prep", icon: Briefcase },
];

const INTERVIEW_TYPES: { id: InterviewType; label: string }[] = [
  { id: "technical", label: "Technical" },
  { id: "hr", label: "HR" },
  { id: "mock", label: "Full Mock" },
  { id: "aiml", label: "AI/ML" },
  { id: "python", label: "Python" },
];

export default function ModeBar({
  mode,
  docId,
  interviewType,
  onModeChange,
  onDocIdChange,
  onInterviewTypeChange,
}: ModeBarProps) {
  const [pdfDocs, setPdfDocs] = useState<DragonDocument[]>([]);

  useEffect(() => {
    if (mode === "pdf") {
      api.listDocuments("user_pdfs").then(setPdfDocs).catch(() => setPdfDocs([]));
    }
  }, [mode]);

  return (
    <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          className={clsx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            mode === id
              ? "bg-ember-gradient text-obsidian-950 shadow-ember"
              : "text-ink-500 hover:bg-obsidian-700/60 hover:text-ink-100"
          )}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}

      {mode === "pdf" && (
        <select
          value={docId ?? ""}
          onChange={(e) => onDocIdChange(e.target.value || null)}
          className="ml-2 rounded-lg border border-white/5 bg-obsidian-900/60 px-2 py-1.5 text-xs text-ink-100 focus:outline-none"
        >
          <option value="">Select a PDF...</option>
          {pdfDocs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.filename}
            </option>
          ))}
        </select>
      )}

      {mode === "interview" && (
        <select
          value={interviewType}
          onChange={(e) => onInterviewTypeChange(e.target.value as InterviewType)}
          className="ml-2 rounded-lg border border-white/5 bg-obsidian-900/60 px-2 py-1.5 text-xs text-ink-100 focus:outline-none"
        >
          {INTERVIEW_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
