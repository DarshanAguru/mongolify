# mongolify Example

A minimal Express server showcasing all features of the **mongolify** library without any database connection.

## 📁 Structure

```
example/
├─ server.js
├─ models/
│  └─ user.js
└─ routes/
   ├─ auth.js
   ├─ policy.js
   ├─ query.js
   └─ cache.js
```

## 🔧 Prerequisites

- Node.js 18+
- Your library built locally (from the project root):
  ```bash
  npm run build --workspace=mongolify
  ```
  or, if not using workspaces:
  ```bash
  cd mongolify && npm run build
  ```

## 🚀 Install & Run (inside `example/`)

```bash
# from project root
cd example
npm install
npm start
# or for live-reload
npm run dev
```

Server runs at: **http://localhost:3000**

> If you’re consuming the local library via workspaces, ensure the root `package.json` has:
>
> ```json
> { "private": true, "workspaces": ["mongolify", "example"] }
> ```
>
> And `example/package.json` depends on the library as:
>
> ```json
> { "dependencies": { "mongolify": "workspace:*" } }
> ```
>
> Alternatively, use a file dependency in `example/package.json`:
>
> ```json
> { "dependencies": { "mongolify": "file:../mongolify" } }
> ```

---

## 📚 What It Demonstrates

### 1 DTO Validation & JSON Schema (routes/auth.js)

- `POST /test/auth/login` — Validates login DTO using `buildAjvValidator` with `append` field `password`.
- `POST /test/auth/register` — Shows `include` + `optional` overrides.
- `PATCH /test/auth/profile` — Validates partial updates (nested fields, arrays).
- `GET /test/auth/schema/register` — Emits JSON Schema via `emitJsonSchema` for OpenAPI usage.

**Example request**

```bash
curl -X POST http://localhost:3000/test/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret12345"}'
```

### 2 Policy Hooks (routes/policy.js)

- `PolicyPipeline` demonstrates **before/after create/update/delete** hooks for auth & audit.
- Simulate actor roles via query param `?as=admin` or `?as=user`.

**Example requests**

```bash
# Create (requires admin)
curl -X POST 'http://localhost:3000/test/policy/create?as=admin' \
  -H 'Content-Type: application/json' \
  -d '{"username":"newuser"}'

# Update (requires authenticated user)
curl -X PATCH 'http://localhost:3000/test/policy/update/123?as=user' \
  -H 'Content-Type: application/json' \
  -d '{"city":"Hyderabad"}'

# Delete (requires admin)
curl -X DELETE 'http://localhost:3000/test/policy/delete/123?as=admin'
```

### 3 Query Helpers (routes/query.js)

Demonstrates `buildFilter`, `buildProjection`, `parseSort`, `parsePagination` against a **mock array**—no DB.

**Example request**

```bash
curl 'http://localhost:3000/test/query/users?sort=age:desc&ageMin=18&ageMax=50&include=id,username'
```

### 4 Caching Demo (routes/cache.js)

Shows timings for:

- RuleTree compilation (first vs cached)
- JSON Schema emission (first vs cached)
- Ajv validator compilation (first vs cached)

**Example request**

```bash
curl 'http://localhost:3000/test/cache/timings'
```

---

## 🧩 Files Overview

### `server.js`

Bootstraps Express and mounts feature routers under `/test/*`.

### `models/user.js`

Declares a Mongoose **Schema** only (no connection), which `mongolify` introspects.

### `contoller/auth.js`

Uses `buildAjvValidator` and `emitJsonSchema` to validate DTOs and emit schemas.

### `contoller/policy.js`

Uses `PolicyPipeline` to enforce authorization/audit before/after persistence (mocked).

### `contoller/query.js`

Applies Query Helpers to a local array to simulate filtering/sorting/pagination.

### `contoller/cache.js`

Measures and returns timing info to showcase caching efficacy.

---

## 🧠 Troubleshooting

- **Module not found**: Ensure your library’s ESM exports use relative imports with `.js` suffix (e.g., `export * from './types.js';`). Rebuild the library.
- **Workspaces resolution**: Run `npm install` at the root so the workspace symlinks are created.
- **CJS consumers**: Confirm `dist/cjs/package.json` contains `{ "type": "commonjs" }` (created by `scripts/copy-cjs-package.js`).

---

## 🧪 Quick Smoke Tests

- Hit `GET /` — should list available demo routes.
- Send invalid payload to `POST /test/auth/login` — should return validation errors.
- Toggle `?as=admin` / `?as=user` on policy routes — observe authorization differences.
- Compare timings on `/test/cache/timings` — first vs cached calls.

---
