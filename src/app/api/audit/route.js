import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { AuditResultSchema } from "@/lib/audit-schema";
import { extractSignals } from "@/lib/extract";
import { fetchPage } from "@/lib/fetch-page";
import { computeScore } from "@/lib/score";
import { AUDITOR_SYSTEM_PROMPT } from "@/lib/prompts";

export const maxDuration = 60;

// Best first. Use model IDs from Google's current model list.
const MODELS = ["gemini-3.5-flash-lite"];

function isBusy(e) {
  return e?.isRetryable || e?.statusCode === 503 || e?.statusCode === 429;
}

async function generateWithFallback(args) {
  let lastError;
  for (const id of MODELS) {
    try {
      return await generateObject({
        ...args,
        model: google(id),
        maxRetries: 1,
      });
    } catch (e) {
      lastError = e;
      if (!isBusy(e)) throw e; // schema errors, bad key, etc. should surface
      console.warn(`${id} unavailable, trying next model`);
    }
  }
  throw lastError;
}

export async function POST(req) {
  try {
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

    // Normalize: a fix is either complete or null; ids are unique
    const seen = new Set();
    const findings = object.findings.map((f, i) => {
      let id = f.id || `finding-${i}`;
      if (seen.has(id)) id = `${id}-${i}`;
      seen.add(id);
      return { ...f, id, fix: f.fix?.content?.trim() ? f.fix : null };
    });

    return Response.json({
      url: signals.url,
      score: computeScore(findings),
      summary: object.summary,
      findings,
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
