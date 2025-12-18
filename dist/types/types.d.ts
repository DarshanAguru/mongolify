/**
 * PrimitiveType represents the allowed scalar/object kinds
 * that a field can take within the validation rule system.
 *
 * - 'string'   : textual values (supports minLength, maxLength, pattern, enum)
 * - 'number'   : numeric values (supports min, max)
 * - 'boolean'  : true/false flags
 * - 'date'     : date/time values (commonly represented as ISO strings in JSON; Ajv uses `format: "date-time"`)
 * - 'objectId' : MongoDB ObjectId (validated as a 24-hex-character string)
 * - 'array'    : lists (supports item rules, minItems, maxItems)
 * - 'object'   : nested objects (with children map)
 * - 'mixed'    : any value (no constraints applied)
 * - 'buffer'   : binary buffers (opaque; typically not validated here)
 */
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'date' | 'objectId' | 'array' | 'object' | 'mixed' | 'buffer';
/**
 * Rule describes the validation constraints for a single field (or node)
 * in the RuleTree. Rules are type-aware and may include additional properties
 * depending on their `type` (e.g., string constraints vs. number constraints).
 *
 * Notes:
 * - `required` applies at the parent object level (i.e., this field must be present).
 * - For `string` type:
 *    - `minLength` / `maxLength`: length bounds
 *    - `pattern`: a RegExp or pattern string (converted to JSON Schema source for Ajv)
 *    - `enum`: allowed set of values
 * - For `number` / `date` types:
 *    - `min` / `max`: numeric bounds, or timestamp bounds for date (depending on compiler)
 * - For `array` type:
 *    - `items`: Rule describing the element type/constraints
 *    - `minItems` / `maxItems`: length bounds for arrays
 * - For `object` type:
 *    - `children`: nested map of field name → Rule
 */
export interface Rule {
    /** Primitive type of this rule node */
    type: PrimitiveType;
    /** Whether this field must be present (required at the parent object) */
    required?: boolean;
    /** Minimum string length (inclusive) */
    minLength?: number;
    /** Maximum string length (inclusive) */
    maxLength?: number;
    /** Regular expression constraint (RegExp or pattern string) */
    pattern?: RegExp | string;
    /** Allowed set of string literal values */
    enum?: string[];
    /** Minimum numeric value (inclusive) or earliest timestamp for date */
    min?: number;
    /** Maximum numeric value (inclusive) or latest timestamp for date */
    max?: number;
    /** Rule describing items contained in the array */
    items?: Rule | undefined;
    /** Minimum number of items in the array (inclusive) */
    minItems?: number;
    /** Maximum number of items in the array (inclusive) */
    maxItems?: number;
    /**
     * Nested fields for objects.
     * Only meaningful when `type` is 'object'.
     * Each child Rule may also have its own `required` flag,
     * which is expressed in JSON Schema via the parent `required: []` list.
     */
    children?: Record<string, Rule> | undefined;
}
/**
 * RuleTree is the root-level container representing an object schema.
 * It must have `type: 'object'` and a `children` map describing the fields
 * present at the root of the DTO/payload.
 */
export interface RuleTree {
    /** Root must be an object node */
    type: 'object';
    /** Map of field name → Rule */
    children: Record<string, Rule>;
}
/**
 * Overrides allow endpoint-specific customization of a RuleTree
 * derived from Mongoose or other sources—useful to tailor DTOs for specific APIs.
 *
 * Semantics:
 * - `include`: whitelist of field paths to include (if provided, only these are kept)
 * - `exclude`: blacklist of field paths to remove
 * - `optional`: field paths to mark as optional (force `required=false`)
 * - `required`: field paths to mark as required (force `required=true`)
 * - `append`: add new fields not defined in the base schema (e.g., 'password')
 *
 * Field paths use dot-notation for nested objects (e.g., "address.street").
 */
export interface Overrides {
    /** Whitelist of field paths to keep (dot-notation allowed) */
    include?: string[];
    /** Blacklist of field paths to remove (dot-notation allowed) */
    exclude?: string[];
    /** Field paths to mark optional (even if required in original schema) */
    optional?: string[];
    /** Field paths to mark required (even if optional in original schema) */
    required?: string[];
    /** Additional fields injected into the effective schema */
    append?: Record<string, Rule>;
}
/**
 * Options passed to the validator engine (Ajv-based) to control runtime behavior.
 *
 * - `coerceTypes`: Ajv can coerce primitive types (e.g., "42" → 42) when enabled.
 * - `allowUnknown`: if true, additional properties beyond those in the schema are allowed.
 *                    (maps to JSON Schema `additionalProperties: true` and Ajv `removeAdditional: false`)
 */
export interface ValidatorOptions {
    /** Enable Ajv type coercion (e.g., strings to numbers when possible) */
    coerceTypes?: boolean;
    /**
     * Allow properties that are not defined in the schema.
     * If false, unknown fields will be stripped or cause validation errors, depending on configuration.
     */
    allowUnknown?: boolean;
}
/**
 * Result returned by the validator function produced by the library.
 *
 * - `ok`: true when validation passes, false otherwise.
 * - `data`: the validated payload (may be transformed/coerced depending on options).
 * - `errors`: array of error descriptors; each entry includes:
 *      - `field`: path of the failing field (dot-notation), or missing property name
 *      - `error`: keyword/type of error (e.g., 'required', 'type', 'pattern')
 *      - `message`: human-readable message from Ajv (if available)
 *
 * @template T Output data type (default: any)
 */
export interface ValidatorResult<T = any> {
    /** True if validation succeeded */
    ok: boolean;
    /** Normalized/validated payload (or null when `ok=false`) */
    data: T | null;
    /** List of validation errors with field paths and messages */
    errors: {
        field: string;
        error: string;
        message?: string;
    }[];
}
