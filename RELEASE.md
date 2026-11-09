# Release Notes & Migration Guide (v1.0.0)

Welcome to **`inversify-typeorm` v1.0.0**! This major release brings full modernization across modern Node.js, TypeORM 1.x, and InversifyJS 8.x, while eliminating architectural flaws, reducing package weight, and unlocking full constructor parameter injection.

---

## ⚡ Quick Checklist: Do I Need to Change Anything in My App?

| Question | Answer & Required Action |
| :--- | :--- |
| **What Node.js version am I running?** | If you are on **Node 16 or 18**, you **must upgrade to Node >= 20.0.0** (Node 20, 22, or 26). |
| **What TypeORM version do I have?** | Upgrade your application to **`typeorm@^1.1.0`**. (TypeORM 0.3 is deprecated). |
| **What Inversify version do I have?** | Upgrade to **`inversify@^8.2.0`**. |
| **How do I configure named DataSources?** | Specify `name: 'yourName'` inside your `TypeOrmManager.importRoot({...})` options object. `inversify-typeorm` preserves this property for container token resolution even though upstream TypeORM 1.0 removed it from raw `DataSourceOptions`. |
| **Where do I import decorators from?** | Import everything directly from the package root: `import { Service, InjectRepository, InjectDataSource, InjectEntityManager } from 'inversify-typeorm'`. (Deep path imports like `inversify-typeorm/lib/...` are no longer needed). |
| **Can I inject repositories in constructor parameters?** | **Yes!** `@InjectRepository(User)` now works on constructor parameters as well as class properties. |

---

## ⚠️ Breaking Changes & Upstream Incompatibilities

### 1. Node.js Engine: `>= 20.0.0` Required
* **What changed**: Node 16 and 18 reached end-of-life upstream. The compilation target is now `es2023`, leveraging native async/await and modern ECMAScript features.
* **Action Required**: Upgrade your runtime environment to Node 20 LTS, Node 22 LTS, or Node 26.

### 2. TypeORM 1.x Migration
* **What changed**:
  * TypeORM 1.0 completely removed legacy global connection managers (`createConnection`, `getConnection`, `getRepository`, `Connection`).
  * Upstream `DataSourceOptions` removed the `name` property.
* **Action Required**:
  * When configuring named DataSources, pass `name` in `TypeOrmOptions`:
    ```typescript
    await TypeOrmManager.importRoot({
      name: 'analyticsConnection', // <-- Still fully supported via TypeOrmOptions!
      type: 'mysql',
      // ...
    })
    ```
  * In your database drivers, ensure you use modern driver versions (e.g., `mysql2` instead of legacy `mysql`, `mongodb@^7.0.0` for MongoDB).

### 3. InversifyJS 8.x Migration
* **What changed**:
  * Inversify 8 removed the legacy `import { interfaces } from 'inversify'` namespace.
  * Direct inspection of internal metadata (`METADATA_KEY.TAGGED_PROP`) is deprecated.
* **Action Required**:
  * If your application code directly imported `interfaces.Container` or `interfaces.ServiceIdentifier`, replace them with direct named imports:
    ```typescript
    // ❌ Deprecated in Inversify 8
    import type { interfaces } from 'inversify'
    function register(id: interfaces.ServiceIdentifier<any>) {}

    // ✅ Inversify 8 Standard
    import type { ServiceIdentifier } from 'inversify'
    function register(id: ServiceIdentifier<any>) {}
    ```

### 4. Removal of Deep Path Imports
* **What changed**: In `0.0.x`, decorators like `@Service()` were missing from `src/index.ts`, forcing developers to import from internal paths (`'inversify-typeorm/lib/decorators'`). All exports are now consolidated at the package root.
* **Action Required**: Replace deep path imports with clean root imports:
  ```typescript
  // ❌ Old Workaround
  import { InjectRepository } from 'inversify-typeorm/lib/decorators/typeorm.decorators.js'

  // ✅ v1.0.0 Standard
  import { InjectRepository, Service, TypeOrmManager } from 'inversify-typeorm'
  ```

---

## ✨ New Features & Architectural Improvements

### 1. Constructor Parameter Injection Support
Decorators previously only supported property injection. In v1.0.0, `@InjectRepository()`, `@InjectDataSource()`, and `@InjectEntityManager()` are dual property and parameter decorators.

```typescript
@Service()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}
}
```

### 2. Full TreeRepository & Custom Repository Resolution
* **Tree Entities**: When registering entities marked with `@Tree()`, `TypeOrmManager.importRepository([Category])` automatically resolves a `TreeRepository<Category>` even if the `DataSource` has not yet been initialized.
* **Custom Repositories**: Custom repository classes extending `Repository<T>` are automatically detected and instantiated with their respective metadata and query runners.

### 3. Idempotent Container Registration
* Re-calling `TypeOrmManager.importRoot(...)` or `TypeOrmManager.importRepository(...)` with existing identifiers now safely rebinds (`container.rebind`) instead of crashing with Inversify's `Ambiguous match found for serviceIdentifier`.

### 4. Zero-Fluff Runtime (Removed RxJS and TSLib)
* **Decoupled `rxjs`**: Replaced RxJS (7.8.2) retry pipe with a zero-dependency async retry loop with exponential backoff.
* **Removed `tslib`**: Target is `es2023` emitting native async/await and object spread. Zero runtime helper overhead.
* **Lightweight Bundle**: Reduced package footprint and eliminated teardown timer warnings.

---

## 🔄 Side-by-Side Migration Examples

### Example 1: Service Dependency Injection

````carousel
```typescript
// ❌ Prior to v1.0.0: Property injection only, deep imports required
import { Repository } from 'typeorm'
import { Service } from 'inversify-typeorm/lib/decorators/service.decorator.js'
import { InjectRepository } from 'inversify-typeorm/lib/decorators/typeorm.decorators.js'
import { User } from './user.entity.js'

@Service()
export class UserService {
  // Only property injection was supported
  @InjectRepository(User)
  private userRepository!: Repository<User>

  async findAll() {
    return this.userRepository.find()
  }
}
```
<!-- slide -->
```typescript
// ✅ v1.0.0: Clean root imports + Constructor injection
import { Repository } from 'typeorm'
import { InjectRepository, Service } from 'inversify-typeorm'
import { User } from './user.entity.js'

@Service()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll() {
    return this.userRepository.find()
  }
}
```
````

---

### Example 2: Multi-DataSource Configuration

````carousel
```typescript
// ❌ Prior to v1.0.0: Multi-connection token collision risk
import { TypeOrmManager } from 'inversify-typeorm'
import { User } from './user.entity.js'

// Repeated calls threw "Ambiguous match found" error
await TypeOrmManager.importRoot({
  type: 'mysql',
  name: 'analytics',
  entities: [User],
})
```
<!-- slide -->
```typescript
// ✅ v1.0.0: Idempotent & Type-safe Named DataSources
import { TypeOrmManager, type TypeOrmOptions } from 'inversify-typeorm'
import { User } from './user.entity.js'

const options: TypeOrmOptions = {
  name: 'analytics', // Explicitly typed and isolated
  type: 'mysql',
  entities: [User],
  retryAttempts: 5,
  retryInterval: 2000,
}

// Safely rebinds if invoked multiple times without collision
await TypeOrmManager.importRoot(options, false)
await TypeOrmManager.importRepository([User], options)
```
````

---

## 📋 Comprehensive Issue & Change Tracking Ledger

Every defect and architectural modernization resolved in `v1.0.0` is indexed below:

| ID | Seam / Area | Identified Problem | Solution Applied | Status |
| :--- | :--- | :--- | :--- | :---: |
| **REL-01** | `src/index.ts` | Decorators (`Service`, `InjectRepository`, etc.) and `DEFAULT_DATA_SOURCE_NAME` not exported from root. | Re-exported all decorators and constants from `src/index.ts`. | **Resolved** |
| **REL-02** | Decorator Typings | Decorators typed only as `PropertyDecorator`, breaking constructor parameter injection. | Updated signatures to dual `InjectDecorator` supporting properties & parameters. | **Resolved** |
| **REL-03** | `TypeOrmManager` | Re-invoking `importRoot` or `importRepository` threw `Ambiguous match found for serviceIdentifier`. | Added idempotent binding (`container.isBound ? rebind : bind`). | **Resolved** |
| **REL-04** | TreeRepository | `TreeRepository` resolution returned generic `Repository` on uninitialized DataSources. | Integrated `getMetadataArgsStorage().trees` inspection in `resolveRepository`. | **Resolved** |
| **REL-05** | RxJS Dependency | RxJS (7.8.2) was bundled solely for a 5-line connection retry pipe, leaking timers. | Replaced RxJS with native async retry loop; removed `rxjs` dependency. | **Resolved** |
| **REL-06** | Test Anti-Patterns | Decorator tests asserted internal reflection metadata keys rather than real resolution. | Added integration tests resolving services through `container.get`. | **Resolved** |
| **REL-07** | Custom Repositories | Custom repository classes (`isCustomRepository`) lacked constructor resolution logic. | Enhanced `resolveRepository` to instantiate custom repository classes. | **Resolved** |
| **REL-08** | Multi-DataSource Isolation | Lack of test coverage for parameter injection across multiple named DataSources. | Added multi-connection integration tests verifying strict token isolation. | **Resolved** |
| **REL-09** | Tooling Migration | Deprecated ESLint 8 / Prettier 2 setup was slow and produced installation warnings. | Migrated to Biome 2.x for unified formatting, linting, and import sorting. | **Resolved** |
| **REL-10** | TypeORM Upgrade | Legacy `typeorm@0.3.26` has deprecated global APIs and dropped `name` from `DataSourceOptions`. | Upgraded to `typeorm@^1.1.2`, preserved `name` on `TypeOrmOptions`. | **Resolved** |
| **REL-11** | InversifyJS Upgrade | Legacy `inversify@6.2.2` used deprecated `interfaces` namespace. | Upgraded to `inversify@^8.2.4`, modernized container bindings and types. | **Resolved** |
| **REL-12** | TypeScript 7 & SWC | `ts-jest` crashed on TypeScript 7.0 ("Corsa") due to removed Node compiler API. | Migrated Jest to `@swc/jest` with legacy decorator metadata support. | **Resolved** |
| **REL-13** | Toolchain Cleanup | Redundant `ts-node` dependency, untracked docs directory, and missing declaration maps. | Removed `ts-node`, added `.swcrc`, added `docs/` to `.gitignore`. | **Resolved** |
| **REL-14** | TSLib Removal | `tslib` was bundled in `dependencies` despite `es2023` emitting native async/await. | Removed `tslib` and deleted `importHelpers: true` from `tsconfig.json`. | **Resolved** |
| **REL-15** | Editor & Test Typings | `__tests__` was excluded in `tsconfig.json`, causing VS Code Stage 3 decorator errors. | Unified `tsconfig.json` across `src` & `__tests__`; created `tsconfig.build.json`. | **Resolved** |
| **REL-16** | Husky 9 Migration | Legacy Husky 8 setup with deprecated `husky.sh` script wrappers. | Upgraded to `husky@^9.1.7` and configured pre-commit hook with Biome `lint-staged`. | **Resolved** |
| **REL-17** | Architecture: Container Pluggability | `TypeOrmManager` was hard-coupled to module-level singleton container, blocking child/request container scopes. | Added optional `targetContainer: Container` parameter to all `TypeOrmManager` methods defaulting to singleton. | **Resolved** |
| **REL-18** | Lifecycle: Connection Registry | No mechanism existed to close all active database connections simultaneously on server shutdown. | Implemented internal DataSource tracking and exposed `TypeOrmManager.destroyAll()` with resilient all-settled disposal and error aggregation. | **Resolved** |
| **REL-19** | Architecture: Unified Token Resolution | Token derivation was fragmented across 4 shallow helpers duplicating name extraction branching. | Replaced with unified `extractDataSourceName` normalizing strings, options, and DataSource instances. | **Resolved** |
| **REL-20** | Defect Fixes & Spec Alignment | `createDataSource` stripped `name`, `handleRetry` threw on `retryAttempts: 0`, and custom repo lacked direct typing in `importRepository`. | Preserved `name` on `dataSource.options`, enforced `Math.max(1, retryAttempts)`, typed `EntityOrCustomRepository`, and widened `@InjectRepository`. | **Resolved** |

---

## 🚀 Architectural Deepening & Production Hardening in v1.0.0

### 1. Hierarchical & Pluggable Container Support
You can now pass custom Inversify `Container` instances (e.g. child containers, request scopes, or multi-tenant test containers) into `TypeOrmManager`:
```typescript
const requestContainer = new Container()
await TypeOrmManager.importRoot(options, true, requestContainer)
await TypeOrmManager.importRepository([User], options, requestContainer)
```

### 2. Graceful Shutdown with `destroyAll()`
One-call teardown for all active database connections tracked by the application:
```typescript
process.on('SIGTERM', async () => {
  await TypeOrmManager.destroyAll()
  process.exit(0)
})
```

### 3. Preserved Connection Names on `DataSource` Instances
TypeORM 1.0 removed `name` from raw `DataSourceOptions`. `createDataSource()` now explicitly re-attaches `options.name` onto `dataSource.options.name`, ensuring instance-based token lookups (`getDataSourceToken(dataSource)`) resolve identically to string-based lookups.

### 4. Direct Custom Repository Registration
`TypeOrmManager.importRepository` now natively accepts custom repository classes (`EntityOrCustomRepository<T>[]`) without requiring `as unknown as EntityTarget<any>` type casts.
