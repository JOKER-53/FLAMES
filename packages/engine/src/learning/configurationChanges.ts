export interface ConfigurationChange { path: string; type: "added" | "removed" | "changed" | "moved"; before?: unknown; after?: unknown; }
/** Compare student-owned snapshots. No reference solution or executable content is involved. */
export function compareConfigurations(before: unknown, after: unknown) {
 const changes: ConfigurationChange[] = []; let truncated = false;
 const add = (change: ConfigurationChange) => { if (changes.length < 200) changes.push(change); else truncated = true; };
 const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
 const identity = (row: unknown): string | null => { if (!record(row)) return null; const key = row.id ?? row.portId ?? row.name; return typeof key === "string" || typeof key === "number" ? `${typeof key}:${key}` : null; };
 function visit(old: unknown, next: unknown, path: string, depth = 0) {
  if (truncated || old === next) return;
  if (old === undefined) { add({ path, type: "added", after: next }); return; }
  if (next === undefined) { add({ path, type: "removed", before: old }); return; }
  if (depth >= 12) { add({ path, type: "changed", before: old, after: next }); return; }
  if (Array.isArray(old) && Array.isArray(next)) {
   const oldIds = old.map(identity), nextIds = next.map(identity);
   const keyed = [...oldIds,...nextIds].every(id => id !== null) && new Set(oldIds).size === old.length && new Set(nextIds).size === next.length;
   if (keyed) {
    const previous = new Map(oldIds.map((id,i) => [id!, { value: old[i], index: i }]));
    const current = new Map(nextIds.map((id,i) => [id!, { value: next[i], index: i }]));
    for (const id of new Set([...oldIds,...nextIds])) {
     const a = previous.get(id!), b = current.get(id!); const rowPath = `${path}[${id!.slice(id!.indexOf(":")+1)}]`;
     if (a && b && a.index !== b.index) add({ path: `${rowPath} order`, type: "moved", before: a.index + 1, after: b.index + 1 });
     visit(a?.value,b?.value,rowPath,depth+1);
    }
   } else if (JSON.stringify(old) !== JSON.stringify(next)) add({ path, type: "changed", before: old, after: next });
   return;
  }
  if (record(old) && record(next)) { for (const key of new Set([...Object.keys(old),...Object.keys(next)])) visit(old[key],next[key],path ? `${path}.${key}` : key,depth+1); return; }
  if (JSON.stringify(old) !== JSON.stringify(next)) add({ path, type: "changed", before: old, after: next });
 }
 visit(before,after,"Configuration"); return { changes, truncated };
}
