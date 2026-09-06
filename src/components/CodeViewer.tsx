import { useMemo, useState } from "react";
import { Check, Copy, Download, WrapText } from "lucide-react";
import { cn } from "@/lib/utils";

type Syntax = "python" | "js" | "clike" | "shell";

interface CodeViewerProps {
  code: string;
  filename?: string;
  syntax?: Syntax | string;
  maxHeightClass?: string;
  className?: string;
}

const KEYWORDS: Record<Syntax, string[]> = {
  python: ["def", "class", "import", "from", "return", "if", "elif", "else", "for", "while", "try", "except", "finally", "with", "as", "in", "not", "and", "or", "None", "True", "False", "lambda", "raise", "pass", "break", "continue", "global", "print", "async", "await"],
  js: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "try", "catch", "finally", "await", "async", "new", "class", "import", "export", "from", "throw", "typeof", "null", "undefined", "true", "false", "process", "require", "console"],
  clike: ["using", "namespace", "class", "struct", "public", "private", "static", "void", "int", "bool", "string", "var", "new", "return", "if", "else", "for", "while", "try", "catch", "finally", "throw", "const", "auto", "func", "package", "import", "type", "fn", "let", "mut", "match", "pub", "impl", "true", "false", "null", "nil", "None", "Some", "Ok", "Err", "async", "await", "std"],
  shell: ["curl", "echo", "export", "if", "then", "fi", "for", "do", "done", "set"],
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };
const escapeHtml = (value: string) => value.replace(/[&<>]/g, (c) => ESCAPES[c]);

function highlightLine(line: string, syntax: Syntax): string {
  const keywords = KEYWORDS[syntax] ?? KEYWORDS.clike;
  const commentToken = syntax === "python" || syntax === "shell" ? "#" : "//";

  // Split out comments first so keywords inside them are not coloured.
  const commentIndex = findCommentIndex(line, commentToken);
  const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

  const tokens: string[] = [];
  const placeholder = (html: string) => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };

  // Strings
  let out = codePart.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1?/g, (match) =>
    placeholder(`<span class="text-emerald-300">${escapeHtml(match)}</span>`),
  );

  // Numbers
  out = out.replace(/\b\d+(?:\.\d+)?\b/g, (match) => placeholder(`<span class="text-amber-300">${match}</span>`));

  // Function calls
  out = out.replace(/\b([A-Za-z_][A-Za-z0-9_]*)(\s*\()/g, (_m, name: string, tail: string) => {
    if (keywords.includes(name)) return `${placeholder(`<span class="text-fuchsia-300 font-medium">${name}</span>`)}${tail}`;
    return `${placeholder(`<span class="text-sky-300">${name}</span>`)}${tail}`;
  });

  // Keywords
  out = out.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (match) =>
    keywords.includes(match) ? placeholder(`<span class="text-fuchsia-300 font-medium">${match}</span>`) : match,
  );

  out = escapeHtml(out).replace(/\u0000(\d+)\u0000/g, (_m, index: string) => tokens[Number(index)]);

  if (commentPart) {
    out += `<span class="text-muted-foreground italic">${escapeHtml(commentPart)}</span>`;
  }
  return out;
}

function findCommentIndex(line: string, token: string): number {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (line.startsWith(token, i)) return i;
  }
  return -1;
}

export function CodeViewer({ code, filename, syntax = "clike", maxHeightClass = "max-h-[520px]", className }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);

  const lines = useMemo(() => code.replace(/\s+$/, "").split("\n"), [code]);
  const resolvedSyntax = (["python", "js", "clike", "shell"].includes(String(syntax)) ? syntax : "clike") as Syntax;
  const highlighted = useMemo(() => lines.map((line) => highlightLine(line, resolvedSyntax)), [lines, resolvedSyntax]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "snippet.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">{filename || "snippet"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWrap((w) => !w)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2 text-xs transition-colors",
              wrap ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            aria-pressed={wrap}
          >
            <WrapText className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Wrap</span>
          </button>
          <button
            type="button"
            onClick={download}
            className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={copy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary/15 px-2.5 text-xs text-primary transition-colors hover:bg-primary/25"
          >
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>
      </div>

      <div className={cn("overflow-auto bg-[hsl(var(--card))]", maxHeightClass)}>
        <table className="w-full border-collapse font-mono text-xs leading-relaxed">
          <tbody>
            {highlighted.map((html, index) => (
              <tr key={index} className="group">
                <td className="w-10 select-none border-r border-border/60 bg-secondary/20 px-2 text-right align-top text-[11px] text-muted-foreground/60">
                  {index + 1}
                </td>
                <td
                  className={cn(
                    "px-3 py-[1px] align-top text-foreground group-hover:bg-primary/5",
                    wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                  )}
                  dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CodeViewer;
