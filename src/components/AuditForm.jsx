"use client";
import { useState } from "react";

export default function AuditForm({ onSubmit, loading }) {
  const [mode, setMode] = useState("url");
  const [value, setValue] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(mode === "url" ? { url: value.trim() } : { html: value });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2 text-sm">
        {["url", "html"].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setValue("");
            }}
            className={`rounded-full px-3 py-1 border ${
              mode === m
                ? "bg-black text-white border-black"
                : "border-gray-300 text-gray-600"
            }`}
          >
            {m === "url" ? "Website URL" : "Paste HTML"}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="example.com"
          className="w-full rounded-lg border border-gray-300 px-4 py-3"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste the page's HTML here (View Source → copy all)"
          rows={8}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm"
        />
      )}

      <button
        disabled={loading || !value.trim()}
        className="rounded-lg bg-black px-5 py-3 text-white disabled:opacity-40"
      >
        {loading ? "Auditing… (up to 30s)" : "Run audit"}
      </button>
    </form>
  );
}
