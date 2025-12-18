import type { Filter } from "./types.js";
export declare const applyFilterToArray: <T extends Record<string, any>>(items: readonly T[], filter: Filter<T>) => T[];
