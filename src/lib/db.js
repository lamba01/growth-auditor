import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v) {
  return typeof v === "string" && UUID.test(v);
}

export function getOwnerId(req) {
  const id = req.headers.get("x-owner-id");
  return isUuid(id) ? id : null;
}
