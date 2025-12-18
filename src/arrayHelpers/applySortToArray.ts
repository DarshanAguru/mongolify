import type { SortDirection, SortSpec } from "./types.js";

/**
 * Compare two values of common sortable types.
 * - undefined/null are always considered greater (pushed to the end in asc)
 * - Date compared by time value
 * - string by localeCompare
 * - number/boolean by numeric comparison (boolean: false < true)
 */
function compareValues(a: unknown, b: unknown): number {
  // Handle equality (including NaN via Object.is)
  if (Object.is(a, b)) return 0;

  // Nullish handling: push null/undefined to the end in ascending
  const aNullish = a === null || a === undefined;
  const bNullish = b === null || b === undefined;
  if (aNullish && !bNullish) return 1;
  if (!aNullish && bNullish) return -1;
  if (aNullish && bNullish) return 0;

  // Date
  if (a instanceof Date && b instanceof Date) {
    const at = a.getTime();
    const bt = b.getTime();
    return at < bt ? -1 : at > bt ? 1 : 0;
  }

  // String
  if (typeof a === 'string' && typeof b === 'string') {
    // localeCompare is stable and handles Unicode
    return a.localeCompare(b);
  }

  // Number
  if (typeof a === 'number' && typeof b === 'number') {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // Boolean (false < true)
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (a === b) ? 0 : (a ? 1 : -1);
  }

  // Fallback: convert to string and compare (least desirable, but safe)
  const as = String(a);
  const bs = String(b);
  return as < bs ? -1 : as > bs ? 1 : 0;
}

/**
 * Type-safe multi-field sort.
 * Returns a sorted copy; original `items` is not mutated.
 */
export function applySortToArray<T extends Record<string, any>>(
  items: readonly T[],
  sort: SortSpec<T>
): T[] {
  const sortEntries = Object.entries(sort) as [keyof T, SortDirection][];

  if (sortEntries.length === 0) return [...items];

  // Create a shallow copy to avoid mutating the input
  const copy = [...items];

  copy.sort((a, b) => {
    for (const [field, dir] of sortEntries) {
      const av = a[field];
      const bv = b[field];

      const cmp = compareValues(av, bv);
      if (cmp !== 0) return dir === 1 ? cmp : -cmp;
    }
    return 0;
  });

  return copy;
}
