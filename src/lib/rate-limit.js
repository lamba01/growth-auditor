import { createHash } from "node:crypto";
import { sql } from "@/lib/db";

const num = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// Override any of these with environment variables
export const LIMITS = {
  audit: {
    perIp: num(process.env.AUDITS_PER_IP_PER_DAY, 5),
    global: num(process.env.AUDITS_GLOBAL_PER_DAY, 100),
  },
  fix: {
    perIp: num(process.env.FIXES_PER_IP_PER_DAY, 30),
    global: num(process.env.FIXES_GLOBAL_PER_DAY, 500),
  },
};

export function getClientIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "local";
}

function hashIp(ip) {
  const salt = process.env.RATE_LIMIT_SALT || "growth-auditor";
  return createHash("sha256")
    .update(`${ip}:${salt}`)
    .digest("hex")
    .slice(0, 32);
}

// Fixed window: counters reset at midnight UTC
function currentWindow() {
  const now = new Date();
  return {
    day: now.toISOString().slice(0, 10),
    reset: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    ),
  };
}

async function hit(key, reset) {
  const rows = await sql`
    insert into rate_limits (key, count, expires_at)
    values (${key}, 1, ${reset.toISOString()})
    on conflict (key) do update set count = rate_limits.count + 1
    returning count`;
  return rows[0].count;
}

async function release(key) {
  try {
    await sql`update rate_limits set count = greatest(count - 1, 0) where key = ${key}`;
  } catch (e) {
    console.error("Rate limit refund failed:", e);
  }
}

/**
 * Take one use from the visitor's daily allowance and the global one.
 * Returns { ok: true, remaining, limit, refund } or { ok: false, reason, ... }.
 * Call refund() if the work failed for a reason that wasn't the visitor's fault.
 */
export async function takeToken(req, scope, { perIp, global }) {
  const noun = scope === "fix" ? "rewrites" : "audits";
  const { day, reset } = currentWindow();
  const base = { limit: perIp, noun, reset };

  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return { ok: true, remaining: null, limit: null, refund: async () => {} };
  }

  const ipKey = `${scope}:ip:${hashIp(getClientIp(req))}:${day}`;
  const globalKey = `${scope}:global:${day}`;

  try {
    // Housekeeping: clear out old windows now and then
    if (Math.random() < 0.02) {
      await sql`delete from rate_limits where expires_at < now()`;
    }

    const ipCount = await hit(ipKey, reset);
    if (ipCount > perIp) {
      await release(ipKey);
      return { ok: false, reason: "ip", ...base };
    }

    const globalCount = await hit(globalKey, reset);
    if (globalCount > global) {
      await release(globalKey);
      await release(ipKey);
      return { ok: false, reason: "global", ...base };
    }

    return {
      ok: true,
      remaining: perIp - ipCount,
      limit: perIp,
      refund: async () => {
        await release(ipKey);
        await release(globalKey);
      },
    };
  } catch (e) {
    console.error("Rate limiter error:", e);
    // In production, fail closed so a database problem can't open the floodgates
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "unavailable", ...base };
    }
    return { ok: true, remaining: null, limit: null, refund: async () => {} };
  }
}

export function limitResponse(gate) {
  const secs = Math.max(
    1,
    Math.ceil((gate.reset.getTime() - Date.now()) / 1000),
  );
  const hours = Math.ceil(secs / 3600);
  const messages = {
    ip: `You've used all ${gate.limit} free ${gate.noun} for today. The limit resets in about ${hours} ${
      hours === 1 ? "hour" : "hours"
    }.`,
    global: `Free ${gate.noun} are at capacity for today. Try again tomorrow.`,
    unavailable:
      "Usage limits couldn't be checked right now. Try again in a minute.",
  };
  return Response.json(
    { error: messages[gate.reason], resetAt: gate.reset.toISOString() },
    {
      status: gate.reason === "unavailable" ? 503 : 429,
      headers: { "Retry-After": String(secs) },
    },
  );
}
