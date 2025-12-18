import type { Projection } from "./types.js";
/**
 * Mirrors the original behavior:
 * - If any value in `projection` is 1 → include mode (keep only those 1 fields).
 * - Else → exclude mode (remove fields marked 0).
 *
 * Returns Partial<T>[] since type-level inference of mode from `projection` isn't feasible.
 */
export declare function applyProjectionToArray<T extends Record<string, any>>(items: readonly T[], projection: Projection<T>): Partial<T>[];
