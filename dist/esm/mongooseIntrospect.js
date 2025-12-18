/**
 * Map Mongoose SchemaType.instance values to our internal PrimitiveType.
 *
 * Mongoose common instances:
 * - 'String', 'Number', 'Boolean', 'Date', 'ObjectID', 'Decimal128', 'Buffer'
 * - 'Array' (top-level or field array) and 'Embedded' (subdocument)
 *
 * Any unknown/less common instances fall back to 'mixed'.
 */
const mapInstanceToType = (instance) => {
    switch (instance) {
        case 'String':
            return 'string';
        case 'Number':
            return 'number';
        case 'Boolean':
            return 'boolean';
        case 'Date':
            return 'date';
        case 'ObjectID':
            return 'objectId';
        case 'Decimal128':
            return 'number';
        case 'Buffer':
            return 'buffer';
        case 'Array':
            return 'array';
        case 'Embedded':
            return 'object';
        default:
            return 'mixed';
    }
};
/**
 * Safely create/attach nested Rule nodes for a dotted path.
 * Example: "address.street" → { children: { address: { type:'object', children:{ street: Rule }}}}
 *
 * @param root  Root RuleTree (object node)
 * @param path  Dotted field path (e.g., "profile.name")
 * @param value Final Rule for the leaf node
 */
const setNested = (root, path, value) => {
    var _a;
    const parts = path.split('.');
    let cur = root;
    // Traverse and create intermediate object children
    for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        // Ensure children map exists
        cur.children || (cur.children = {});
        // Ensure nested object node exists at this segment
        (_a = cur.children)[seg] || (_a[seg] = { type: 'object', children: {} });
        // Descend into nested object node
        cur = cur.children[seg];
    }
    // Attach the final leaf rule at the last segment
    cur.children || (cur.children = {});
    cur.children[parts[parts.length - 1]] = value;
};
/**
 * Compile a RuleTree from a given Mongoose Schema by introspecting each path via `schema.eachPath`.
 *
 * Behavior:
 * - Produces an object-shaped RuleTree with dotted paths materialized into nested `children`.
 * - Maps types using `mapInstanceToType`.
 * - Lifts common constraints from Mongoose options into Rule properties:
 *   - String: enum, match → pattern, minlength → minLength, maxlength → maxLength
 *   - Number: min, max
 *   - Date: min, max (stored as timestamps for easy comparisons; JSON Schema emits as date-time)
 *   - Array: items derived from caster; supports subdocument arrays (caster.schema)
 * - Marks `required` when `opts.required` is truthy.
 *
 * Requirements:
 * - `schema.eachPath((path, schematype) => ...)` must be available. No DB connection is required.
 *
 * @throws Error if the input does not expose `eachPath`.
 * @param schema A Mongoose Schema instance (or compatible object with `eachPath`)
 * @returns A RuleTree representing the schema as an object node with typed children.
 */
export const compileRulesFromMongooseSchema = (schema) => {
    // Initialize the root object node
    const ruleTree = { type: 'object', children: {} };
    // Validate schema capability
    if (!schema || typeof schema.eachPath !== 'function') {
        throw new Error('Schema must expose eachPath(fn)');
    }
    // Walk paths: eachPath receives dotted path string and a SchemaType descriptor
    schema.eachPath((path, schematype) => {
        // Map Mongoose instance → internal PrimitiveType
        const type = mapInstanceToType(schematype.instance);
        // Start with the basic rule node
        const rules = { type };
        // Mongoose field options (constraints)
        const opts = schematype.options || {};
        // Required marker at the field level
        rules.required = !!opts.required;
        // STRING constraints
        if (type === 'string') {
            if (opts.enum) {
                // Copy enum values if provided; otherwise undefined
                rules.enum = Array.isArray(opts.enum) ? opts.enum.slice() : undefined;
            }
            if (opts.match) {
                // Convert match to RegExp if needed
                rules.pattern =
                    opts.match instanceof RegExp ? opts.match : new RegExp(opts.match);
            }
            if (opts.minlength != null)
                rules.minLength = opts.minlength;
            if (opts.maxlength != null)
                rules.maxLength = opts.maxlength;
        }
        // NUMBER constraints
        if (type === 'number') {
            if (opts.min != null)
                rules.min = opts.min;
            if (opts.max != null)
                rules.max = opts.max;
        }
        // DATE constraints (stored as timestamps for easy comparisons in runtime validators)
        if (type === 'date') {
            if (opts.min != null)
                rules.min = new Date(opts.min).getTime();
            if (opts.max != null)
                rules.max = new Date(opts.max).getTime();
        }
        // ARRAY: determine item type & constraints from caster
        if (type === 'array') {
            const caster = schematype.caster;
            if (caster) {
                // Item primitive type from caster.instance
                const itemType = mapInstanceToType(caster.instance);
                rules.items = { type: itemType };
                // Item-level options for strings/numbers (from caster.options)
                const cOpts = caster.options || {};
                if (itemType === 'string') {
                    if (cOpts.enum)
                        rules.items.enum = cOpts.enum.slice();
                    if (cOpts.match)
                        rules.items.pattern =
                            cOpts.match instanceof RegExp
                                ? cOpts.match
                                : new RegExp(cOpts.match);
                    if (cOpts.minlength != null)
                        rules.items.minLength = cOpts.minlength;
                    if (cOpts.maxlength != null)
                        rules.items.maxLength = cOpts.maxlength;
                }
                if (itemType === 'number') {
                    if (cOpts.min != null)
                        rules.items.min = cOpts.min;
                    if (cOpts.max != null)
                        rules.items.max = cOpts.max;
                }
                // Array of subdocuments: caster.schema exists → items become object with children
                if (caster.schema) {
                    rules.items.type = 'object';
                    rules.items.children = compileRulesFromMongooseSchema(caster.schema).children;
                }
            }
            // Optional array length constraints surfaced on the field
            if (opts.minItems != null)
                rules.minItems = opts.minItems;
            if (opts.maxItems != null)
                rules.maxItems = opts.maxItems;
        }
        // EMBEDDED SUBDOCUMENT: schematype.schema exists → nested object with children
        if (schematype.schema) {
            rules.type = 'object';
            rules.children = compileRulesFromMongooseSchema(schematype.schema).children;
        }
        // Attach leaf rule to the root via nested path creation
        setNested(ruleTree, path, rules);
    });
    // Return the compiled rule tree (root object)
    return ruleTree;
};
