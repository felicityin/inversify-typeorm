# ADR-0001: Migrate from ESLint & Prettier to Biome

## Status
Proposed (Under Review)

## Context
The repository currently uses ESLint (`^8.29.0`), Prettier (`^2.8.8`), `@typescript-eslint/eslint-plugin`, and `@typescript-eslint/parser`.
- ESLint 8 reached end-of-life, producing deprecation warnings on installation and CI runs.
- Code formatting and linting require running two disjoint tools in sequence, increasing CI duration and local hook latency.
- Biome provides a single Rust-powered binary covering linting, formatting, and import sorting with near-zero configuration and high speed.

## Decision
1. Replace ESLint and Prettier with Biome (`@biomejs/biome` 2.x).
2. Migrate formatting options (`lineWidth: 120`, `singleQuote: true`, `semi: false`, `trailingComma: "all"`, `lineEnding: "lf"`) into `biome.json`.
3. Migrate TypeScript lint rules (`noExplicitAny`, `useImportType`, `noUnusedVariables`) into `biome.json`.
4. Update `package.json` scripts:
   - `lint`: `biome lint src __tests__ examples`
   - `format:check`: `biome format src __tests__ examples`
   - `format:write`: `biome format --write src __tests__ examples`
   - `check`: `biome check --write src __tests__ examples`
5. Update `lint-staged` to execute `biome check --write --no-errors-on-unmatched`.
6. Remove legacy configuration files: `.eslintrc.cjs`, `.eslintignore`, `.prettierrc`.
7. Remove legacy devDependencies: `eslint`, `prettier`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`.

## Consequences
- **Positive**:
  - Drops 4 deprecated devDependencies, reducing `node_modules` size and installation time.
  - Formats and lints in a single pass.
  - Native integration with pre-commit hooks via `lint-staged`.
- **Negative / Considerations**:
  - Developers need the Biome IDE extension (VS Code / WebStorm) for in-editor formatting instead of Prettier/ESLint plugins.

