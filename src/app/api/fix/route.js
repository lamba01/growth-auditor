import { z } from "zod";
import { generateWithFallback, isBusy } from "@/lib/ai";

export const maxDuration = 30;

const FixSchema = z.object({
  content: z
    .string()
    .describe("The rewritten, ready-to-use copy and nothing else"),
});

const LIMITS = {
  seo_title: "Keep it between 50 and 60 characters.",
  meta_description: "Keep it between 140 and 160 characters.",
};

export async function POST(req) {
  try {
    const { finding, context, instruction } = await req.json();
    if (!finding?.fix?.type || !context) {
      return Response.json(
        { error: "Missing finding or context." },
        { status: 400 },
      );
    }

    const { object } = await generateWithFallback({
      schema: FixSchema,
      system: `You are an expert website copywriter and SEO specialist. Rewrite a single piece of website copy.
Rules:
- Use only facts present in the page context. Never invent services, locations, statistics or testimonials.
- Return only the copy itself, with no labels, quotes or explanations.
- ${LIMITS[finding.fix.type] ?? "Match the length and format a real website would use."}`,
      prompt: `Page context:
${JSON.stringify(context, null, 2)}

Issue found: ${finding.issue}
Evidence: ${finding.evidence}
Copy type: ${finding.fix.type.replace(/_/g, " ")}

Current suggested copy:
${finding.fix.content}

Rewrite it. ${instruction ? `Extra instruction from the user: ${instruction}` : "Offer a clearly different alternative."}`,
    });

    return Response.json({ content: object.content.trim() });
  } catch (e) {
    console.error(e);
    const msg = isBusy(e)
      ? "The AI service is busy right now. Please try again in a minute."
      : e.message || "Could not regenerate.";
    return Response.json({ error: msg }, { status: isBusy(e) ? 503 : 500 });
  }
}
