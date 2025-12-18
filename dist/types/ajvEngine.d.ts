import type { Overrides, ValidatorOptions, ValidatorResult } from './types.js';
/**
 * Build (and cache) an Ajv validator for a given schema + overrides + options.
 *
 * Pipeline:
 *  1) Introspect Mongoose Schema → RuleTree (cached via WeakMap)  [SKIPPED if schema is null]
 *  2) Apply endpoint Overrides → effective RuleTree                 [SKIPPED if schema is null]
 *  3) Compile to JSON Schema (cached by override key)
 *  4) Compile Ajv validator (cached by override key)
 *
 * Options:
 *  - coerceTypes: Ajv coerces types (e.g., '42' → 42) when true
 *  - allowUnknown: unknown properties allowed (additionalProperties: true)
 *
 * Caching:
 *  - RuleTree per schema via `getOrSetRuleTree` (for non-null schema)
 *  - JSON Schema per (schema + overrideKey)
 *  - Ajv compiled fn per (schema + overrideKey)
 *
 * @param schema    Mongoose Schema (or object exposing eachPath). If null, we build from overrides.
 * @param overrides DTO-level overrides (include/exclude/optional/required/append)
 * @param options   Ajv/validator options (coerceTypes, allowUnknown)
 * @returns         A validator function: (data) => { ok, data, errors }
 */
export declare const buildAjvValidator: (schema: any, overrides?: Overrides, options?: ValidatorOptions) => (data: any) => ValidatorResult;
/**
 * Emit (and cache) the JSON Schema for a given schema + overrides + options.
 * Useful for OpenAPI/Swagger integration or client-side validators.
 *
 * @param schema    Mongoose Schema (or object exposing eachPath). If null, we build from overrides.
 * @param overrides DTO-level overrides (include/exclude/optional/required/append)
 * @param options   Validator options (only `allowUnknown` affects JSON Schema here)
 * @returns         JSON Schema object
 */
export declare const emitJsonSchema: (schema: any, overrides?: Overrides, options?: ValidatorOptions) => any;
