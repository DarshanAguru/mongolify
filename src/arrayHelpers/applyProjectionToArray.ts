import type { Projection } from "./types.js";

/**
 * Mirrors the original behavior:
 * - If any value in `projection` is 1 → include mode (keep only those 1 fields).
 * - Else → exclude mode (remove fields marked 0).
 *
 * Returns Partial<T>[] since type-level inference of mode from `projection` isn't feasible.
 */
export function applyProjectionToArray<T extends Record<string, any>>(
  items: readonly T[],
  projection: Projection<T>
): Partial<T>[] {
  const hasAny = Object.keys(projection as Record<string, 0 | 1>).length > 0;
  if (!hasAny) return items.map((it) => ({ ...it }));

  const includeMode = Object.values(projection).some((v) => v === 1);

  return items.map((it) => {
    if (includeMode) {
      const out: Partial<T> = {};
      for (const f of Object.keys(projection) as (keyof T)[]) {
        if (projection[f] === 1) {
          (out as any)[f] = it[f];
        }
      }
      return out;
    } else {
      const out: Partial<T> = { ...it };
      for (const f of Object.keys(projection) as (keyof T)[]) {
        if (projection[f] === 0) {
          delete (out as any)[f];
        }
      }
      return out;
    }
  });
}
