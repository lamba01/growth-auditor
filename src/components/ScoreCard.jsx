import { CATEGORY_LABELS, CATEGORY_ORDER, scoreTone } from "@/lib/labels";

const R = 80;
const LEN = Math.PI * R;
const ARC = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`;

function Ticks() {
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI - (i / 10) * Math.PI;
    const major = i % 5 === 0;
    const r1 = 91;
    const r2 = major ? 100 : 96;
    ticks.push(
      <line
        key={i}
        x1={(100 + r1 * Math.cos(a)).toFixed(2)}
        y1={(100 - r1 * Math.sin(a)).toFixed(2)}
        x2={(100 + r2 * Math.cos(a)).toFixed(2)}
        y2={(100 - r2 * Math.sin(a)).toFixed(2)}
        stroke="var(--color-line)"
        strokeWidth={major ? 1.6 : 1}
        strokeLinecap="round"
      />,
    );
  }
  return <>{ticks}</>;
}

export default function ScoreCard({ score, summary, url, findings, applied }) {
  const tone = scoreTone(score);
  const total = findings.length;
  const fixed = findings.filter((f) => applied.has(f.id)).length;

  const rows = CATEGORY_ORDER.map((key) => {
    const inCat = findings.filter((f) => f.category === key);
    const open = inCat.filter((f) => !applied.has(f.id)).length;
    return { key, total: inCat.length, open };
  }).filter((r) => r.total > 0);

  return (
    <div className="rounded-3xl border border-line bg-paper p-6 shadow-[0_18px_40px_-28px_rgba(20,35,31,0.35)]">
      {url && (
        <p className="truncate text-sm font-medium text-muted" title={url}>
          {url}
        </p>
      )}

      <div className="mt-3 flex flex-col items-center">
        <svg
          viewBox="0 0 200 130"
          className="w-full max-w-[280px]"
          role="img"
          aria-label={`Score ${score} out of 100`}
        >
          <Ticks />
          <path
            d={ARC}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={ARC}
            className="gauge-arc"
            fill="none"
            stroke={tone.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            style={{
              "--gauge-len": LEN,
              strokeDasharray: LEN,
              strokeDashoffset: LEN * (1 - score / 100),
            }}
          />
          <text
            x="100"
            y="94"
            textAnchor="middle"
            className="fill-ink"
            style={{ fontSize: 46, fontWeight: 600, letterSpacing: "-0.03em" }}
          >
            {score}
          </text>
          <text
            x="100"
            y="118"
            textAnchor="middle"
            className="fill-muted"
            style={{ fontSize: 12 }}
          >
            {tone.word}
          </text>
        </svg>

        <p className="mt-1 text-sm text-muted">
          {fixed} of {total} issues fixed
        </p>
      </div>

      <p className="mt-6 font-prose text-[17px] leading-relaxed">{summary}</p>

      <ul className="mt-7 space-y-4 border-t border-line pt-6">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{CATEGORY_LABELS[r.key]}</span>
              <span className="text-muted">
                {r.open === 0 ? "All fixed" : `${r.open} open`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-good transition-[width] duration-500"
                style={{ width: `${((r.total - r.open) / r.total) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
