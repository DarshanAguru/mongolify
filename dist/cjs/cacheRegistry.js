"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAjvValidatorCache = exports.getJsonSchemaCache = exports.makeOverrideKey = exports.getOrSetRuleTree = void 0;
/**
 * Cache for compiled RuleTree per schema object.
 * WeakMap ensures entries are garbage-collected when schema objects are no longer referenced.
 *
 * Key: the passed `schema` object (e.g., a Mongoose Schema instance)
 * Value: the compiled RuleTree
 */
const ruleTreeCache = new WeakMap();
/**
 * Cache for JSON Schemas derived from a schema + overrides signature.
 *
 * Key: schema object
 * Value: Map<overrideKey, jsonSchemaObject>
 */
const jsonSchemaCache = new WeakMap();
/**
 * Cache for compiled Ajv validators derived from a schema + overrides signature.
 *
 * Key: schema object
 * Value: Map<overrideKey, validatorFunction>
 */
const ajvValidatorCache = new WeakMap();
// ---------------------------------------------
// Null-schema caches (schema === null | undefined)
// ---------------------------------------------
/**
 * Cache for JSON Schemas when `schema` is not provided (null/undefined).
 * Since WeakMap cannot accept non-object keys, we use a module-level Map keyed by overrideKey.
 *
 * Key: overrideKey (string)
 * Value: JSON Schema object
 */
const NullSchemaJsonCache = new Map();
/**
 * Cache for Ajv validator functions when `schema` is not provided (null/undefined).
 *
 * Key: overrideKey (string)
 * Value: Ajv validator function
 */
const NullSchemaValidatorCache = new Map();
/**
 * Sentinel RuleTree for "no-schema" mode.
 * This signals to higher-level callers that no Mongoose introspection should be performed.
 * In this mode, downstream code should produce JSON Schema directly from overrides.
 */
const EMPTY_RULE_TREE = { type: 'object', fields: {} };
/**
 * Retrieve the RuleTree from cache if available; otherwise compile and store.
 * If `schema` is null/undefined, returns a sentinel EMPTY_RULE_TREE without attempting compilation.
 *
 * @param schema    Any object representing your Mongoose Schema (must be a stable object reference).
 *                  If null/undefined, a sentinel EMPTY_RULE_TREE is returned.
 * @param compileFn Function that takes `schema` and returns a RuleTree (expensive operation).
 * @returns         The cached or newly compiled RuleTree, or EMPTY_RULE_TREE for null schema.
 */
const getOrSetRuleTree = (schema, compileFn) => {
    if (!schema) {
        // No schema available: skip compilation entirely.
        // Callers should detect this sentinel and build JSON Schema from overrides directly.
        return EMPTY_RULE_TREE;
    }
    let cached = ruleTreeCache.get(schema);
    if (cached)
        return cached;
    const ruleTree = compileFn(schema);
    ruleTreeCache.set(schema, ruleTree);
    return ruleTree;
};
exports.getOrSetRuleTree = getOrSetRuleTree;
/**
 * Build a stable string key representing the set of overrides/options.
 * This is used to cache JSON Schemas and Ajv validators for reuse.
 *
 * @param overrides Mixed overrides/options object.
 * @returns         A deterministic JSON string used as a cache key.
 */
const makeOverrideKey = (overrides = {}) => {
    const overrideData = {
        include: overrides.include || null,
        exclude: overrides.exclude || null,
        optional: overrides.optional || null,
        required: overrides.required || null,
        append: overrides.append || null,
        allowUnknown: !!overrides.allowUnknown,
        coerceTypes: !!overrides.coerceTypes,
    };
    return JSON.stringify(overrideData, Object.keys(overrideData).sort());
};
exports.makeOverrideKey = makeOverrideKey;
/**
 * Get (or create) the per-schema JSON Schema cache map.
 * If `schema` is null/undefined, returns the global NullSchemaJsonCache map instead.
 *
 * @param schema Schema object used as WeakMap key (or null/undefined for "no-schema" mode).
 * @returns      Map<string, any> where key is overrideKey and value is JSON Schema.
 */
const getJsonSchemaCache = (schema) => {
    if (!schema) {
        // In "no-schema" mode, fallback to global Map keyed by overrideKey.
        return NullSchemaJsonCache;
    }
    let map = jsonSchemaCache.get(schema);
    if (!map) {
        map = new Map();
        jsonSchemaCache.set(schema, map);
    }
    return map;
};
exports.getJsonSchemaCache = getJsonSchemaCache;
/**
 * Get (or create) the per-schema Ajv validator cache map.
 * If `schema` is null/undefined, returns the global NullSchemaValidatorCache map instead.
 *
 * @param schema Schema object used as WeakMap key (or null/undefined for "no-schema" mode).
 * @returns      Map<string, Function> where key is overrideKey and value is Ajv compiled function.
 */
const getAjvValidatorCache = (schema) => {
    if (!schema) {
        // In "no-schema" mode, fallback to global Map keyed by overrideKey.
        return NullSchemaValidatorCache;
    }
    let map = ajvValidatorCache.get(schema);
    if (!map) {
        map = new Map();
        ajvValidatorCache.set(schema, map);
    }
    return map;
};
exports.getAjvValidatorCache = getAjvValidatorCache;
