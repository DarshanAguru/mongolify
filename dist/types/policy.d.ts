/**
 * PolicyContext carries runtime data into policy hooks.
 * You can extend this shape freely based on your app needs.
 *
 * Typical usage:
 * - actor: the authenticated user (e.g., { id, role, ... })
 * - session: DB transaction/session when using transactions
 * - id: target document ID for update/delete flows
 * - data: the payload being created
 * - update: the payload being applied on update
 * - meta: any extra metadata (e.g., request info, correlation IDs)
 */
export interface PolicyContext {
    actor?: any;
    session?: any;
    id?: any;
    data?: any;
    update?: any;
    meta?: Record<string, any>;
}
/**
 * PolicyHooks is a set of lifecycle callbacks for CRUD-style flows.
 *
 * Hook semantics:
 * - beforeCreate(ctx): run authorization, input normalization, audit setup
 * - afterCreate(ctx, createdDoc): emit events, logs, metrics, etc.
 * - beforeUpdate(ctx): run authorization and set audit fields in ctx.update
 * - afterUpdate(ctx, updatedDoc): emit events/logs; may inspect state changes
 * - beforeDelete(ctx): run authorization (e.g., role check)
 * - afterDelete(ctx): perform side effects (e.g., cleanup, event emit)
 *
 * All hooks may be async (return Promise) or sync (return void).
 */
export interface PolicyHooks {
    beforeCreate?: (ctx: PolicyContext) => Promise<void> | void;
    afterCreate?: (ctx: PolicyContext, createdDoc: any) => Promise<void> | void;
    beforeUpdate?: (ctx: PolicyContext) => Promise<void> | void;
    afterUpdate?: (ctx: PolicyContext, updatedDoc: any) => Promise<void> | void;
    beforeDelete?: (ctx: PolicyContext) => Promise<void> | void;
    afterDelete?: (ctx: PolicyContext) => Promise<void> | void;
}
/**
 * PolicyPipeline executes the configured hooks in a safe, consistent manner.
 *
 * Usage pattern:
 * ```ts
 * const pipeline = new PolicyPipeline({
 *   beforeCreate: async ({ actor, data }) => {
 *     if (!actor) throw new Error('UNAUTHENTICATED');
 *     if (actor.role !== 'ADMIN') throw new Error('FORBIDDEN_CREATE');
 *     // audit fields, normalization
 *     data.createdBy = actor.id;
 *     data.updatedBy = actor.id;
 *   },
 *   afterCreate: async (ctx, doc) => { console.log('Created:', doc._id); }
 * });
 *
 * await pipeline.runBeforeCreate({ actor: req.user, data: req.body });
 * const created = await Repo.create(req.body);
 * await pipeline.runAfterCreate({ actor: req.user, data: req.body }, created);
 * ```
 *
 * Design notes:
 * - Each `run*` method awaits the corresponding hook if present.
 * - If a `before*` hook throws, caller should catch and convert to an HTTP error.
 * - Hooks are intentionally thin and do not mutate the pipeline itself—only the `ctx`.
 */
export declare class PolicyPipeline {
    private hooks;
    /** Hook implementations injected at construction */
    constructor(hooks?: PolicyHooks);
    /**
     * Execute `beforeCreate` hook if provided.
     * Common responsibilities:
     * - Authorization (roles/ownership)
     * - Input normalization / defaulting
     * - Audit fields (createdBy/updatedBy)
     */
    runBeforeCreate(ctx: PolicyContext): Promise<void>;
    /**
     * Execute `afterCreate` hook if provided.
     * Common responsibilities:
     * - Event emission / logging
     * - Analytics / metrics
     * - Cache invalidation
     */
    runAfterCreate(ctx: PolicyContext, createdDoc: any): Promise<void>;
    /**
     * Execute `beforeUpdate` hook if provided.
     * Common responsibilities:
     * - Authorization (can the actor update this resource?)
     * - Mutate `ctx.update` (e.g., set updatedBy, sanitize fields)
     */
    runBeforeUpdate(ctx: PolicyContext): Promise<void>;
    /**
     * Execute `afterUpdate` hook if provided.
     * Common responsibilities:
     * - Event emission / logging
     * - Post-update verification / consistency checks
     */
    runAfterUpdate(ctx: PolicyContext, updatedDoc: any): Promise<void>;
    /**
     * Execute `beforeDelete` hook if provided.
     * Common responsibilities:
     * - Authorization (e.g., admin-only deletes)
     * - Soft-delete policies, cross-entity constraints
     */
    runBeforeDelete(ctx: PolicyContext): Promise<void>;
    /**
     * Execute `afterDelete` hook if provided.
     * Common responsibilities:
     * - Event emission / logging
     * - Cleanup related resources, cache entries, etc.
     */
    runAfterDelete(ctx: PolicyContext): Promise<void>;
}
