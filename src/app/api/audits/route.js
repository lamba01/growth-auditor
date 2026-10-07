import { sql, getOwnerId } from "@/lib/db";

export async function GET(req) {
  const ownerId = getOwnerId(req);
  if (!ownerId) return Response.json({ audits: [] });

  try {
    const audits = await sql`
      select id, url, score, created_at,
             jsonb_array_length(findings) as total,
             jsonb_array_length(applied) as applied_count
      from audits
      where owner_id = ${ownerId}
      order by created_at desc
      limit 50`;
    return Response.json({ audits });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Could not load history." }, { status: 500 });
  }
}
