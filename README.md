
mongolify
==============

A **generic, schema-driven DTO and validation toolkit** built for Mongoose schemas, without requiring any DB connection.

---

🚀 Introduction
---------------

`mongolify` is designed to make backend development with Mongoose easier and safer by providing:

- Automatic **DTO validation** based on your Mongoose schema.
- **JSON Schema generation** for OpenAPI/Swagger.
- **Ajv-powered validation** with caching for performance.
- **Policy hooks** for authorization and auditing.
- **Query helpers** for clean and consistent filtering, sorting, projection, and pagination.
- **Array Helpers** to simulate MongoDB-like filtering/sorting/projection/pagination **on plain arrays** for development and testing.

This library is **framework-agnostic** and works with **Express**, **Fastify**, or any Node.js backend.

---

✨ Features
---------

- ✅ Introspects your Mongoose `Schema` to build validation rules.
- ✅ Caching of rule trees, JSON Schemas, and Ajv validators.
- ✅ JSON Schema compiler + Ajv engine.
- ✅ Endpoint overrides: include/exclude/optional/required/append.
- ✅ Policy hooks: before/after create/update/delete.
- ✅ Query helpers: filter, projection, sort, pagination.
- ✅ Array helpers for development without MongoDB.
- ✅ Works for **JS** (ESM + CJS) and **TS** (types included).

---

📦 Installation
--------------

```bash
npm i mongolify
```

---

🛠️ Usage
--------

### TypeScript / ESM

```ts
import { buildAjvValidator, emitJsonSchema } from 'mongolify';
import { userSchema } from './models/user'; // Your Mongoose Schema

const validateLogin = buildAjvValidator(
  userSchema,
  {
    include: ['username'],
    append: {
      password: {
        type: 'string',
        required: true,
        minLength: 8,
        maxLength: 128,
      },
    },
  },
  { coerceTypes: false, allowUnknown: false }
);

const result = validateLogin({ username: 'alice', password: 'secret-secret' });
if (!result.ok) console.log(result.errors);

// JSON Schema (for OpenAPI)
const jsonSchema = emitJsonSchema(userSchema, {
  include: ['username', 'email'],
});
console.log(jsonSchema);
```

### CommonJS

```js
const { buildAjvValidator } = require('mongolify');
const { userSchema } = require('./models/user');

const validateRegister = buildAjvValidator(
  userSchema,
  {
    include: ['username', 'email', 'age'],
    optional: ['email'],
    append: { password: { type: 'string', required: true, minLength: 8 } },
  },
  { coerceTypes: true, allowUnknown: false }
);

const res = validateRegister({
  username: 'bob',
  age: '22',
  password: 'supersecret',
});
if (!res.ok) console.error(res.errors);
```

---

🧩 Array Helpers (for Development & Testing)
-------------------------------------------

When you **don’t have MongoDB** connected but want to **simulate query behavior** for development or unit testing, `mongolify` provides **array-based helpers** that mimic MongoDB query operations on plain JavaScript arrays.

These helpers are designed to work **in tandem with the main Query Helper functions** so you can test filtering, sorting, projection, and pagination logic without a database.

### Available Array Helpers

- `applyFilterToArray(items, filter)` — Filters an array using MongoDB-like operators (`$or`, `$in`, `$gte`, `$lte`, `$regex`, `$exists`, equality).
- `applySortToArray(items, sort)` — Sorts an array by multiple fields with direction (`1` for ASC, `-1` for DESC); does not mutate input by default.
- `applyProjectionToArray(items, projection)` — Projects fields (include/exclude mode) similar to MongoDB projections.
- `applyPaginationToArray(items, { page, pageSize })` — Returns a paginated slice plus metadata.

> These helpers are meant to be used with the **main query helper functions** to mirror the same behavior on arrays during development.

### Type-safe Signatures (TypeScript)

```ts
// Filter
export function applyFilterToArray<T extends Record<string, any>>(
  items: readonly T[],
  filter: Filter<T>
): T[];

// Sort
export function applySortToArray<T extends Record<string, any>>(
  items: readonly T[],
  sort: Partial<Record<keyof T, 1 | -1>>
): T[];

// Projection (general)
export function applyProjectionToArray<T extends Record<string, any>>(
  items: readonly T[],
  projection: Partial<Record<keyof T, 0 | 1>>
): Partial<T>[];

```

### Example

```ts

import {
  // Query helpers (DB-agnostic)
  buildFilter,
  buildProjection,
  parseSort,
  parsePagination,
} from 'mongolify';

import {
  // Array helpers (simulate MongoDB behavior on arrays)
  applyFilterToArray,
  applySortToArray,
  applyProjectionToArray,
  applyPaginationToArray,
} from 'mongolify/array-helpers';

type User = {
  id: number;
  name: string;
  age: number;
  email: string;
  joinedAt: Date;
};

const users: User[] = [
  { id: 1, name: 'Alice', age: 30, email: 'alice@example.com', joinedAt: new Date('2023-01-01') },
  { id: 2, name: 'Bob',   age: 25, email: 'bob@example.com',   joinedAt: new Date('2024-03-10') },
  { id: 3, name: 'Carol', age: 35, email: 'carol@example.com', joinedAt: new Date('2022-08-15') },
];

/**
 * Build filter/projection/sort/pagination using mongolify query helpers.
 * These are the same inputs you'd pass to your DB layer.
 */

// Filter: age >= 30 OR name matches /bob/i
const filter = buildFilter({
  ranges: { age: { gte: 30 } },
  or: [
    { regex: { name: { pattern: 'bob', flags: 'i' } } },
  ],
});

// Projection: include only name and email
const projection = buildProjection({
  include: ['name', 'email'],
});

// Sort: by age asc, then name desc
const sort = parseSort({ age: 'asc', name: 'desc' });

/**
 * Apply to arrays with the array-helpers
 */
const filtered = applyFilterToArray(users, filter);
const sorted   = applySortToArray(filtered, sort);
const projected = applyProjectionToArray(sorted, projection);

console.log(page.items);
```

---

📚 API Reference
----------------

### Core

- `compileRulesFromMongooseSchema(schema)` — Build rule tree from schema.
- `buildAjvValidator(schema, overrides?, options?)` — Create Ajv validator.
- `emitJsonSchema(schema, overrides?, options?)` — Generate JSON Schema.
- `PolicyPipeline` — Hooks for CRUD (`beforeCreate`, `afterCreate`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`).

### Query Helpers

- `buildFilter(params)` — Build Mongo filter (equals, ranges, regex, etc.).
- `buildProjection({ include?, exclude? })` — Projection object.
- `parseSort(sort)` — Parse sort string/object.
- `parsePagination({ page?, pageSize? })` — Pagination info.

### Array Helpers (No DB)

- `applyFilterToArray(items, filter)`
- `applySortToArray(items, sort)`
- `applyProjectionToArray(items, projection)`
- `applyPaginationToArray(items, { page, pageSize })`

---

🔍 Use Cases
-----------

- **Auth DTO validation**: Validate login/register payloads against schema.
- **OpenAPI integration**: Generate JSON Schema for API docs.
- **Dynamic forms**: Use JSON Schema for client-side validation.
- **Policy enforcement**: Add hooks for authorization and auditing.
- **Query building**: Simplify filtering, sorting, and pagination in controllers.
- **DB-less testing**: Mirror MongoDB-like operations on arrays during development.

---

🧪 Example Setup and Running
---------------------------

The repository includes an **example** folder demonstrating all features:

### Steps to run the example:

1. Clone the repository and navigate to the root:

   ```bash
   git clone https://github.com/DarshanAguru/mongolify.git
   cd mongolify
   ```

2. Install dependencies and build the library:

   ```bash
   npm install
   npm run build
   ```

3. Navigate to the example folder:

   ```bash
   cd example
   ```

4. Install example dependencies:

   ```bash
   npm install
   ```

5. Start the example server:

   ```bash
   npm start
   ```

Access the server at: `http://localhost:3000`

### Example Features:

- **Auth Routes**: Demonstrates DTO validation and JSON Schema emission.
- **Policy Routes**: Shows PolicyPipeline hooks for CRUD operations.
- **Query Routes**: Uses query helpers and array helpers for filtering, sorting, projection, and pagination.
- **Cache Routes**: Displays caching performance for rule trees and Ajv validators.

---

🤝 Contributing
--------------

Contributions are welcome!
Please read the [Contributing Guide](./CONTRIBUTING.md) and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

We welcome contributions! To contribute:

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/my-feature`.
3. Commit changes: `git commit -m 'Add my feature'`.
4. Push and open a PR.

### Development Setup

```bash
git clone https://github.com/darshan/mongolify.git
cd mongolify
npm install
npm run build
```

Please ensure:

- Code is formatted with Prettier.
- Tests are added for new features.
- Commit messages follow conventional commits.

---

📜 Code of Conduct
-----------------

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Be respectful and inclusive.

---

📜 License
---------

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

💬 Author
--------

**Darshan Aguru**
React Native Developer • AWS Certified Solutions Architect
GitHub: [@DarshanAguru](https://github.com/DarshanAguru)
Portfolio: [DarshanAguru](https://agurudarshan.tech)

---

👥 Contributors
--------------

This project exists thanks to all the people who contribute.

See: https://github.com/DarshanAguru/mongolify/graphs/contributors

---

⭐ Support
--------

If you find this library useful, give it a ⭐ on GitHub: https://github.com/DarshanAguru/mongolify
