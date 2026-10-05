import { extractSignals } from "@/lib/extract";
import { fetchPage } from "@/lib/fetch-page";

export async function POST(req) {
  const { url, html } = await req.json();
  try {
    if (html) return Response.json(extractSignals(html));
    const page = await fetchPage(url);
    return Response.json(extractSignals(page.html, page.finalUrl));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
