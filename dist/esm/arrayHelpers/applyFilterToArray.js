export const applyFilterToArray = (items, filter) => {
    const match = (item, f) => {
        // Handle $or first: at least one condition must match
        if (Array.isArray(f.$or) && f.$or.length > 0) {
            const orOk = f.$or.some((cond) => {
                // A cond can include multiple fields; ALL of them must match for that cond
                return Object.entries(cond).every(([field, expr]) => fieldMatch(item, field, expr));
            });
            if (!orOk)
                return false;
        }
        // Handle other fields (excluding $or)
        for (const key of Object.keys(f)) {
            if (key === '$or')
                continue;
            const expr = f[key];
            if (!fieldMatch(item, key, expr))
                return false;
        }
        return true;
    };
    // Field-level matcher with type-aware operators
    const fieldMatch = (item, key, expr) => {
        if (expr === undefined)
            return true;
        const val = item[key];
        // Exists
        if (isExistsOperator(expr)) {
            const exists = val !== undefined && val !== null;
            return expr.$exists ? exists : !exists;
        }
        // Range (only for number/Date)
        if (isRangeOperator(expr)) {
            if (expr.$gte != null) {
                if (!gte(val, expr.$gte))
                    return false;
            }
            if (expr.$lte != null) {
                if (!lte(val, expr.$lte))
                    return false;
            }
            return true;
        }
        // In
        if (isInOperator(expr)) {
            // Using Set for O(1) membership
            const set = new Set(expr.$in);
            return set.has(val);
        }
        // Regex (only if the value is string-like)
        if (isRegexOperator(expr)) {
            const re = expr.$regex instanceof RegExp ? expr.$regex : new RegExp(expr.$regex);
            return re.test(String(val ?? ''));
        }
        // Simple equality (strict)
        return Object.is(val, expr);
    };
    return items.filter((i) => match(i, filter));
};
/** Type guards */
function isExistsOperator(x) {
    return !!x && typeof x === 'object' && '$exists' in x;
}
function isRangeOperator(x) {
    return !!x && typeof x === 'object' && ('$gte' in x || '$lte' in x);
}
function isInOperator(x) {
    return !!x && typeof x === 'object' && '$in' in x && Array.isArray(x.$in);
}
function isRegexOperator(x) {
    return !!x && typeof x === 'object' && '$regex' in x;
}
/** Comparators that support number and Date */
function gte(a, b) {
    if (a instanceof Date && b instanceof Date)
        return a.getTime() >= b.getTime();
    return a >= b;
}
function lte(a, b) {
    if (a instanceof Date && b instanceof Date)
        return a.getTime() <= b.getTime();
    return a <= b;
}
