# Contributing to mongolify

Thank you for your interest in contributing! 🎉
This guide will help you set up, develop, and contribute effectively.

---

## 🛠️ Getting Started

### 1. Fork the Repository

Click **Fork** on GitHub and clone your fork locally:

```bash
git clone https://github.com/DarshanAguru/mongolify.git
cd mongolify
```

### 2. Install Dependencies

Use **npm**:

```bash
npm install
```

### 3. Build the Project

To build and prepare the library:

```bash
npm run build
```

---

## 🧱 Project Structure

```
mongolify/
|
├── scripts/
|   └── copy-cjs-package.js
|
├── src/
│   ├── ajvEngine.ts
|   ├── cacheRegistry.ts
|   ├── jsonSchemaCompiler.ts
|   ├── mongooseIntrospect.ts
|   ├── policy.ts
|   ├── queryHelpers.ts
|   ├── types.ts
│   └── index.ts
│
├── example/
│   ├── server.js
│   ├── routes/
│   └── models/
│
├── package.json
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── README.md
```

---

## 🧩 How to Contribute

### 1. Create a New Branch

```bash
git checkout -b feature/add-new-feature
```

### 2. Make Your Changes

Follow the existing code style. Each addition should:

- Be written in TypeScript or clean JavaScript.
- Export from `src/index.ts`.
- Include minimal inline documentation and proper typing.

### 3. Commit Convention

Use descriptive commit messages:

```
feat: add custom DTO/Validator/etc.
fix: correct validation logic
docs: update README usage examples
```

### 4. Push and Submit PR

```bash
git push origin feature/add-new-feature
```

Then open a **Pull Request** on GitHub.
Include:

- A summary of the change
- Screenshots if applicable
- Any issues it fixes (`Fixes #123`)

---

## 🚀 Releasing to npm

Maintainers can release updates using:

```bash
npm run build
npm publish --access public
```

Ensure `package.json` has the correct version and entry points.

---

## 🧪 Example Setup and Running

The repository includes an **example** folder demonstrating all features:

### Steps to run the example:

1. Navigate to the root and build the library:

   ```bash
   npm install
   npm run build
   ```

2. Go to the example folder:

   ```bash
   cd example
   ```

3. Install example dependencies:

   ```bash
   npm install
   ```

4. Start the example server:
   ```bash
   npm start
   ```

### Example Features:

- **Auth Routes**: Demonstrates DTO validation and JSON Schema emission.
- **Policy Routes**: Shows PolicyPipeline hooks for CRUD operations.
- **Query Routes**: Uses query helpers for filtering, sorting, and pagination.
- **Cache Routes**: Displays caching performance for rule trees and Ajv validators.

Access the server at: `http://localhost:8080`

---

## 🗣️ Questions or Ideas?

Open a [GitHub Discussion](https://github.com/DarshanAguru/mongolify/discussions)
or create an [Issue](https://github.com/DarshanAguru/mongolify/issues) with the **enhancement** label.

---

### 💙 Thank You

Your contributions help make this library better for the entire Node.js / MongoDB Community!
