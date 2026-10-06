"use client";
import { useState } from "react";

const SEVERITY = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

export default function FindingCard({ finding, applied, onToggleApplied }) {
  const fix = finding.fix ?? null;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyFix() {
    if (!fix?.content) return;
    await navigator.clipboard.writeText(fix.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
              <div className="mb-1 text-xs font-medium uppercase text-gray-500">
                Suggested {(fix.type ?? "fix").replace(/_/g, " ")}
              </div>
              <p className="whitespace-pre-wrap">{fix.content}</p>
              <div className="mt-3 flex gap-2">
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
