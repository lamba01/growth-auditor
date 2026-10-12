export const CATEGORY_ORDER = ["conversion", "seo", "trust", "ux", "design"];

export const CATEGORY_LABELS = {
  conversion: "Conversion",
  seo: "SEO",
  trust: "Trust",
  ux: "UX",
  design: "Design",
};

export const SEVERITY = {
  high: { label: "High priority", bar: "bg-bad" },
  medium: { label: "Medium priority", bar: "bg-warn" },
  low: { label: "Low priority", bar: "bg-steel" },
};

export function scoreTone(score) {
  if (score >= 80)
    return { text: "text-good", stroke: "#2e7d5b", word: "Healthy" };
  if (score >= 55)
    return { text: "text-warn", stroke: "#b7791f", word: "Needs work" };
  return { text: "text-bad", stroke: "#b9381f", word: "At risk" };
}
