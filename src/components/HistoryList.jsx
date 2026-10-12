"use client";
import { useEffect, useState } from "react";
import { ownerHeaders } from "@/lib/owner";
import { scoreTone } from "@/lib/labels";

export default function HistoryList({
  refreshKey,
  activeId,
  onSelect,
  onDeleted,
}) {
  const [audits, setAudits] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audits", { headers: ownerHeaders() })
      .then((r) => r.json())
      .then((d) => !cancelled && setAudits(d.audits ?? []))
      .catch(() => !cancelled && setAudits([]));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function remove(id) {
    await fetch(`/api/audits/${id}`, {
      method: "DELETE",
      headers: ownerHeaders(),
    });
    setAudits((prev) => prev.filter((a) => a.id !== id));
    onDeleted(id);
  }

  if (!audits || audits.length === 0) return null;

  return (
    <section className="mt-20">
      <h2 className="text-xl font-semibold tracking-tight">Past audits</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {audits.map((a) => {
          const tone = scoreTone(a.score);
          const active = a.id === activeId;
          return (
            <li
              key={a.id}
              className={`flex items-center gap-2 ${active ? "bg-paper" : ""}`}
            >
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                aria-current={active ? "true" : undefined}
                className="flex min-w-0 flex-1 items-center gap-5 px-2 py-4 text-left"
              >
                <span
                  className={`w-12 shrink-0 text-3xl font-semibold tracking-tight ${tone.text}`}
                >
                  {a.score}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {a.url ?? "Pasted HTML"}
                  </span>
                  <span className="block text-sm text-muted">
                    {new Date(a.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
                <span className="ml-auto hidden shrink-0 text-sm text-muted sm:block">
                  {a.applied_count} of {a.total} fixed
                </span>
              </button>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="shrink-0 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-bad"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
