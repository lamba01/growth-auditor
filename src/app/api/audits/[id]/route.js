import { z } from "zod";
import { sql, getOwnerId, isUuid } from "@/lib/db";
import { FindingSchema } from "@/lib/audit-schema";

const PatchSchema = z.object({
  applied: z.array(z.string()).max(50),
  findings: z.array(FindingSchema).max(15),
});

async function guard(req, params) {
  const { id } = await params;
  const ownerId = getOwnerId(req);
  if (!ownerId || !isUuid(id))
    return { error: Response.json({ error: "Not found." }, { status: 404 }) };
  return { id, ownerId };
}

export async function GET(req, { params }) {
  const g = await guard(req, params);
  if (g.error) return g.error;

  const rows = await sql`
    select id, url, score, summary, findings, context, applied
    from audits where id = ${g.id} and owner_id = ${g.ownerId}`;
  if (!rows.length)
    return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json(rows[0]);
}

export async function PATCH(req, { params }) {
  const g = await guard(req, params);
  if (g.error) return g.error;

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success)
    return Response.json({ error: "Invalid data." }, { status: 400 });

  const { applied, findings } = parsed.data;
  await sql`
    update audits
    set applied = ${JSON.stringify(applied)}::jsonb,
        findings = ${JSON.stringify(findings)}::jsonb
    where id = ${g.id} and owner_id = ${g.ownerId}`;
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const g = await guard(req, params);
  if (g.error) return g.error;

  await sql`delete from audits where id = ${g.id} and owner_id = ${g.ownerId}`;
  return Response.json({ ok: true });
}
