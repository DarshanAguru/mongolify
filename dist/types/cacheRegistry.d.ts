/**
 * Retrieve the RuleTree from cache if available; otherwise compile and store.
 * If `schema` is null/undefined, returns a sentinel EMPTY_RULE_TREE without attempting compilation.
 *
 * @param schema    Any object representing your Mongoose Schema (must be a stable object reference).
 *                  If null/undefined, a sentinel EMPTY_RULE_TREE is returned.
 * @param compileFn Function that takes `schema` and returns a RuleTree (expensive operation).
 * @returns         The cached or newly compiled RuleTree, or EMPTY_RULE_TREE for null schema.
 */
export declare const getOrSetRuleTree: (schema: object | null | undefined, compileFn: (schema: any) => any) => any;
/**
 * Build a stable string key representing the set of overrides/options.
 * This is used to cache JSON Schemas and Ajv validators for reuse.
 *
 * @param overrides Mixed overrides/options object.
 * @returns         A deterministic JSON string used as a cache key.
 */
export declare const makeOverrideKey: (overrides?: any) => string;
/**
 * Get (or create) the per-schema JSON Schema cache map.
 * If `schema` is null/undefined, returns the global NullSchemaJsonCache map instead.
 *
 * @param schema Schema object used as WeakMap key (or null/undefined for "no-schema" mode).
 * @returns      Map<string, any> where key is overrideKey and value is JSON Schema.
 */
export declare const getJsonSchemaCache: (schema: object | null | undefined) => Map<string, any>;
/**
 * Get (or create) the per-schema Ajv validator cache map.
 * If `schema` is null/undefined, returns the global NullSchemaValidatorCache map instead.
 *
 * @param schema Schema object used as WeakMap key (or null/undefined for "no-schema" mode).
 * @returns      Map<string, Function> where key is overrideKey and value is Ajv compiled function.
 */
export declare const getAjvValidatorCache: (schema: object | null | undefined) => Map<string, Function>;
