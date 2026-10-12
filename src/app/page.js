"use client";
import { useEffect, useRef, useState } from "react";
import AuditForm from "@/components/AuditForm";
import ScoreCard from "@/components/ScoreCard";
import FindingCard from "@/components/FindingCard";
import HistoryList from "@/components/HistoryList";
import { computeScore } from "@/lib/score";
import { ownerHeaders } from "@/lib/owner";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/labels";

function snapshot(findings, appliedIds) {
  return JSON.stringify({ applied: [...appliedIds].sort(), findings });
}

function Logo() {
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#17433a" />
      <rect x="7" y="14" width="3.5" height="7" rx="1.2" fill="#f2f4f1" />
      <rect x="12.25" y="10" width="3.5" height="11" rx="1.2" fill="#f2f4f1" />
      <rect x="17.5" y="6" width="3.5" height="15" rx="1.2" fill="#f2f4f1" />
    </svg>
  );
}

function ReportSkeleton() {
  return (
    <div
      className="mt-14 grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14"
      aria-hidden="true"
    >
      <div className="h-115 animate-pulse rounded-3xl bg-line/60" />
      <div className="space-y-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-xl bg-line/60"
            style={{ opacity: 1 - i * 0.16 }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(new Set());
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);
  const lastSaved = useRef("");
  const [usage, setUsage] = useState(null);

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
      setUsage(data.usage ?? null);
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

  // Autosave progress (fixed items and rewritten copy) shortly after any change
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

  const tabs = result
    ? [
        { key: "all", label: "All", count: result.findings.length },
        ...CATEGORY_ORDER.map((key) => ({
          key,
          label: CATEGORY_LABELS[key],
          count: result.findings.filter((f) => f.category === key).length,
        })).filter((t) => t.count > 0),
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
      <header className="flex items-center gap-2.5 py-6">
        <Logo />
        <span className="text-lg font-semibold tracking-tight">
          Growth Auditor
        </span>
      </header>

      <section className="max-w-3xl pb-10 pt-8 sm:pt-14">
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Find what&apos;s costing your site customers.
        </h1>
        <p className="mt-5 max-w-xl font-prose text-xl leading-relaxed text-muted">
          Audit any page for SEO, conversion, trust, and design problems. Every
          finding comes with copy you can paste in.
        </p>
      </section>

      <div className="max-w-3xl">
        <AuditForm onSubmit={runAudit} loading={loading} />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 max-w-3xl rounded-2xl border border-bad/30 bg-bad/5 p-5"
        >
          <p className="font-medium text-bad">The audit didn&apos;t complete</p>
          <p className="mt-1 text-sm">{error}</p>
          <div className="max-w-3xl">
            <AuditForm onSubmit={runAudit} loading={loading} />
            {usage?.limit && (
              <p className="mt-3 px-1 text-sm text-muted">
                {usage.remaining} of {usage.limit} free audits left today.
              </p>
            )}
          </div>
        </div>
      )}

      {loading && <ReportSkeleton />}

      {result && !loading && (
        <div className="mt-14">
          {!result.id && (
            <p className="mb-6 rounded-2xl border border-warn/30 bg-warn/5 p-4 text-sm">
              This audit wasn&apos;t saved to your history. You can still use it
              on this page.
            </p>
          )}

          <div className="grid gap-10 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-14">
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <ScoreCard
                score={liveScore}
                summary={result.summary}
                url={result.url}
                findings={result.findings}
                applied={applied}
              />
            </aside>

            <section aria-label="Findings">
              <div className="flex flex-wrap gap-x-6 border-b border-line">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilter(t.key)}
                    aria-pressed={filter === t.key}
                    className={`-mb-px border-b-2 px-0.5 pb-3 text-sm font-medium transition-colors ${
                      filter === t.key
                        ? "border-ink text-ink"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {t.label} <span className="ml-1 text-muted">{t.count}</span>
                  </button>
                ))}
              </div>

              <div>
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
            </section>
          </div>
        </div>
      )}

      <HistoryList
        refreshKey={historyKey}
        activeId={result?.id}
        onSelect={openSaved}
        onDeleted={(id) => {
          if (result?.id === id) setResult(null);
        }}
      />
    </div>
  );
}
