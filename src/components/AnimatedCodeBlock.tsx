import { useState, useEffect, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Copy, Check, Lock, Terminal } from "lucide-react";

/* Minimal token highlighter — works for Python / JS / C# style snippets */
const KEYWORDS = /\b(import|from|const|let|var|function|return|if|else|class|public|using|async|await|new|true|false|null|None|print|def|require|module|exports)\b/g;
const STRINGS = /(".*?"|'.*?'|`.*?`)/g;
const NUMBERS = /\b(\d+\.?\d*)\b/g;
const COMMENTS = /(\/\/.*$|#.*$)/gm;
const FUNCS = /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g;

function highlight(code: string): string {
  // Order matters — escape HTML first
  let out = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  out = out.replace(COMMENTS, '<span class="text-muted-foreground/70 italic">$1</span>');
  out = out.replace(STRINGS, '<span class="text-emerald-400/90">$1</span>');
  out = out.replace(KEYWORDS, '<span class="text-fuchsia-400 font-semibold">$1</span>');
  out = out.replace(NUMBERS, '<span class="text-amber-300">$1</span>');
  out = out.replace(FUNCS, '<span class="text-sky-400">$1</span>');
  return out;
}

export interface CodeTab {
  label: string;
  filename: string;
  code: string;
}

interface Props {
  tabs: CodeTab[];
  responseSlot?: React.ReactNode;
  compact?: boolean;
}

export function AnimatedCodeBlock({ tabs, responseSlot, compact = false }: Props) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [typed, setTyped] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-80px" });
  const fullCode = tabs[active]?.code ?? "";

  // Typewriter effect when in view / tab changes
  useEffect(() => {
    if (!inView) return;
    setTyped("");
    let i = 0;
    const total = fullCode.length;
    // ~ finish in ~1.2s regardless of size
    const step = Math.max(1, Math.ceil(total / 90));
    const id = window.setInterval(() => {
      i = Math.min(i + step, total);
      setTyped(fullCode.slice(0, i));
      if (i >= total) window.clearInterval(id);
    }, 14);
    return () => window.clearInterval(id);
  }, [active, inView, fullCode]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const lineCount = (typed || " ").split("\n").length;

  return (
    <div ref={containerRef} className="group relative">
      {/* Animated gradient glow border */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 blur-[2px] transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "conic-gradient(from var(--cb-angle, 0deg), hsl(var(--primary)/0.6), transparent 30%, hsl(var(--primary)/0.4) 55%, transparent 80%, hsl(var(--primary)/0.6))",
          animation: "cb-spin 6s linear infinite",
        }}
      />
      <style>{`
        @keyframes cb-spin { to { --cb-angle: 360deg; } }
        @property --cb-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes cb-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(2200%); } }
      `}</style>

      <div className="relative rounded-2xl border border-border/60 bg-[#0b0712]/95 backdrop-blur-xl overflow-hidden shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.45)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-card/80 to-card/30 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
            <Terminal className="ml-3 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
              {tabs[active]?.filename}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="hidden sm:flex items-center gap-1.5 mr-2 text-[10px] uppercase tracking-wider text-primary/90 font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              live
            </span>
            <button
              onClick={onCopy}
              className="flex items-center gap-1 rounded-md border border-border/50 bg-card/40 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/10 transition-all"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="flex items-center gap-1 text-emerald-400">
                    <Check className="h-3 w-3" /> copied
                  </motion.span>
                ) : (
                  <motion.span key="cp" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="flex items-center gap-1">
                    <Copy className="h-3 w-3" /> copy
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Language tabs */}
        {tabs.length > 1 && (
          <div className="flex items-center gap-1 border-b border-border/40 bg-background/40 px-2 overflow-x-auto">
            {tabs.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setActive(i)}
                className={`relative px-3 py-2 text-[11px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                  active === i ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {t.label}
                {active === i && (
                  <motion.span layoutId="cb-underline" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-primary via-fuchsia-400 to-primary" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className={responseSlot ? "grid md:grid-cols-[1fr_280px]" : ""}>
          {/* Code */}
          <div className="relative overflow-hidden">
            {/* Scan-line */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
              style={{ animation: "cb-scan 4s linear infinite" }} />
            <div className="relative flex font-mono text-[11px] sm:text-xs leading-[1.65]">
              {/* Line numbers */}
              <div aria-hidden className="select-none border-r border-border/30 bg-background/40 px-3 py-4 sm:py-5 text-right text-muted-foreground/50">
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className={`overflow-x-auto py-4 sm:py-5 px-4 sm:px-5 w-full ${compact ? "" : "min-h-[260px]"}`}>
                <code
                  className="text-foreground/90"
                  dangerouslySetInnerHTML={{ __html: highlight(typed) + '<span class="inline-block w-[7px] h-[1em] -mb-[2px] bg-primary/80 animate-pulse ml-0.5" />' }}
                />
              </pre>
            </div>
          </div>

          {responseSlot && (
            <div className="border-t md:border-t-0 md:border-l border-border/40 p-4 sm:p-5 space-y-3 bg-background/40">
              {responseSlot}
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between border-t border-border/40 bg-background/40 px-4 py-1.5 text-[10px] font-mono text-muted-foreground/70">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-primary/70" /> HMAC-SHA256</span>
            <span className="hidden sm:inline">UTF-8</span>
            <span className="hidden sm:inline">LF</span>
          </div>
          <span>{tabs[active]?.label.toLowerCase()} · {lineCount} lines</span>
        </div>
      </div>
    </div>
  );
}