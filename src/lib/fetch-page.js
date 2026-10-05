// lib/fetch-page.js
const PRIVATE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/;

export async function fetchPage(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    PRIVATE.test(url.hostname)
  ) {
    throw new Error("That URL isn't allowed.");
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GrowthAuditorBot/1.0)" },
    signal: AbortSignal.timeout(10000),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`The site responded with status ${res.status}.`);
  if (!(res.headers.get("content-type") || "").includes("text/html")) {
    throw new Error("That URL didn't return an HTML page.");
  }

  const html = (await res.text()).slice(0, 2_000_000); // cap at ~2MB
  return { html, finalUrl: res.url };
}
