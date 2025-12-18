"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitJsonSchema = exports.buildAjvValidator = void 0;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const mongooseIntrospect_js_1 = require("./mongooseIntrospect.js");
const jsonSchemaCompiler_js_1 = require("./jsonSchemaCompiler.js");
const cacheRegistry_js_1 = require("./cacheRegistry.js");
/**
 * Normalize Ajv import across ESM/CJS builds.
 * Some bundlers/TS configs represent default exports differently.
 * `AjvDefault.default ?? AjvDefault` ensures we get the constructor in both cases.
 */
const AjvCtor = ajv_1.default.default ?? ajv_1.default;
/**
 * Normalize addFormats import (same reasoning as above).
 * Ensures we obtain a callable function regardless of import shape.
 */
const addFormatsFn = ajv_formats_1.default.default ?? ajv_formats_1.default;
/**
 * Build a minimal JSON Schema purely from overrides for "no-schema" mode.
 * - Supports `append` (property definitions), `include` (names), `required`/`optional`.
 * - Property-level `required` is normalized to top-level `required: []`.
 */
const jsonSchemaFromOverrides = (overrides = {}, allowUnknown = false) => {
    const properties = {};
    const required = [];
    // Consider only fields we define via append/include/overrides
    const includedSet = new Set(overrides.include ?? []);
    if (overrides.append) {
        for (const [key, def] of Object.entries(overrides.append)) {
            includedSet.add(key);
            properties[key] = { ...def };
            // normalize: Ajv expects 'required' array at object level
            if (def.required)
                required.push(key);
            // strip `required` from property-level to avoid duplication
            delete properties[key].required;
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
            if (!required.includes(k))
                required.push(k);
        }
    }
    if (Array.isArray(overrides.optional)) {
        // optional means ensure it's NOT in required
        for (const k of overrides.optional) {
            const idx = required.indexOf(k);
            if (idx !== -1)
                required.splice(idx, 1);
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
const buildAjvValidator = (schema, overrides = {}, options = {}) => {
    // Build a stable cache key from overrides + options
    const overrideKey = (0, cacheRegistry_js_1.makeOverrideKey)({ ...overrides, ...options });
    let jsonSchema;
    let validateFn;
    if (!schema) {
        // ---------------------------------------------
        // "No-schema" mode: derive JSON Schema from overrides and cache by overrideKey
        // ---------------------------------------------
        const jsCache = (0, cacheRegistry_js_1.getJsonSchemaCache)(schema);
        jsonSchema = jsCache.get(overrideKey);
        if (!jsonSchema) {
            jsonSchema = jsonSchemaFromOverrides(overrides, !!options.allowUnknown);
            jsCache.set(overrideKey, jsonSchema);
        }
        const vCache = (0, cacheRegistry_js_1.getAjvValidatorCache)(schema);
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
    }
    else {
        // ---------------------------------------------
        // Normal pipeline with Mongoose introspection
        // ---------------------------------------------
        // Step 1: rule tree from schema (cached)
        const ruleTree = (0, cacheRegistry_js_1.getOrSetRuleTree)(schema, mongooseIntrospect_js_1.compileRulesFromMongooseSchema);
        // Step 2: apply endpoint overrides (optional/required/include/exclude/append)
        const effectiveTree = (0, jsonSchemaCompiler_js_1.applyOverrides)(ruleTree, overrides);
        // Step 3: retrieve or compute JSON Schema for the effective tree
        const jsCache = (0, cacheRegistry_js_1.getJsonSchemaCache)(schema);
        jsonSchema = jsCache.get(overrideKey);
        if (!jsonSchema) {
            // `allowUnknown` controls additionalProperties in the object schema
            jsonSchema = (0, jsonSchemaCompiler_js_1.toJsonSchema)(effectiveTree, !!options.allowUnknown);
            jsCache.set(overrideKey, jsonSchema);
        }
        // Step 4: retrieve or compile Ajv validator function
        const vCache = (0, cacheRegistry_js_1.getAjvValidatorCache)(schema);
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
    return (data) => {
        const valid = validateFn(data);
        // On failure: normalize Ajv errors to { field, error, message }[]
        if (!valid) {
            const errors = (validateFn.errors || []).map((e) => ({
                field: e.instancePath?.replace(/^\//, '').replace(/\//g, '.') ||
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
exports.buildAjvValidator = buildAjvValidator;
/**
 * Emit (and cache) the JSON Schema for a given schema + overrides + options.
 * Useful for OpenAPI/Swagger integration or client-side validators.
 *
 * @param schema    Mongoose Schema (or object exposing eachPath). If null, we build from overrides.
 * @param overrides DTO-level overrides (include/exclude/optional/required/append)
 * @param options   Validator options (only `allowUnknown` affects JSON Schema here)
 * @returns         JSON Schema object
 */
const emitJsonSchema = (schema, overrides = {}, options = {}) => {
    // Stable cache key
    const overrideKey = (0, cacheRegistry_js_1.makeOverrideKey)({ ...overrides, ...options });
    if (!schema) {
        // ---------------------------------------------
        // "No-schema" mode: derive JSON Schema from overrides and cache by overrideKey
        // ---------------------------------------------
        const jsCache = (0, cacheRegistry_js_1.getJsonSchemaCache)(schema);
        let jsonSchema = jsCache.get(overrideKey);
        if (!jsonSchema) {
            jsonSchema = jsonSchemaFromOverrides(overrides, !!options.allowUnknown);
            jsCache.set(overrideKey, jsonSchema);
        }
        return jsonSchema;
    }
    // Rule tree from schema (cached)
    const ruleTree = (0, cacheRegistry_js_1.getOrSetRuleTree)(schema, mongooseIntrospect_js_1.compileRulesFromMongooseSchema);
    // Apply endpoint overrides
    const effectiveTree = (0, jsonSchemaCompiler_js_1.applyOverrides)(ruleTree, overrides);
    // Retrieve or compute JSON Schema
    const jsCache = (0, cacheRegistry_js_1.getJsonSchemaCache)(schema);
    let jsonSchema = jsCache.get(overrideKey);
    if (!jsonSchema) {
        jsonSchema = (0, jsonSchemaCompiler_js_1.toJsonSchema)(effectiveTree, !!options.allowUnknown);
        jsCache.set(overrideKey, jsonSchema);
    }
    return jsonSchema;
};
exports.emitJsonSchema = emitJsonSchema;
