# ADR-0002: Upgrade to TypeORM 1.x, InversifyJS 8.x, and TypeScript 7

## Status
Accepted

## Context
The library previously depended on `typeorm@0.3.26`, `inversify@6.2.2`, and `typescript@5.9.2`.
- **TypeORM 1.x (v1.1.2)** introduces major architectural modernizations:
  - Minimum Node.js version is now 20+ (dropping Node 16 and 18).
  - Minimum compilation target is ES2023.
  - Complete removal of legacy global connection managers (`createConnection`, `getConnection`, `getRepository`, `Connection`).
  - Removal of the `name` property from core `DataSourceOptions`.
  - Dropped legacy `mysql` driver in favor of `mysql2`.
- **InversifyJS 8.x (v8.2.4)** introduces modern DI patterns:
  - Removal of the legacy `interfaces` namespace (`import { interfaces } from "inversify"`).
  - Internal metadata storage redesign (deprecating direct inspection of `METADATA_KEY.TAGGED_PROP`).
  - Strict typing around `Container` bindings, `autobind`, and constructor reflection.
- **TypeScript 7.0 (v7.0.2 "Corsa")**:
  - Native Go compiler with significant performance improvements.
  - Removes the legacy programmatic Node.js JavaScript compiler API (`import ts from 'typescript'`).
  - Incompatible with `ts-jest` which hardcoded peer dependencies `<7` and relied on the legacy Node compiler API.

## Decision
1. **Upgrade Core Dependencies**:
   - `typeorm` -> `^1.1.2`
   - `inversify` -> `^8.2.4`
2. **Compiler & Toolchain Upgrade**:
   - Upgrade compiler to `typescript@^7.0.2`.
   - Replace `ts-jest` with `@swc/jest` (`^0.2.39`) and `@swc/core` (`^1.16.22`) to execute TypeScript 7 test suites via SWC with full support for legacy decorators and decorator metadata.
3. **Platform & Engine Requirements**:
   - Update `package.json` `"engines"`: `"node": ">=20"`.
   - Update `tsconfig.json` `"target"`: `"es2023"`.
4. **API & Interface Adjustments**:
   - Explicitly define `name?: string` in `TypeOrmOptions` (`src/interfaces.ts`) so applications can name connections independently of TypeORM's removed internal `DataSourceOptions.name`.
   - Update `getDataSourcePrefix` to inspect `dataSource.options.name` when given a `DataSource` instance.
   - Remove internal imports of `interfaces` from `"inversify"`.
   - Replace internal metadata tests in `__tests__/decorators/typeorm.decorators.ts` with public behavior tests (`container.get(Service)`).

## Consequences
- **Positive**:
  - Full compatibility with modern TypeORM 1.x applications, Inversify 8.x containers, and TypeScript 7.
  - 50%+ faster test execution via SWC Jest runner (~15s vs ~35s).
  - Zero deprecated legacy APIs or deprecation warnings.
  - Cleaner, strictly-typed public seams.
- **Negative / Considerations**:
  - Dropping support for Node.js 18 (aligning with upstream TypeORM 1.x end-of-life policy).

