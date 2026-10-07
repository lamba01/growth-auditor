import { AuditResultSchema } from "@/lib/audit-schema";
import { extractSignals } from "@/lib/extract";
import { fetchPage } from "@/lib/fetch-page";
import { computeScore } from "@/lib/score";
import { AUDITOR_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateWithFallback, isBusy } from "@/lib/ai";
import { sql, getOwnerId } from "@/lib/db";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const ownerId = getOwnerId(req);
    const { url, html } = await req.json();
    if (!url && !html) {
      return Response.json(
        { error: "Provide a URL or pasted HTML." },
        { status: 400 },
      );
    }

    let signals;
    if (html) {
      signals = extractSignals(html, url || null);
    } else {
      const page = await fetchPage(url);
      signals = extractSignals(page.html, page.finalUrl);
    }

    if (signals.wordCount < 30) {
      return Response.json(
        {
          error:
            "Very little content found. The site may be JavaScript-rendered. Try pasting the HTML instead.",
        },
        { status: 422 },
      );
    }

    const { object } = await generateWithFallback({
      schema: AuditResultSchema,
      system: AUDITOR_SYSTEM_PROMPT,
      prompt: `Audit this page:\n\n${JSON.stringify(signals, null, 2)}`,
    });

    const seen = new Set();
    const findings = object.findings.map((f, i) => {
      let id = f.id || `finding-${i}`;
      if (seen.has(id)) id = `${id}-${i}`;
      seen.add(id);
      return { ...f, id, fix: f.fix?.content?.trim() ? f.fix : null };
    });

    const context = {
      url: signals.url,
      title: signals.title,
      metaDescription: signals.metaDescription,
      h1: signals.h1,
      h2: signals.h2,
      ctas: signals.ctas,
      textSnippet: signals.text.slice(0, 4000),
    };

    const score = computeScore(findings);

    // Save, but never let a database problem lose the audit the user just waited for
    let id = null;
    if (ownerId) {
      try {
        const rows = await sql`
          insert into audits (owner_id, url, score, summary, findings, context)
          values (${ownerId}, ${signals.url}, ${score}, ${object.summary},
                  ${JSON.stringify(findings)}::jsonb, ${JSON.stringify(context)}::jsonb)
          returning id`;
        id = rows[0].id;
      } catch (dbErr) {
        console.error("Failed to save audit:", dbErr);
      }
    }

    return Response.json({
      id,
      url: signals.url,
      score,
      summary: object.summary,
      findings,
      context,
      applied: [],
    });
  } catch (e) {
    console.error(e);
    if (isBusy(e)) {
      return Response.json(
        {
          error:
            "The AI service is busy right now. Please try again in a minute.",
        },
        { status: 503 },
      );
    }
    return Response.json(
      { error: e.message || "Audit failed." },
      { status: 500 },
    );
  }
}
