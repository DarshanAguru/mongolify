import type { SortSpec } from "./types.js";
/**
 * Type-safe multi-field sort.
 * Returns a sorted copy; original `items` is not mutated.
 */
export declare function applySortToArray<T extends Record<string, any>>(items: readonly T[], sort: SortSpec<T>): T[];
