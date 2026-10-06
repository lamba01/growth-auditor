"use client";
import { useState } from "react";

const SEVERITY = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

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

export default function FindingCard({
  finding,
  context,
  applied,
  onToggleApplied,
  onUpdateFix,
}) {
  const fix = finding.fix ?? null;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [custom, setCustom] = useState("");
  const [fixError, setFixError] = useState(null);

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
      if (!res.ok) throw new Error(data.error || "Could not regenerate.");
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

  return (
    <div
      className={`rounded-xl border p-4 ${
        applied ? "border-green-300 bg-green-50" : "border-gray-200"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <div className="mb-1 flex gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${
                SEVERITY[finding.severity] ?? SEVERITY.low
              }`}
            >
              {finding.severity}
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
              {finding.category}
            </span>
            {applied && <span className="text-green-700">✓ applied</span>}
          </div>
          <div
            className={`font-medium ${applied ? "line-through text-gray-500" : ""}`}
          >
            {finding.issue}
          </div>
        </div>
        <span className="text-gray-400">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 text-sm">
          <p>
            <span className="font-medium">Evidence: </span>
            {finding.evidence}
          </p>
          <p>
            <span className="font-medium">Why it matters: </span>
            {finding.explanation}
          </p>
          <p>
            <span className="font-medium">What to do: </span>
            {finding.recommendation}
          </p>

          {fix?.content ? (
            <div className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium uppercase text-gray-500">
                  Suggested {(fix.type ?? "fix").replace(/_/g, " ")}
                </span>
                {limit && (
                  <span className={lenOk ? "text-green-700" : "text-amber-600"}>
                    {len} / {limit.max} chars
                  </span>
                )}
              </div>

              <p
                className={`whitespace-pre-wrap ${regenerating ? "opacity-40" : ""}`}
              >
                {fix.content}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={copyFix}
                  className="rounded-md border border-gray-300 px-3 py-1.5"
                >
                  {copied ? "Copied ✓" : "Copy fix"}
                </button>
                <button
                  onClick={onToggleApplied}
                  className="rounded-md bg-black px-3 py-1.5 text-white"
                >
                  {applied ? "Undo" : "Mark as applied"}
                </button>
              </div>

              <div className="mt-4 border-t border-gray-200 pt-3">
                <div className="mb-2 text-xs font-medium uppercase text-gray-500">
                  Regenerate
                </div>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.label}
                      disabled={regenerating}
                      onClick={() => regenerate(t.value)}
                      className="rounded-full border border-gray-300 px-3 py-1 text-xs disabled:opacity-40"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder='e.g. "mention Lagos and free quotes"'
                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    disabled={regenerating || !custom.trim()}
                    onClick={() => regenerate(custom.trim())}
                    className="rounded-md border border-gray-300 px-3 py-1.5 disabled:opacity-40"
                  >
                    {regenerating ? "Working…" : "Go"}
                  </button>
                </div>
                {fixError && (
                  <p className="mt-2 text-xs text-red-600">{fixError}</p>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={onToggleApplied}
              className="rounded-md bg-black px-3 py-1.5 text-white"
            >
              {applied ? "Undo" : "Mark as done"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
