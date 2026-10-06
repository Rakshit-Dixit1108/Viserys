import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface SettingsPanelProps {
  onClose: () => void;
}

interface PublicSettings {
  llm_provider: string;
  ollama_model: string;
  openai_model: string;
  hf_model: string;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/system/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setError("Could not reach the DragonAI backend."));
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-obsidian-950/70 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl p-6 shadow-glass">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-100">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-500 hover:bg-obsidian-700 hover:text-ink-100"
          >
            <X size={18} />
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-ember-400">{error}</p>}

        {settings && (
          <div className="space-y-3 text-sm">
            <Row label="LLM provider" value={settings.llm_provider} />
            {settings.llm_provider === "ollama" && (
              <Row label="Ollama model" value={settings.ollama_model} />
            )}
            {settings.llm_provider === "openai" && (
              <Row label="OpenAI-compatible model" value={settings.openai_model} />
            )}
            {settings.llm_provider === "huggingface" && (
              <Row label="Hugging Face model" value={settings.hf_model} />
            )}
          </div>
        )}

        <p className="mt-5 text-xs leading-relaxed text-ink-700">
          Change providers and models in <code className="text-ink-500">backend/.env</code> and
          restart the backend. API keys are never sent to the frontend.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-obsidian-900/60 px-3 py-2">
      <span className="text-ink-500">{label}</span>
      <span className="font-mono text-ink-100">{value}</span>
    </div>
  );
}
