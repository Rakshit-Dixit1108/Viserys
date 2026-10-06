import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import clsx from "clsx";
import { api } from "../api/client";

interface VoiceButtonProps {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}

type State = "idle" | "recording" | "transcribing" | "error";

export default function VoiceButton({ onTranscribed, disabled }: VoiceButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setState("transcribing");
        try {
          const { text } = await api.transcribeAudio(blob);
          if (text.trim()) onTranscribed(text.trim());
          setState("idle");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Transcription failed.");
          setState("error");
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Microphone access was denied or unavailable.");
      setState("error");
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || state === "transcribing"}
        onClick={state === "recording" ? stop : start}
        title={state === "recording" ? "Stop recording" : "Speak a message"}
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition disabled:opacity-30",
          state === "recording"
            ? "border-ember-500 bg-ember-500/20 text-ember-400"
            : "border-white/5 bg-obsidian-800/70 text-ink-300 hover:text-ink-100"
        )}
      >
        {state === "transcribing" ? (
          <Loader2 size={15} className="animate-spin" />
        ) : state === "recording" ? (
          <Square size={13} />
        ) : (
          <Mic size={15} />
        )}
      </button>
      {error && (
        <span className="absolute bottom-11 right-0 w-48 rounded-lg bg-obsidian-900 px-2 py-1 text-[11px] text-ember-400 shadow-glass">
          {error}
        </span>
      )}
    </div>
  );
}
