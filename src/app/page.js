"use client";
import { useEffect, useRef, useState } from "react";
import AuditForm from "@/components/AuditForm";
import ScoreCard from "@/components/ScoreCard";
import FindingCard from "@/components/FindingCard";
import HistoryList from "@/components/HistoryList";
import { computeScore } from "@/lib/score";
import { ownerHeaders } from "@/lib/owner";

const CATEGORIES = ["all", "conversion", "seo", "trust", "ux"];

function snapshot(findings, appliedIds) {
  return JSON.stringify({ applied: [...appliedIds].sort(), findings });
}

export default function Home() {
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const lastSaved = useRef("");

  function show(data) {
    const ids = new Set(data.applied ?? []);
    lastSaved.current = snapshot(data.findings, ids);
    setApplied(ids);
    setResult(data);
    setFilter("all");
  }

  async function runAudit(input) {
    setLoading(true);
    setError(null);
    setResult(null);
    setApplied(new Set());
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: ownerHeaders(),
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      show(data);
      setHistoryKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openSaved(id) {
    setError(null);
    try {
      const res = await fetch(`/api/audits/${id}`, { headers: ownerHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open audit");
      show(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message);
    }
  }

  function toggleApplied(id) {
    setApplied((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function updateFix(id, content) {
    setResult((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === id ? { ...f, fix: { ...f.fix, content } } : f,
      ),
    }));
    setApplied((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Autosave progress (applied fixes and regenerated copy) shortly after any change
  useEffect(() => {
    if (!result?.id) return;
    const current = snapshot(result.findings, applied);
    if (current === lastSaved.current) return;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/audits/${result.id}`, {
          method: "PATCH",
          headers: ownerHeaders(),
          body: current,
        });
        if (res.ok) {
          lastSaved.current = current;
          setHistoryKey((k) => k + 1);
        }
      } catch {}
    }, 700);

    return () => clearTimeout(t);
  }, [applied, result]);

  const remaining = result
    ? result.findings.filter((f) => !applied.has(f.id))
    : [];
  const liveScore = result ? computeScore(remaining) : 0;
  const visible = result
    ? result.findings.filter((f) => filter === "all" || f.category === filter)
    : [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold">Website Growth Auditor</h1>
        <p className="text-gray-600">
          Find what&apos;s costing you traffic and conversions, with fixes you
          can use.
        </p>
      </header>

      <AuditForm onSubmit={runAudit} loading={loading} />

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {result && (
        <>
          {!result.id && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
              This audit couldn&apos;t be saved to your history, but it&apos;s
              fully usable here.
            </div>
          )}

          <ScoreCard
            score={liveScore}
            summary={result.summary}
            url={result.url}
            fixedCount={applied.size}
            total={result.findings.length}
          />

          <div className="flex flex-wrap gap-2 text-sm">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full border px-3 py-1 ${
                  filter === c
                    ? "bg-black text-white border-black"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visible.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                context={result.context}
                applied={applied.has(f.id)}
                onToggleApplied={() => toggleApplied(f.id)}
                onUpdateFix={updateFix}
              />
            ))}
          </div>
        </>
      )}

      <HistoryList
        refreshKey={historyKey}
        activeId={result?.id}
        onSelect={openSaved}
        onDeleted={(id) => {
          if (result?.id === id) setResult(null);
        }}
      />
    </main>
  );
}
