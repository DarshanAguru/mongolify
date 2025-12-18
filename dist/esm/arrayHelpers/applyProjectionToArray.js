/**
 * Mirrors the original behavior:
 * - If any value in `projection` is 1 → include mode (keep only those 1 fields).
 * - Else → exclude mode (remove fields marked 0).
 *
 * Returns Partial<T>[] since type-level inference of mode from `projection` isn't feasible.
 */
export function applyProjectionToArray(items, projection) {
    const hasAny = Object.keys(projection).length > 0;
    if (!hasAny)
        return items.map((it) => ({ ...it }));
    const includeMode = Object.values(projection).some((v) => v === 1);
    return items.map((it) => {
        if (includeMode) {
            const out = {};
            for (const f of Object.keys(projection)) {
                if (projection[f] === 1) {
                    out[f] = it[f];
                }
            }
            return out;
        }
        else {
            const out = { ...it };
            for (const f of Object.keys(projection)) {
                if (projection[f] === 0) {
                    delete out[f];
                }
            }
            return out;
        }
    });
}
