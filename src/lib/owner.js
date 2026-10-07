const KEY = "growth-auditor-owner";

export function getOwnerId() {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function ownerHeaders() {
  return { "Content-Type": "application/json", "x-owner-id": getOwnerId() };
}
