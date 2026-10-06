import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

const MODELS = ["gemini-3.5-flash-lite"];

export function isBusy(e) {
  return e?.isRetryable || e?.statusCode === 503 || e?.statusCode === 429;
}

export async function generateWithFallback(args) {
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
      if (!isBusy(e)) throw e;
      console.warn(`${id} unavailable, trying next model`);
    }
  }
  throw lastError;
}
