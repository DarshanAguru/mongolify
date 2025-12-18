"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyPipeline = void 0;
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
class PolicyPipeline {
    /** Hook implementations injected at construction */
    constructor(hooks = {}) {
        this.hooks = hooks;
    }
    /**
     * Execute `beforeCreate` hook if provided.
     * Common responsibilities:
     * - Authorization (roles/ownership)
     * - Input normalization / defaulting
     * - Audit fields (createdBy/updatedBy)
     */
    async runBeforeCreate(ctx) {
        if (this.hooks.beforeCreate)
            await this.hooks.beforeCreate(ctx);
    }
    /**
     * Execute `afterCreate` hook if provided.
     * Common responsibilities:
     * - Event emission / logging
     * - Analytics / metrics
     * - Cache invalidation
     */
    async runAfterCreate(ctx, createdDoc) {
        if (this.hooks.afterCreate)
            await this.hooks.afterCreate(ctx, createdDoc);
    }
    /**
     * Execute `beforeUpdate` hook if provided.
     * Common responsibilities:
     * - Authorization (can the actor update this resource?)
     * - Mutate `ctx.update` (e.g., set updatedBy, sanitize fields)
     */
    async runBeforeUpdate(ctx) {
        if (this.hooks.beforeUpdate)
            await this.hooks.beforeUpdate(ctx);
    }
    /**
     * Execute `afterUpdate` hook if provided.
     * Common responsibilities:
     * - Event emission / logging
     * - Post-update verification / consistency checks
     */
    async runAfterUpdate(ctx, updatedDoc) {
        if (this.hooks.afterUpdate)
            await this.hooks.afterUpdate(ctx, updatedDoc);
    }
    /**
     * Execute `beforeDelete` hook if provided.
     * Common responsibilities:
     * - Authorization (e.g., admin-only deletes)
     * - Soft-delete policies, cross-entity constraints
     */
    async runBeforeDelete(ctx) {
        if (this.hooks.beforeDelete)
            await this.hooks.beforeDelete(ctx);
    }
    /**
     * Execute `afterDelete` hook if provided.
     * Common responsibilities:
     * - Event emission / logging
     * - Cleanup related resources, cache entries, etc.
     */
    async runAfterDelete(ctx) {
        if (this.hooks.afterDelete)
            await this.hooks.afterDelete(ctx);
    }
}
exports.PolicyPipeline = PolicyPipeline;
