"use client";
import { useId, useState } from "react";
import { CATEGORY_LABELS, SEVERITY } from "@/lib/labels";

const LIMITS = {
  seo_title: { min: 50, max: 60 },
  meta_description: { min: 140, max: 160 },
};

const TONES = [
  { label: "Different angle", value: "" },
  { label: "More formal", value: "Make it more formal and professional." },
  { label: "More friendly", value: "Make it warmer and more conversational." },
  { label: "Shorter", value: "Make it shorter and punchier." },
];

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`mt-1 h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <p className="mt-1 max-w-[62ch] font-prose text-[17px] leading-relaxed">
        {children}
      </p>
    </div>
  );
}

export default function FindingCard({
  finding,
  context,
  applied,
  onToggleApplied,
  onUpdateFix,
}) {
  const fix = finding.fix ?? null;
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [custom, setCustom] = useState("");
  const [fixError, setFixError] = useState(null);

  const sev = SEVERITY[finding.severity] ?? SEVERITY.low;

  async function copyFix() {
    if (!fix?.content) return;
    await navigator.clipboard.writeText(fix.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function regenerate(instruction) {
    setRegenerating(true);
    setFixError(null);
    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, context, instruction }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Could not rewrite this copy.");
      onUpdateFix(finding.id, data.content);
      setCustom("");
    } catch (e) {
      setFixError(e.message);
    } finally {
      setRegenerating(false);
    }
  }

  const limit = fix ? LIMITS[fix.type] : null;
  const len = fix?.content?.length ?? 0;
  const lenOk = limit ? len >= limit.min && len <= limit.max : true;
  const fill = limit ? Math.min(len / limit.max, 1) * 100 : 0;

  const toggleButton = (
    <button
      type="button"
      onClick={onToggleApplied}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        applied
          ? "border border-line text-ink hover:border-ink"
          : "bg-spruce text-white hover:bg-spruce-hover"
      }`}
    >
      {applied ? "Undo" : "Mark as fixed"}
    </button>
  );

  return (
    <article className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-start gap-4 py-5 text-left"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 h-11 w-1 shrink-0 rounded-full ${applied ? "bg-good" : sev.bar}`}
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[17px] font-medium leading-snug ${
              applied ? "text-muted line-through decoration-1" : ""
            }`}
          >
            {finding.issue}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span>{applied ? "Fixed" : sev.label}</span>
            <span>{CATEGORY_LABELS[finding.category] ?? finding.category}</span>
          </span>
        </span>
        <Chevron open={open} />
      </button>

      {open && (
        <div id={panelId} className="reveal space-y-6 pb-8 pl-5 sm:pr-6">
          <Section title="Evidence">{finding.evidence}</Section>
          <Section title="Why it matters">{finding.explanation}</Section>
          <Section title="What to do">{finding.recommendation}</Section>

          {fix?.content ? (
            <div
              className="rounded-2xl border border-line bg-paper p-5"
              aria-busy={regenerating}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium">
                  Suggested {(fix.type ?? "fix").replace(/_/g, " ")}
                </h3>
                {limit && (
                  <span
                    className={`text-sm ${lenOk ? "text-good" : "text-warn"}`}
                  >
                    {len} characters (target {limit.min} to {limit.max})
                  </span>
                )}
              </div>

              {limit && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      lenOk ? "bg-good" : "bg-warn"
                    }`}
                    style={{ width: `${fill}%` }}
                  />
                </div>
              )}

              <p
                className={`mt-4 whitespace-pre-wrap font-prose text-lg leading-relaxed transition-opacity ${
                  regenerating ? "opacity-40" : ""
                }`}
              >
                {fix.content}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyFix}
                  className="rounded-xl border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-ink"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
                {toggleButton}
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <h4 className="text-sm font-medium text-muted">
                  Rewrite this copy
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      disabled={regenerating}
                      onClick={() => regenerate(t.value)}
                      className="rounded-full border border-line px-3.5 py-1.5 text-sm transition-colors hover:border-ink disabled:opacity-40"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="Or say what to change, e.g. mention Lagos and free quotes"
                    aria-label="Custom rewrite instruction"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-2 text-sm placeholder:text-muted/60"
                  />
                  <button
                    type="button"
                    disabled={regenerating || !custom.trim()}
                    onClick={() => regenerate(custom.trim())}
                    className="rounded-xl border border-line px-4 py-2 text-sm font-medium transition-colors hover:border-ink disabled:opacity-40"
                  >
                    {regenerating ? "Rewriting" : "Rewrite"}
                  </button>
                </div>
                {fixError && (
                  <p className="mt-2 text-sm text-bad">{fixError}</p>
                )}
              </div>
            </div>
          ) : (
            <div>{toggleButton}</div>
          )}
        </div>
      )}
    </article>
  );
}
