/** Normalize a free-text or comma-separated locations field into a clean string[]. Dedupes case-insensitively. */
export function normalizeLocations(raw: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  if (Array.isArray(raw)) {
    for (const v of raw) {
      if (typeof v === "string") add(v);
    }
    return out;
  }
  if (typeof raw === "string") {
    for (const part of raw.split(/[,\n]/g)) add(part);
    return out;
  }
  return out;
}
