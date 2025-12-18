/**
 * Merge two Rule objects, with `overlay` properties taking precedence.
 * Useful when appending fields where you want defaults (e.g., type:'string', required:true)
 * and then override selectively (minLength, enum, etc.).
 */
const mergeRules = (base, overlay) => ({
    ...base,
    ...overlay,
});
/**
 * Flatten a nested RuleTree into a path → Rule map.
 *
 * Produces entries like:
 *  {
 *    "username": { type: 'string', required: true, ... },
 *    "address.street": { type: 'string', ... },
 *    "tags": { type: 'array', items: {...} }
 *  }
 *
 * @param tree    The root RuleTree to flatten
 * @param prefix  Accumulated prefix for nested paths (internal use)
 * @param out     Accumulator for flattened rules
 * @returns       A map of dotted-path → Rule
 */
const flatten = (tree, prefix = '', out = {}) => {
    for (const [k, child] of Object.entries(tree.children || {})) {
        // If child is an object with children, recurse to collect deeper paths
        if (child.type === 'object' && child.children) {
            flatten({ type: 'object', children: child.children }, prefix ? `${prefix}.${k}` : k, out);
        }
        else {
            // Leaf node: record with current dotted path
            out[prefix ? `${prefix}.${k}` : k] = child;
        }
    }
    return out;
};
/**
 * Apply endpoint-specific overrides to a RuleTree derived from Mongoose (or other sources).
 *
 * Semantics:
 * - include: whitelist of field paths to keep (if present, only included paths survive)
 * - exclude: remove these field paths
 * - optional: force `required=false` on these paths
 * - required: force `required=true` on these paths
 * - append: inject new fields not present in the base tree
 *
 * Paths use dot-notation for nested objects (e.g., "address.street").
 *
 * @param ruleTree   Base RuleTree to modify
 * @param overrides  Overrides controlling which fields to keep/modify/append
 * @returns          A new RuleTree (object root) reflecting overrides
 */
export const applyOverrides = (ruleTree, overrides = {}) => {
    var _a;
    // Flatten base tree for easier path-wise selection
    const baseMap = flatten(ruleTree);
    // Compute selection sets
    const include = overrides.include?.length ? new Set(overrides.include) : null;
    const exclude = new Set(overrides.exclude || []);
    const optional = new Set(overrides.optional || []);
    const required = new Set(overrides.required || []);
    // Build effective paths → rules after applying include/exclude/required/optional
    const effective = {};
    for (const [path, rule] of Object.entries(baseMap)) {
        // If whitelist is provided, only keep whitelisted paths
        if (include && !include.has(path))
            continue;
        // Drop excluded paths
        if (exclude.has(path))
            continue;
        // Clone rule then force required/optional as directed
        const r = { ...rule };
        if (optional.has(path))
            r.required = false;
        if (required.has(path))
            r.required = true;
        effective[path] = r;
    }
    // Append custom fields (e.g., "password" for auth DTO), with defaults
    // The default here is { type:'string', required:true } unless you override
    for (const [path, rule] of Object.entries(overrides.append || {})) {
        effective[path] = mergeRules({ type: 'string', required: true }, rule);
    }
    // Rebuild a nested RuleTree (object root) from the effective paths
    const root = { type: 'object', children: {} };
    for (const [path, rule] of Object.entries(effective)) {
        const parts = path.split('.');
        let cur = root;
        // Materialize intermediate object nodes for dotted paths
        for (let i = 0; i < parts.length - 1; i++) {
            const seg = parts[i];
            (_a = cur.children)[seg] || (_a[seg] = { type: 'object', children: {} });
            cur = cur.children[seg];
        }
        // Attach leaf rule at final segment
        cur.children[parts[parts.length - 1]] = rule;
    }
    return root;
};
/**
 * Convert a RuleTree (typically after overrides) to JSON Schema v4/v7 compatible object.
 * This JSON Schema is compatible with Ajv and also suitable for OpenAPI’s schema section.
 *
 * Key conversions:
 *  - object: { type: 'object', properties: {...}, required: [...] }
 *    - `allowUnknown` → additionalProperties (true/false)
 *  - array: { type: 'array', items: { ... }, minItems, maxItems }
 *  - string: { type: 'string', minLength, maxLength, pattern, enum }
 *  - number: { type: 'number', minimum, maximum }
 *  - boolean: { type: 'boolean' }
 *  - date: { type: 'string', format: 'date-time' }  // standard JSON Schema date-time
 *  - objectId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' } // 24-hex Mongo ObjectId
 *
 * @param tree          Effective RuleTree (usually the output of `applyOverrides`)
 * @param allowUnknown  Whether to allow unknown fields (maps to `additionalProperties`)
 * @returns             A JSON Schema object
 */
export const toJsonSchema = (tree, allowUnknown = false) => {
    /**
     * Recursively convert a Rule node to its JSON Schema equivalent.
     */
    const nodeToSchema = (node) => {
        // OBJECT node: compile properties and required list
        if (node.type === 'object') {
            const properties = {};
            const required = [];
            for (const [k, child] of Object.entries(node.children || {})) {
                properties[k] = nodeToSchema(child);
                if (child.required)
                    required.push(k);
            }
            const schema = { type: 'object', properties };
            if (required.length)
                schema.required = required;
            schema.additionalProperties = allowUnknown ? true : false;
            return schema;
        }
        // ARRAY node: convert items and attach array-specific bounds
        if (node.type === 'array') {
            const itemsSchema = node.items ? nodeToSchema(node.items) : {};
            const schema = { type: 'array', items: itemsSchema };
            if (node.minItems != null)
                schema.minItems = node.minItems;
            if (node.maxItems != null)
                schema.maxItems = node.maxItems;
            return schema;
        }
        // STRING node: length constraints, pattern, enum, etc.
        if (node.type === 'string') {
            const schema = { type: 'string' };
            if (node.minLength != null)
                schema.minLength = node.minLength;
            if (node.maxLength != null)
                schema.maxLength = node.maxLength;
            if (node.pattern)
                schema.pattern =
                    typeof node.pattern === 'string'
                        ? node.pattern
                        : node.pattern.source;
            if (node.enum)
                schema.enum = node.enum.slice();
            return schema;
        }
        // NUMBER node: numeric bounds
        if (node.type === 'number') {
            const schema = { type: 'number' };
            if (node.min != null)
                schema.minimum = node.min;
            if (node.max != null)
                schema.maximum = node.max;
            return schema;
        }
        // BOOLEAN node
        if (node.type === 'boolean')
            return { type: 'boolean' };
        // DATE node => JSON Schema date-time format
        if (node.type === 'date')
            return { type: 'string', format: 'date-time' };
        // Mongo ObjectId: 24-hex characters
        if (node.type === 'objectId')
            return { type: 'string', pattern: '^[0-9a-fA-F]{24}$' };
        // Fallback: no constraints (mixed/buffer etc.)
        return {};
    };
    // Convert root RuleTree object node into schema
    const rootSchema = nodeToSchema({
        type: 'object',
        children: tree.children,
    });
    return rootSchema;
};
