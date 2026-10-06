export default function ScoreCard({ score, summary, url, fixedCount, total }) {
  const color =
    score >= 80
      ? "text-green-600"
      : score >= 55
        ? "text-amber-500"
        : "text-red-600";
  return (
    <div className="flex items-center gap-6 rounded-xl border border-gray-200 p-6">
      <div className="text-center">
        <div className={`text-6xl font-bold ${color}`}>{score}</div>
        <div className="text-xs text-gray-500">out of 100</div>
      </div>
      <div>
        {url && <div className="text-sm text-gray-500">{url}</div>}
        <p className="mt-1 text-gray-800">{summary}</p>
        <p className="mt-2 text-xs text-gray-500">
          {fixedCount} of {total} issues marked as fixed
        </p>
      </div>
    </div>
  );
}
