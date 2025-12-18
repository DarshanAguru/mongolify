import type { Condition, ExistsOperator, Filter, InOperator, RangeOperator, RegexOperator } from "./types.js";


export const applyFilterToArray = <T extends Record<string, any>>(
  items: readonly T[],
  filter: Filter<T>
): T[] => {
  const match = (item: T, f: Filter<T>): boolean => {
    // Handle $or first: at least one condition must match
    if (Array.isArray(f.$or) && f.$or.length > 0) {
      const orOk = f.$or.some((cond) => {
        // A cond can include multiple fields; ALL of them must match for that cond
        return Object.entries(cond).every(([field, expr]) =>
          fieldMatch(item, field as keyof T, expr as Condition<T[typeof field]>)
        );
      });
      if (!orOk) return false;
    }

    // Handle other fields (excluding $or)
    for (const key of Object.keys(f) as (keyof T)[]) {
      if (key === '$or') continue;
      const expr = f[key];
      if (!fieldMatch(item, key, expr as Condition<T[typeof key]>)) return false;
    }

    return true;
  };

  // Field-level matcher with type-aware operators
  const fieldMatch = <K extends keyof T>(
    item: T,
    key: K,
    expr: Condition<T[K]> | undefined
  ): boolean => {
    if (expr === undefined) return true;

    const val = item[key] as T[K];

    // Exists
    if (isExistsOperator(expr)) {
      const exists = val !== undefined && val !== null;
      return expr.$exists ? exists : !exists;
    }

    // Range (only for number/Date)
    if (isRangeOperator(expr)) {
      if (expr.$gte != null) {
        if (!gte(val, expr.$gte)) return false;
      }
      if (expr.$lte != null) {
        if (!lte(val, expr.$lte)) return false;
      }
      return true;
    }

    // In
    if (isInOperator(expr)) {
      // Using Set for O(1) membership
      const set = new Set(expr.$in as readonly unknown[]);
      const v = val as unknown;
      if(Array.isArray(v))
      {
        return v.some((element) => set.has(element as unknown));
      }
      return set.has(v as unknown);
    }

    // Regex (only if the value is string-like)
    if (isRegexOperator(expr)) {
      const re = expr.$regex instanceof RegExp ? expr.$regex : new RegExp(expr.$regex);
      return re.test(String(val ?? ''));
    }

    // Simple equality (strict)
    return Object.is(val as unknown, expr as unknown);
  };

  return items.filter((i) => match(i, filter));
};

/** Type guards */
function isExistsOperator(x: unknown): x is ExistsOperator {
  return !!x && typeof x === 'object' && '$exists' in (x as any);
}
function isRangeOperator<T>(x: unknown): x is RangeOperator<T> {
  return !!x && typeof x === 'object' && ('$gte' in (x as any) || '$lte' in (x as any));
}
function isInOperator<T>(x: unknown): x is InOperator<T> {
  return !!x && typeof x === 'object' && '$in' in (x as any) && Array.isArray((x as any).$in);
}
function isRegexOperator(x: unknown): x is RegexOperator {
  return !!x && typeof x === 'object' && '$regex' in (x as any);
}

/** Comparators that support number and Date */
function gte(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() >= b.getTime();
  return (a as number) >= (b as number);
}
function lte(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() <= b.getTime();
  return (a as number) <= (b as number);
}
