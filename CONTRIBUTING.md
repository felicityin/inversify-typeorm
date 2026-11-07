# Contributing to inversify-typeorm

Thank you for your interest in contributing to `inversify-typeorm`! This guide explains our development workflow, standards, and pull request process.

---

## 🛠️ Prerequisites & Toolchain

Our repository uses modern, high-performance developer tooling:

- **Node.js**: `>= 20.0.0` (Tested on Node 20, 22, and 26)
- **TypeScript**: `^7.0.0` ("Corsa" native Go compiler)
- **Code Quality**: [Biome](https://biomejs.dev/) for unified formatting, linting, and import sorting
- **Test Runner**: [Jest](https://jestjs.io/) with [@swc/jest](https://swc.rs/) for rapid test execution
- **Git Hooks**: [Husky](https://typicode.github.io/husky/) v9 and [lint-staged](https://github.com/lint-staged/lint-staged)

---

## 🚀 Getting Started

1. **Fork and Clone** the repository:
   ```bash
   git clone https://github.com/<your-username>/inversify-typeorm.git
   cd inversify-typeorm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```
   *(Running `npm install` automatically triggers the `prepare` script, which installs Husky git hooks and compiles the project).*

---

## 📂 Repository Structure

```
inversify-typeorm/
├── src/
│   ├── decorators/             # @Service, @InjectRepository, @InjectDataSource, etc.
│   ├── interfaces.ts           # Type definitions (TypeOrmOptions, tokens, custom repos)
│   ├── typeorm.constants.ts    # Default constants (DEFAULT_DATA_SOURCE_NAME)
│   ├── typeorm.manager.ts      # TypeOrmManager container binding coordinator
│   ├── typeorm.utils.ts        # Pure token resolution and DataSource factory helpers
│   └── index.ts                # Public library exports
├── __tests__/                  # Comprehensive Jest test suites
├── examples/                   # Practical integration examples
├── .husky/                     # Git pre-commit hooks
├── biome.json                  # Biome linting and formatting configuration
├── .swcrc                      # SWC compiler configuration for Jest
├── tsconfig.json               # Root TypeScript configuration (IDE & type checking)
└── tsconfig.build.json         # Artifact build configuration (emits to lib/)
```

---

## 📜 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `npm run build` | Compiles `src/` into `lib/` (JavaScript + `.d.ts` declaration maps) via `tsc -p tsconfig.build.json`. |
| `npm run typecheck` | Runs TypeScript type checking across all files (`src/` and `__tests__/`) via `tsc --noEmit`. |
| `npm test` | Runs the test suite via Jest and `@swc/jest` with coverage reporting. |
| `npm run test:watch` | Runs Jest in watch mode for interactive TDD development. |
| `npm run check` | Formats, lints, and organizes imports in-place using Biome. |
| `npm run check:ci` | Verifies formatting and linting without writing changes (used in CI). |
| `npm run lint` | Runs Biome linter across all source, test, and example files. |
| `npm run format` | Runs Biome code formatter. |
| `npm run clean` | Removes the compiled `lib/` output directory. |

---

## 🧪 Testing Guidelines (TDD)

We follow a strict **Test-Driven Development (TDD)** discipline:

1. **Reproduce First**: Before fixing a bug or adding an edge case, write a failing test in `__tests__/` that reproduces the issue (**RED** state).
2. **Implement**: Apply the minimum code change in `src/` to make the test pass (**GREEN** state).
3. **Refactor**: Clean up the implementation while keeping all tests passing.
4. **Public Seam Testing**: Prefer testing public container behavior (`container.get(...)`) over asserting internal reflection metadata keys.
5. **Coverage**: Maintain at least **95%+ statement, line, and function coverage**, and **90%+ branch coverage** across the entire codebase.

---

## 🎨 Code Style & Quality Standards

- Formatting and linting are strictly governed by [Biome](https://biomejs.dev/).
- Run `npm run check` before submitting changes to ensure code conforms to project standards:
  - Single quotes (`'`)
  - No semicolons (`semi: false`)
  - 120 character line width
  - Explicit imports with `.js` extensions for relative modules in compliance with `nodenext` ECMAScript resolution.
- Never disable compiler type safety flags (`strict`, `noUncheckedIndexedAccess`, `noExplicitAny`) without discussion.

---

## 🔀 Git & Pull Request Workflow

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/issue-description
   ```

2. Make your changes and verify all gates pass:
   ```bash
   npm run check
   npm run typecheck
   npm test
   npm run build
   ```

3. Commit your changes using [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add support for XYZ`
   - `fix: resolve TreeRepository token binding mismatch`
   - `docs: update README with multi-connection examples`
   - `chore: update build scripts`

   *Note: Husky will run `lint-staged` automatically on every commit to ensure clean formatting.*

4. Push to your fork and submit a Pull Request against the `main` branch:
   - Provide a clear description of what changed and why.
   - Reference any relevant GitHub issues or bug reports.
   - Ensure all automated checks pass.

---

## 📋 Pull Request Checklist

Before submitting your PR, ensure:

- [ ] `npm run check:ci` passes without errors or formatting diffs.
- [ ] `npm run typecheck` passes with 0 errors.
- [ ] `npm test` passes with all tests green and high coverage.
- [ ] `npm run build` generates clean output in `lib/`.
- [ ] Any breaking changes or new features are documented in [RELEASE.md](./RELEASE.md).

