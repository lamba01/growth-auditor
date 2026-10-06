const PENALTY = { high: 10, medium: 5, low: 2 };

export function computeScore(findings) {
  const penalty = findings.reduce((sum, f) => sum + PENALTY[f.severity], 0);
  return Math.max(0, 100 - penalty);
}
