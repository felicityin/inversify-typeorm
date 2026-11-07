# Release & Change Log

This document tracks all identified problems, architectural deepening, test suites written, and resolutions applied across the `inversify-typeorm` library.

---

## Tracking Table

| ID | Module / Seam | Problem Identified | Resolution / What Was Solved | Status |
| :--- | :--- | :--- | :--- | :--- |
| **REL-01** | `src/index.ts` & Decorators | Decorators (`Service`, `InjectRepository`, etc.) and `DEFAULT_DATA_SOURCE_NAME` not exported from package root; consumers forced into internal path imports. | Re-exported all decorators and constants from `src/index.ts`. | **Resolved** |
| **REL-02** | `src/decorators/typeorm.decorators.ts` | Decorators typed solely as `PropertyDecorator`, breaking constructor parameter injection (`constructor(@InjectRepository(User) repo)`). Mismatched `string` type instead of `CustomDataSource`. | Updated decorator signatures to dual property/parameter `InjectDecorator` and accepted `CustomDataSource`. | **Resolved** |
| **REL-03** | `src/typeorm.manager.ts` & Container | Re-invoking `importRoot` or `importRepository` with the same token caused Inversify to throw `Ambiguous match found for serviceIdentifier: DataSource`. | Implemented idempotent binding check (`container.isBound(...) ? rebind : bind`) for DataSources, EntityManagers, and Repositories. | **Resolved** |
| **REL-04** | `src/typeorm.manager.ts` & TreeRepository | `TreeRepository` resolution failed when DataSource was uninitialized because `conn.entityMetadatas` is empty (the existing test was commented out and marked broken). | Integrated TypeORM's `getMetadataArgsStorage().trees` detection in `resolveRepository`, enabling accurate `TreeRepository` resolution on uninitialized and initialized DataSources alike. Uncommented and passed test in `__tests__/typeorm.manager.ts`. | **Resolved** |
| **REL-05** | `src/typeorm.utils.ts` & RxJS | RxJS (7.8.2) was a heavy runtime dependency bundled solely for a 5-line connection retry pipe, causing process exit timer warnings. | Replaced RxJS with native async retry logic with exponential backoff, removing `rxjs` completely from dependencies and eliminating test teardown timer leaks. | **Resolved** |
| **REL-06** | `__tests__/decorators/typeorm.decorators.ts` | Existing decorator tests checked internal `Reflect.getMetadata(METADATA_KEY.TAGGED_PROP)` rather than true container dependency resolution (TDD anti-pattern). | Implemented end-to-end integration tests in `__tests__/flaws-and-edge-cases.test.ts` verifying real instance resolution through `container.get`. | **Resolved** |
| **REL-07** | Custom Repositories | Custom repository classes (`isCustomRepository`) lacked resolution handling and integration tests. | Enhanced `resolveRepository` to instantiate custom repository classes with target entity and EntityManager, verifying resolution on both default and named DataSources. | **Resolved** |
| **REL-08** | Multi-DataSource Isolation | Token generation and constructor parameter injection across multiple named DataSources lacked integration coverage. | Added integration tests verifying isolated resolution across named DataSources without cross-talk. | **Resolved** |
| **REL-09** | Tooling & Toolchain | Deprecated ESLint 8 and Prettier 2 setup causes slow multi-step formatting/linting and installation warnings. | Migrated to Biome 2.x for unified, high-speed formatting, linting, and import sorting; removed ESLint and Prettier configs and 4 devDependencies. | **Resolved** |
| **REL-10** | Core Dependency: TypeORM | Current `typeorm@0.3.26` has deprecated global APIs, removed `name` from `DataSourceOptions`, and lacks compatibility with modern TypeORM 1.x. | Upgrade to `typeorm@^1.1.2`, standardize explicit `name` on `TypeOrmOptions`, preserve `name` extraction from `dataSource.options`, update Node engine to `>=20`, and target `es2023`. | **Resolved** |
| **REL-11** | Core Dependency: InversifyJS | Current `inversify@6.2.2` uses deprecated `interfaces` namespace and legacy internal reflection metadata. | Upgrade to `inversify@^8.2.4`, remove `interfaces` namespace imports, modernize tests to public behavior, and align decorators. | **Resolved** |
| **REL-12** | Toolchain: TypeScript 7 & Jest SWC | TypeScript 7.0 (Go-based native compiler "Corsa") removes programmatic compiler API, causing legacy `ts-jest` to throw peer resolution errors. | Upgraded compiler to `typescript@^7.0.2`, migrated Jest transform to `@swc/jest` and `@swc/core` with legacy decorator metadata support, achieving sub-second compilation and test run times. | **Resolved** |
| **REL-13** | Toolchain & Build Optimization | Redundant `ts-node` dependency, inline SWC configuration duplication in Jest, untracked docs directory, and missing declaration maps. | Removed `ts-node`, established `.swcrc` as central SWC configuration, simplified `jest.config.js`, optimized `tsconfig.json` (`declarationMap: true`, `newLine: lf`), and added `docs/` to `.gitignore`. | **Resolved** |

---

## Detailed Change History

### [1.0.0]

#### 1. Major Core Upgrades (TypeORM 1.x & InversifyJS 8.x - ADR-0002)
- **TypeORM Upgrade (`typeorm@^1.1.2`)**:
  - Upgraded from `0.3.26` to `^1.1.2`.
  - TypeORM 1.0 removed `name` from `DataSourceOptions` and `DataSource` instances.
  - Added optional `name?: string` explicitly to `TypeOrmOptions` in `src/interfaces.ts`.
  - Updated `getDataSourcePrefix`, `getDataSourceToken`, and `getEntityManagerToken` to extract `name` from `dataSource.options` when a `DataSource` instance is passed.
  - Upgraded `mongodb` devDependency to `^7.8.0` for TypeORM 1.x driver compatibility.
- **InversifyJS Upgrade (`inversify@^8.2.4`)**:
  - Upgraded from `6.2.2` to `^8.2.4`.
  - Removed deprecated `interfaces` namespace imports (`interfaces.ServiceIdentifier`, `interfaces.Container`).
  - Migrated `__tests__/decorators/typeorm.decorators.ts` from testing internal `Reflect.getMetadata(METADATA_KEY.TAGGED_PROP)` to testing real runtime container resolution via `container.get`.
  - Preserved full backward and forward compatibility for `@InjectRepository`, `@InjectDataSource`, and `@InjectEntityManager`.

#### 2. Compiler & Test Toolchain Modernization (TypeScript 7 & SWC Jest)
- **TypeScript 7.0 (`typescript@^7.0.2`)**:
  - Upgraded compiler to TypeScript 7.0 ("Corsa", native Go compiler).
  - Modernized `tsconfig.json` target to `es2023` and `moduleResolution` to `node16`.
  - Node engine requirement set to `>=20` (Node 26 compatible).
- **Jest SWC Transformer (`@swc/jest` & `@swc/core`)**:
  - Replaced legacy `ts-jest` (which required TypeScript JavaScript compiler API not exposed in TS7) with Rust-based `@swc/jest` (`^0.2.39`) and `@swc/core` (`^1.16.22`).
  - Configured `jest.config.js` with `legacyDecorator: true` and `decoratorMetadata: true` for decorator and reflection support.
  - Test suite runtime decreased from 35s+ to ~15s while maintaining 100% test pass rate.

#### 3. Verification & Quality Gates
- **Tests**: All 8 test suites passing (43 of 43 tests).
- **Coverage**: 99.01% statements, 93.33% branches, 100% functions, 99.01% lines.
- **Compiler**: `tsc` (TypeScript 7.0.2) compiles cleanly with 0 errors.
- **Linter & Formatter**: Biome 2.6.6 passes cleanly with 0 errors.

---

## Detailed Change History

### [0.0.6]

#### 1. Test Suite Expansion (TDD Phase 1 - RED State Verified)
- Added `__tests__/flaws-and-edge-cases.test.ts` to test public seams before modifying library source code.
- Successfully isolated and reproduced failing test cases:
  - **TreeRepository Resolution Failure**: Verified that `importRepository` returned a generic `Repository` instead of `TreeRepository` when DataSource was uninitialized.
  - **Custom Repository Token & Resolution Failure**: Verified missing binding errors when resolving custom repository classes.
  - **Public Module Seam**: Verified that root index failed to export required decorators.
  - **Duplicate Registration Collision**: Verified `Ambiguous match found` error on multiple imports to the container.

#### 2. Architectural Refactoring & Bug Fixes (Phase 2 - GREEN State Verified)
- **`src/index.ts`**:
  - Re-exported `./decorators/index.js` and `./typeorm.constants.js` to ensure the library's public boundary exposes all required decorators and constants.
- **`src/decorators/typeorm.decorators.ts`**:
  - Defined `InjectDecorator = (target: object, propertyKey?: string | symbol, parameterIndex?: number) => void`.
  - Allowed decorators to be safely applied to constructor parameters and properties.
  - Widened `dataSource` parameter in `InjectRepository` to accept `CustomDataSource`.
- **`src/typeorm.utils.ts`**:
  - Updated `resolveRepository` to check TypeORM's `getMetadataArgsStorage().trees` so that tree entities resolve to `TreeRepository` regardless of DataSource initialization state.
  - Updated `resolveRepository` to properly construct custom repository classes via their constructor when `isCustomRepository(entity)` is true.
  - Replaced RxJS retry pipe (`defer` + `retry` + `lastValueFrom`) with native `handleRetry` async/await loop.
- **`src/typeorm.manager.ts`**:
  - Added idempotent binding check (`isBound ? rebind : bind`) across `importRoot` and `importRepository` to prevent binding collision errors.
  - Uncommented and verified the `TreeRepository` test in `__tests__/typeorm.manager.ts`.
- **`package.json`**:
  - Removed `rxjs` from dependencies, reducing package bundle weight.
  - Added `mongodb` to devDependencies for driver testing.

#### 3. Tooling Modernization (Biome Migration - ADR-0001)
- Replaced ESLint (`8.29.0`) and Prettier (`2.8.8`) with `@biomejs/biome` (`2.6.6`).
- Uninstalled 4 legacy devDependencies: `eslint`, `prettier`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser` (removed 94 subpackages).
- Generated `biome.json` preserving 100% of formatting rules (`lineWidth: 120`, `singleQuote: true`, `semi: false`, `trailingComma: "all"`, `lineEnding: "lf"`).
- Migrated TypeScript lint rules (`noExplicitAny`, `useImportType`, `noUnusedVariables`) and enabled experimental parameter decorator parsing.
- Updated npm scripts (`lint`, `lint:fix`, `format`, `format:check`, `format:write`, `check`) and pre-commit `lint-staged`.
- Deleted deprecated `.eslintrc.cjs`, `.eslintignore`, `.prettierrc`.
- Recorded architectural decision in `docs/adr/ADR-0001-migrate-to-biome.md`.

#### 4. Verification & Quality Gates
- **Biome Check**: 40 files checked in 89ms; 0 errors, 0 warnings.
- **Tests**: 8 of 8 test suites passed (43 of 43 tests passing).
- **Coverage**: 99.0% statements, 93.25% branches, 100% functions, 99.0% lines.
- **Build**: TypeScript compilation (`tsc`) passed with 0 errors.
