// lib/audit-schema.js
import { z } from "zod";

export const CategorySchema = z.enum(["conversion", "seo", "trust", "ux"]);
export const SeveritySchema = z.enum(["low", "medium", "high"]);

export const FindingSchema = z.object({
  id: z.string().describe("Short stable slug, e.g. 'missing-meta-description'"),
  issue: z.string().describe("One-line summary of the problem"),
  category: CategorySchema,
  severity: SeveritySchema,
  evidence: z
    .string()
    .describe("What on the page shows this issue, quoted or described"),
  explanation: z.string().describe("Why this hurts the site"),
  recommendation: z.string().describe("What to do about it"),
  fix: z
    .object({
      type: z.enum([
        "seo_title",
        "meta_description",
        "headline",
        "cta",
        "service_description",
        "faq",
        "gbp_description",
        "content_ideas",
      ]),
      content: z.string(),
    })
    .nullable()
    .describe(
      "Ready-to-use replacement copy, or null if the issue can't be fixed with copy",
    ),
});

export const AuditResultSchema = z.object({
  summary: z.string().describe("2-3 sentence overall assessment"),
  findings: z.array(FindingSchema).max(15),
});
