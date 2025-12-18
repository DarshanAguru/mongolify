
import AjvDefault from 'ajv';
import addFormatsDefault from 'ajv-formats';
import type { Overrides, ValidatorOptions, ValidatorResult } from './types.js';
import { compileRulesFromMongooseSchema } from './mongooseIntrospect.js';
import { applyOverrides, toJsonSchema } from './jsonSchemaCompiler.js';
import {
  getOrSetRuleTree,
  makeOverrideKey,
  getJsonSchemaCache,
  getAjvValidatorCache,
} from './cacheRegistry.js';

/**
 * Normalize Ajv import across ESM/CJS builds.
 * Some bundlers/TS configs represent default exports differently.
 * `AjvDefault.default ?? AjvDefault` ensures we get the constructor in both cases.
 */
const AjvCtor = (AjvDefault as any).default ?? AjvDefault;

/**
 * Normalize addFormats import (same reasoning as above).
 * Ensures we obtain a callable function regardless of import shape.
 */
const addFormatsFn = (addFormatsDefault as any).default ?? addFormatsDefault;


/**
 * Build a minimal JSON Schema purely from overrides for "no-schema" mode.
 * - Supports `append` (property definitions), `include` (names), `required`/`optional`.
 * - Property-level `required` is normalized to top-level `required: []`.
 */
const jsonSchemaFromOverrides = (
  overrides: Overrides = {},
  allowUnknown: boolean = false
) => {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  // Consider only fields we define via append/include/overrides
  const includedSet = new Set<string>(overrides.include ?? []);

  if (overrides.append) {
    for (const [key, def] of Object.entries(overrides.append)) {
      includedSet.add(key);
      properties[key] = { ...def };
      // normalize: Ajv expects 'required' array at object level
      if ((def as any).required) required.push(key);
      // strip `required` from property-level to avoid duplication
      delete (properties[key] as any).required;
    }
  }

  // If include is present but no property definition exists, default to string
  for (const key of includedSet) {
    if (!properties[key]) {
      properties[key] = { type: 'string' }; // default guess; adjust if needed
    }
  }

  // Merge explicit required/optional arrays
  if (Array.isArray(overrides.required)) {
    for (const k of overrides.required) {
      if (!required.includes(k)) required.push(k);
    }
  }
  if (Array.isArray(overrides.optional)) {
    // optional means ensure it's NOT in required
    for (const k of overrides.optional) {
      const idx = required.indexOf(k);
      if (idx !== -1) required.splice(idx, 1);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length ? required : undefined,
    additionalProperties: !!allowUnknown,
  };
};


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
export const buildAjvValidator = (
  schema: any,
  overrides: Overrides = {},
  options: ValidatorOptions = {}
) => {
  // Build a stable cache key from overrides + options
  const overrideKey = makeOverrideKey({ ...overrides, ...options });

  let jsonSchema: any;
  let validateFn: any;

  if (!schema) {
    // ---------------------------------------------
    // "No-schema" mode: derive JSON Schema from overrides and cache by overrideKey
    // ---------------------------------------------
    const jsCache = getJsonSchemaCache(schema);
    jsonSchema = jsCache.get(overrideKey);
    if (!jsonSchema) {
      jsonSchema = jsonSchemaFromOverrides(overrides, !!options.allowUnknown);
      jsCache.set(overrideKey, jsonSchema);
    }

    const vCache = getAjvValidatorCache(schema);
    validateFn = vCache.get(overrideKey);
    if (!validateFn) {
      const ajv = new AjvCtor({
        allErrors: true, // collect all errors (not fail-fast)
        coerceTypes: !!options.coerceTypes, // coerce primitive types (string → number, etc.)
        useDefaults: true, // apply JSON Schema defaults when present
        removeAdditional: options.allowUnknown ? false : 'all', // strip unknown unless allowed
        strict: false, // pragmatic: avoid strict mode noise for mixed schemas
      });
      addFormatsFn(ajv);
      validateFn = ajv.compile(jsonSchema);
      vCache.set(overrideKey, validateFn);
    }

  } else {
    // ---------------------------------------------
    // Normal pipeline with Mongoose introspection
    // ---------------------------------------------
    // Step 1: rule tree from schema (cached)
    const ruleTree = getOrSetRuleTree(schema, compileRulesFromMongooseSchema);

    // Step 2: apply endpoint overrides (optional/required/include/exclude/append)
    const effectiveTree = applyOverrides(ruleTree, overrides);

    // Step 3: retrieve or compute JSON Schema for the effective tree
    const jsCache = getJsonSchemaCache(schema);
    jsonSchema = jsCache.get(overrideKey);
    if (!jsonSchema) {
      // `allowUnknown` controls additionalProperties in the object schema
      jsonSchema = toJsonSchema(effectiveTree, !!options.allowUnknown);
      jsCache.set(overrideKey, jsonSchema);
    }

    // Step 4: retrieve or compile Ajv validator function
    const vCache = getAjvValidatorCache(schema);
    validateFn = vCache.get(overrideKey);
    if (!validateFn) {
      const ajv = new AjvCtor({
        allErrors: true,
        coerceTypes: !!options.coerceTypes,
        useDefaults: true,
        removeAdditional: options.allowUnknown ? false : 'all',
        strict: false,
      });
      addFormatsFn(ajv);
      validateFn = ajv.compile(jsonSchema);
      vCache.set(overrideKey, validateFn);
    }
  }

  /**
   * The returned validator function executes the Ajv compiled function
   * and maps the errors into a consistent shape (field, error, message).
   *
   * - `field` is derived from Ajv's instancePath ("/a/b" → "a.b") or missingProperty.
   * - `error` is the Ajv keyword (e.g., 'required', 'type', 'pattern').
   * - `message` is Ajv's human-readable message (may vary by keyword).
   */
  return (data: any): ValidatorResult => {
    const valid = validateFn(data);

    // On failure: normalize Ajv errors to { field, error, message }[]
    if (!valid) {
      const errors = (validateFn.errors || []).map((e: any) => ({
        field:
          e.instancePath?.replace(/^\//, '').replace(/\//g, '.') ||
          e.params?.missingProperty ||
          '',
        error: e.keyword,
        message: e.message,
      }));
      return { ok: false, data: null, errors };
    }

    // On success: `data` may be coerced/normalized by Ajv options (e.g., defaults, coercion)
    return { ok: true, data, errors: [] };
  };
};


/**
 * Emit (and cache) the JSON Schema for a given schema + overrides + options.
 * Useful for OpenAPI/Swagger integration or client-side validators.
 *
 * @param schema    Mongoose Schema (or object exposing eachPath). If null, we build from overrides.
 * @param overrides DTO-level overrides (include/exclude/optional/required/append)
 * @param options   Validator options (only `allowUnknown` affects JSON Schema here)
 * @returns         JSON Schema object
 */
export const emitJsonSchema = (
  schema: any,
  overrides: Overrides = {},
  options: ValidatorOptions = {}
) => {
  // Stable cache key
  const overrideKey = makeOverrideKey({ ...overrides, ...options });

  if (!schema) {
    // ---------------------------------------------
    // "No-schema" mode: derive JSON Schema from overrides and cache by overrideKey
    // ---------------------------------------------
    const jsCache = getJsonSchemaCache(schema);
    let jsonSchema = jsCache.get(overrideKey);
    if (!jsonSchema) {
      jsonSchema = jsonSchemaFromOverrides(overrides, !!options.allowUnknown);
      jsCache.set(overrideKey, jsonSchema);
    }
    return jsonSchema;
  }

  // Rule tree from schema (cached)
  const ruleTree = getOrSetRuleTree(schema, compileRulesFromMongooseSchema);

  // Apply endpoint overrides
  const effectiveTree = applyOverrides(ruleTree, overrides);

  // Retrieve or compute JSON Schema
  const jsCache = getJsonSchemaCache(schema);
  let jsonSchema = jsCache.get(overrideKey);
  if (!jsonSchema) {
    jsonSchema = toJsonSchema(effectiveTree, !!options.allowUnknown);
    jsCache.set(overrideKey, jsonSchema);
  }

  return jsonSchema;
};
