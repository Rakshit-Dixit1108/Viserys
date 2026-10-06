import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-white/5 bg-obsidian-950">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-1.5">
        <span className="font-mono text-xs text-ink-500">{language || "text"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink-500 transition hover:bg-obsidian-700 hover:text-ink-100"
        >
          {copied ? <Check size={12} className="text-arcane-500" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          background: "transparent",
          padding: "1rem",
          fontSize: "0.825rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isBlock = Boolean(match);
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-obsidian-700 px-1.5 py-0.5 font-mono text-[0.85em] text-ember-400"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock
                language={match ? match[1] : ""}
                code={String(children).replace(/\n$/, "")}
              />
            );
          },
          a({ children, ...props }) {
            return (
              <a
                className="text-arcane-500 underline decoration-arcane-500/40 underline-offset-2 hover:text-arcane-400"
                target="_blank"
                rel="noreferrer"
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
