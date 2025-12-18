import type { RuleTree, Overrides } from './types.js';
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
export declare const applyOverrides: (ruleTree: RuleTree, overrides?: Overrides) => RuleTree;
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
export declare const toJsonSchema: (tree: RuleTree, allowUnknown?: boolean) => any;
