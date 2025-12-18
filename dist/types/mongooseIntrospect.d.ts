import type { RuleTree } from './types.js';
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
export declare const compileRulesFromMongooseSchema: (schema: any) => RuleTree;
