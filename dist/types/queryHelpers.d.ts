/**
 * Build a MongoDB filter object from convenient macro parameters.
 *
 * Supported macros:
 *  - equals: direct field equality (merged as-is)
 *  - in: $in membership arrays for fields
 *  - range: numeric/date ranges using $gte/$lte
 *  - search: text search across multiple fields using regex; adds an $or clause
 *  - exists / notExists: $exists true/false for presence checks
 *  - regex: custom regex patterns per field
 *
 * @example
 * buildFilter({
 *   equals: { role: 'ADMIN' },
 *   in: { city: ['Hyderabad', 'Bangalore'] },
 *   range: { age: { gte: 18, lte: 60 } },
 *   search: { q: 'alice', fields: ['username', 'email'] },
 *   exists: ['phone'],
 *   regex: { email: { pattern: '^.+@example\\.com$', options: 'i' } }
 * })
 *
 * @param params Configuration of filter macros.
 * @returns A MongoDB filter object (usable with Mongoose Model.find(filter)).
 */
export declare const buildFilter: (params?: {
    equals?: Record<string, any>;
    in?: Record<string, any[]>;
    range?: Record<string, {
        gte?: any;
        lte?: any;
    }>;
    search?: {
        q: string;
        fields: string[];
        caseInsensitive?: boolean;
    };
    exists?: string[];
    notExists?: string[];
    regex?: Record<string, {
        pattern: string;
        options?: string;
    }>;
}) => Record<string, any>;
/**
 * Build a MongoDB projection object from include/exclude lists.
 *
 * Rules:
 *  - If `include` is non-empty, projection uses include mode: { f1: 1, f2: 1, ... }
 *  - If `include` is empty but `exclude` has values, projection uses exclude mode: { f1: 0, f2: 0, ... }
 *  - If both arrays are empty, returns {} (no projection).
 *
 * @example
 * buildProjection({ include: ['username', 'email'] }) // { username: 1, email: 1 }
 * buildProjection({ exclude: ['passwordHash'] })      // { passwordHash: 0 }
 *
 * @param opts.include fields to include
 * @param opts.exclude fields to exclude
 * @returns Projection object
 */
export declare const buildProjection: ({ include, exclude, }?: {
    include?: string[];
    exclude?: string[];
}) => Record<string, number>;
/**
 * Parse sort input into a MongoDB sort object.
 *
 * Accepts:
 *  - A string: "createdAt:desc,username:asc"
 *  - An object: { createdAt: -1, username: 1 }
 *
 * Normalizes directions: 'desc' → -1, otherwise 1.
 * Returns default `{ _id: -1 }` when input absent.
 *
 * @example
 * parseSort("createdAt:desc,username:asc") // { createdAt: -1, username: 1 }
 * parseSort({ age: -1 })                   // { age: -1 }
 *
 * @param sort Sort string or already-formed object.
 * @returns Mongo sort object
 */
export declare const parseSort: (sort?: string | Record<string, any>) => Record<string, any>;
/**
 * Parse pagination parameters into page, pageSize, skip, limit.
 *
 * Clamps page ≥ 1 and pageSize ∈ [1, 200] (protects servers from huge queries).
 *
 * @example
 * parsePagination({ page: 2, pageSize: 25 }) // { page: 2, pageSize: 25, skip: 25, limit: 25 }
 * parsePagination({})                        // { page: 1, pageSize: 20, skip: 0,  limit: 20 }
 *
 * @param opts.page current page number (1-based)
 * @param opts.pageSize items per page
 * @returns { page, pageSize, skip, limit }
 */
export declare const parsePagination: ({ page, pageSize, }?: {
    page?: number | string;
    pageSize?: number | string;
}) => {
    page: number;
    pageSize: number;
    skip: number;
    limit: number;
};
