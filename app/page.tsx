"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState, useRef, useEffect, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const transport = new DefaultChatTransport({ api: "/api/chat" });

const EXAMPLE_QUERIES = [
  "Show me all under review applications on King Street",
  "What developments are planned in Ward 13?",
  "How many applications are there by type?",
  "Find condo applications submitted after 2023",
];

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  searchApplications: "Search Applications",
  getApplicationDetails: "Get Application Details",
  getApplicationStats: "Get Application Stats",
  searchByDescription: "Search by Description",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isToolPart(part: any): boolean {
  return (
    typeof part.type === "string" &&
    (part.type.startsWith("tool-") || part.type === "dynamic-tool")
  );
}

function formatParamValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolCallCard({ part }: { part: any }) {
  const [expanded, setExpanded] = useState(false);

  const toolName =
    part.type === "dynamic-tool"
      ? part.toolName
      : part.type.replace("tool-", "");
  const displayName = TOOL_DISPLAY_NAMES[toolName] || toolName;

  const isRunning =
    part.state === "input-streaming" ||
    part.state === "input-available" ||
    part.state === "approval-requested" ||
    part.state === "approval-responded";
  const isDone = part.state === "output-available";
  const isError = part.state === "output-error";

  const params = part.input
    ? Object.entries(part.input as Record<string, unknown>).filter(
        ([, v]) => v !== undefined
      )
    : [];

  return (
    <div
      className={`my-3 rounded-lg border overflow-hidden animate-slide-in ${
        isRunning
          ? "animate-pulse-border"
          : isError
            ? "border-red-300 dark:border-red-700"
            : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <button
        onClick={() => isDone && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs transition-colors ${
          isDone
            ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
            : "cursor-default"
        }`}
      >
        {/* Status icon */}
        {isRunning && (
          <svg
            className="h-4 w-4 shrink-0 animate-spin text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isDone && (
          <svg
            className="h-4 w-4 shrink-0 text-emerald-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {isError && (
          <svg
            className="h-4 w-4 shrink-0 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}

        {/* Tool name */}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {displayName}
        </span>

        {/* Params */}
        {params.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {params.map(([key, value]) => (
              <span
                key={key}
                className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400"
              >
                {key}: {formatParamValue(value)}
              </span>
            ))}
          </span>
        )}

        {/* Expand chevron */}
        {isDone && (
          <svg
            className={`ml-auto h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Expanded output */}
      {expanded && isDone && part.output != null && (
        <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 max-h-64 overflow-auto">
          <pre className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
            {typeof part.output === "string"
              ? part.output
              : JSON.stringify(part.output, null, 2)}
          </pre>
        </div>
      )}

      {/* Error output */}
      {isError && part.errorText && (
        <div className="border-t border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2">
          <p className="text-[11px] text-red-600 dark:text-red-400">
            {part.errorText}
          </p>
        </div>
      )}
    </div>
  );
}

// Custom renderers for react-markdown
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markdownComponents: Record<string, React.ComponentType<any>> = {
  table: ({ node, children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
      <table className="min-w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ node, children, ...props }) => (
    <thead className="bg-zinc-50 dark:bg-zinc-800/60" {...props}>
      {children}
    </thead>
  ),
  th: ({ node, children, ...props }) => (
    <th
      className="border-b border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ node, children, ...props }) => (
    <td
      className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-1.5 text-zinc-600 dark:text-zinc-400"
      {...props}
    >
      {children}
    </td>
  ),
  tr: ({ node, children, ...props }) => (
    <tr
      className="even:bg-zinc-50/50 dark:even:bg-zinc-800/20"
      {...props}
    >
      {children}
    </tr>
  ),
  h1: ({ node, children, ...props }) => (
    <h1
      className="mt-4 mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node, children, ...props }) => (
    <h2
      className="mt-3 mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, children, ...props }) => (
    <h3
      className="mt-3 mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </h3>
  ),
  ul: ({ node, children, ...props }) => (
    <ul
      className="my-2 ml-4 list-disc space-y-1 text-zinc-700 dark:text-zinc-300 [&_ul]:my-0"
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ node, children, ...props }) => (
    <ol
      className="my-2 ml-4 list-decimal space-y-1 text-zinc-700 dark:text-zinc-300"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ node, children, ...props }) => (
    <li className="text-zinc-700 dark:text-zinc-300 leading-relaxed" {...props}>
      {children}
    </li>
  ),
  p: ({ node, children, ...props }) => (
    <p
      className="my-1.5 leading-relaxed text-zinc-700 dark:text-zinc-300"
      {...props}
    >
      {children}
    </p>
  ),
  strong: ({ node, children, ...props }) => (
    <strong
      className="font-semibold text-zinc-900 dark:text-zinc-100"
      {...props}
    >
      {children}
    </strong>
  ),
  a: ({ node, children, href, ...props }) => (
    <a
      className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ node, children, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-zinc-300 dark:border-zinc-600 pl-3 italic text-zinc-600 dark:text-zinc-400"
      {...props}
    >
      {children}
    </blockquote>
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-3 border-zinc-200 dark:border-zinc-700" {...props} />
  ),
  pre: ({ node, children, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-lg bg-zinc-100 dark:bg-zinc-800 p-3"
      {...props}
    >
      {children}
    </pre>
  ),
  code: ({ node, className, children, ...props }) => {
    if (className) {
      return (
        <code className="text-xs font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:text-zinc-200"
        {...props}
      >
        {children}
      </code>
    );
  },
};

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 dark:bg-zinc-600 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 dark:bg-zinc-600 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-300 dark:bg-zinc-600" />
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((p) => p.type === "text")
      .map((p) => (p as { text: string }).text)
      .join("");

    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[80%] rounded-2xl bg-blue-600 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  // Assistant message — render all parts in order
  return (
    <div className="animate-fade-in">
      <div className="max-w-full text-sm">
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            const text = (part as { text: string }).text;
            if (!text.trim()) return null;
            return (
              <ReactMarkdown
                key={i}
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {text}
              </ReactMarkdown>
            );
          }
          if (part.type === "step-start" || part.type === "reasoning") {
            return null;
          }
          if (isToolPart(part)) {
            return <ToolCallCard key={i} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function WelcomeMessage({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Toronto Development Applications
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Ask questions about ~26,000 development applications in Toronto
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const { messages, sendMessage, status } = useChat({ transport });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const isLoading = status === "streaming" || status === "submitted";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleExampleSelect = (query: string) => {
    sendMessage({ text: query });
  };

  return (
    <div className="flex h-dvh flex-col bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-center border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Toronto Dev Applications Agent
        </h1>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeMessage onSelect={handleExampleSelect} />
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="animate-fade-in">
                  <LoadingDots />
                </div>
              )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex w-full max-w-3xl items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Toronto development applications..."
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
