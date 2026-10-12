"use client";
import { useState } from "react";

const MODES = [
  { id: "url", label: "Website URL" },
  { id: "html", label: "Paste HTML" },
];

export default function AuditForm({ onSubmit, loading }) {
  const [mode, setMode] = useState("url");
  const [value, setValue] = useState("");
  const canSubmit = value.trim().length > 0 && !loading;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(mode === "url" ? { url: value.trim() } : { html: value });
  }

  function switchMode(id) {
    setMode(id);
    setValue("");
  }

  const button = (
    <button
      type="submit"
      disabled={!canSubmit}
      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-spruce px-7 py-3.5 text-base font-medium text-white transition-colors hover:bg-spruce-hover disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      {loading ? "Auditing" : "Run audit"}
    </button>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-line bg-paper p-3 shadow-[0_18px_40px_-28px_rgba(20,35,31,0.35)] sm:p-4"
    >
      <div
        role="tablist"
        aria-label="Audit source"
        className="inline-flex rounded-xl bg-chalk p-1"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => switchMode(m.id)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === m.id
                ? "bg-paper text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="yourbusiness.com"
            aria-label="Website URL"
            inputMode="url"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-2xl border border-line bg-white px-5 py-3.5 text-lg placeholder:text-muted/60"
          />
          {button}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste the page's HTML here. In your browser: View source, select all, copy."
            aria-label="Page HTML"
            rows={8}
            className="w-full rounded-2xl border border-line bg-white px-5 py-4 font-mono text-sm leading-relaxed placeholder:text-muted/60"
          />
          <div className="flex justify-end">{button}</div>
        </div>
      )}

      {loading && (
        <p className="mt-3 px-1 text-sm text-muted" aria-live="polite">
          Reading the page and scoring it. This usually takes 10 to 30 seconds.
        </p>
      )}
    </form>
  );
}
