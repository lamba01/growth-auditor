"use client";
import { useEffect, useState } from "react";
import { ownerHeaders } from "@/lib/owner";

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

  async function remove(id, e) {
    e.stopPropagation();
    await fetch(`/api/audits/${id}`, {
      method: "DELETE",
      headers: ownerHeaders(),
    });
    setAudits((prev) => prev.filter((a) => a.id !== id));
    onDeleted(id);
  }

  if (!audits || audits.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-medium uppercase text-gray-500">
        Past audits
      </h2>
      <div className="space-y-2">
        {audits.map((a) => (
          <div
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-2 text-sm ${
              a.id === activeId
                ? "border-black"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium">
                {a.url ?? "Pasted HTML"}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(a.created_at).toLocaleDateString()} · score {a.score}{" "}
                · {a.applied_count}/{a.total} fixed
              </div>
            </div>
            <button
              onClick={(e) => remove(a.id, e)}
              className="ml-3 text-xs text-gray-400 hover:text-red-600"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
