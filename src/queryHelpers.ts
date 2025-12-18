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
export const buildFilter = (
  params: {
    equals?: Record<string, any>;
    in?: Record<string, any[]>;
    range?: Record<string, { gte?: any; lte?: any }>;
    search?: { q: string; fields: string[]; caseInsensitive?: boolean };
    exists?: string[];
    notExists?: string[];
    regex?: Record<string, { pattern: string; options?: string }>;
  } = {}
) => {
  // Initialize the resulting filter object.
  const f: Record<string, any> = {};

  // 1) equals: merge direct equality pairs (e.g., { role: 'ADMIN' }).
  if (params.equals) Object.assign(f, params.equals);

  // 2) in: translate to $in arrays (e.g., city ∈ ['Hyd', 'BLR']).
  if (params.in) {
    for (const [field, arr] of Object.entries(params.in)) {
      f[field] = { $in: arr };
    }
  }

  // 3) range: numeric/date ranges via $gte/$lte per field.
  if (params.range) {
    for (const [field, r] of Object.entries(params.range)) {
      const o: any = {};
      if (r.gte != null) o.$gte = r.gte;
      if (r.lte != null) o.$lte = r.lte;
      f[field] = o;
    }
  }

  // 4) search: build case-insensitive regex OR across target fields.
  //    Useful for simple text search (NOT full-text index).
  if (params.search?.q && params.search.fields?.length) {
    const regex = new RegExp(
      params.search.q,
      // default to case-insensitive unless explicitly set to false
      params.search.caseInsensitive !== false ? 'i' : undefined
    );
    // $or: [{ fieldA: {$regex}}, { fieldB: {$regex}}, ...]
    f.$or = params.search.fields.map((field) => ({
      [field]: { $regex: regex },
    }));
  }

  // 5) exists: require field to exist.
  if (params.exists?.length) {
    for (const field of params.exists) {
      f[field] = { ...(f[field] || {}), $exists: true };
    }
  }

  // 6) notExists: require field to be absent.
  if (params.notExists?.length) {
    for (const field of params.notExists) {
      f[field] = { ...(f[field] || {}), $exists: false };
    }
  }

  // 7) regex: custom per-field regex; accepts pattern + options (e.g., 'i').
  if (params.regex) {
    for (const [field, { pattern, options }] of Object.entries(params.regex)) {
      f[field] = { $regex: new RegExp(pattern, options) };
    }
  }

  // Return final filter object.
  return f;
};

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
export const buildProjection = ({
  include = [],
  exclude = [],
}: { include?: string[]; exclude?: string[] } = {}) => {
  const proj: Record<string, number> = {};
  // Include mode: mark selected fields with 1
  if (include.length) include.forEach((f) => (proj[f] = 1));
  // Exclude mode: mark selected fields with 0
  if (exclude.length) exclude.forEach((f) => (proj[f] = 0));
  return proj;
};

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
export const parseSort = (sort?: string | Record<string, any>) => {
  if (!sort) return { _id: -1 };
  // If object provided, assume it is already in Mongo format.
  if (typeof sort === 'object') return sort;

  const out: Record<string, 1 | -1> = {};
  // Split by comma tokens, trim whitespace, ignore empty segments.
  for (const token of String(sort)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    // Expect "field:dir" where dir ∈ {asc, desc}; default asc.
    const [field, dir] = token.split(':');
    out[field] = (dir || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  }
  return out;
};

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
export const parsePagination = ({
  page = 1,
  pageSize = 20,
}: { page?: number | string; pageSize?: number | string } = {}) => {
  // Normalize to integers; default to 1 if NaN/undefined.
  const p = Math.max(1, Number(page) || 1);
  // Clamp pageSize to prevent excessive database load.
  const s = Math.max(1, Math.min(200, Number(pageSize) || 20));
  // Compute Mongo skip/limit.
  return { page: p, pageSize: s, skip: (p - 1) * s, limit: s };
};
