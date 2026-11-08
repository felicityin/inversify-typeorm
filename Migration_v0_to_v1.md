# Migration Guide: v0.0.x to v1.0.0

This guide walks you through migrating an existing project from `inversify-typeorm` **v0.0.6** (or any `v0.0.x` pre-release) to **v1.0.0**.

`inversify-typeorm` v1.0.0 is a major milestone that establishes a production-ready, strictly typed public API. It adopts modern ECMAScript Modules (ESM), upgrades peer dependencies to **InversifyJS 8.x** and **TypeORM 1.x**, removes unnecessary runtime dependencies like RxJS, adds constructor parameter injection, supports pluggable containers, and introduces graceful connection teardown.

---

## Table of Contents
1. [Overview of Breaking Changes](#overview-of-breaking-changes)
2. [Step 1: Runtime & Toolchain Prerequisites](#step-1-runtime--toolchain-prerequisites)
3. [Step 2: Upgrading Peer Dependencies](#step-2-upgrading-peer-dependencies)
4. [Step 3: Migrating from CommonJS to ESM](#step-3-migrating-from-commonjs-to-esm)
5. [Step 4: Updating Imports (No More Deep Path Imports)](#step-4-updating-imports-no-more-deep-path-imports)
6. [Step 5: Updating InversifyJS 8 Types & Decorators](#step-5-updating-inversifyjs-8-types--decorators)
7. [Step 6: Configuring Named DataSources (TypeORM 1.0)](#step-6-configuring-named-datasources-typeorm-10)
8. [Step 7: Constructor Parameter Injection](#step-7-constructor-parameter-injection)
9. [Step 8: Custom Repositories & Pluggable Containers](#step-8-custom-repositories--pluggable-containers)
10. [Step 9: Graceful Application Teardown](#step-9-graceful-application-teardown)
11. [Troubleshooting FAQ](#troubleshooting-faq)

---

## Overview of Breaking Changes

| Area | v0.0.x | v1.0.0 | Migration Action |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 14` / `>= 16` | `>= 20.0.0` (LTS 20, 22, 26) | Upgrade your Node.js runtime. |
| **Module Format** | CommonJS & ESM hybrid | Pure ESM (`"type": "module"`) | Use `import` syntax or dynamic `import()`. |
| **InversifyJS** | `^6.0.0` | `^8.0.0` | Upgrade `inversify` and replace deprecated namespaces. |
| **TypeORM** | `^0.3.x` | `^1.0.0` | Upgrade `typeorm` and modern database drivers. |
| **Package Exports** | Decorators missing from root | Root export (`inversify-typeorm`) | Remove `/lib/...` from import paths. |
| **RxJS** | Bundled dependency (7.8.2) | Completely removed | Native `async/await` replaces RxJS observables. |

---

## Step 1: Runtime & Toolchain Prerequisites

Ensure your environment runs Node.js 20 or later:
```bash
node -v # Should output v20.x.x, v22.x.x, or v26.x.x
```

In your `tsconfig.json`, verify that decorator metadata and ES module resolution are enabled:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true
  }
}
```

---

## Step 2: Upgrading Peer Dependencies

Update your project's dependencies to match the modern peer ecosystem:

```bash
# npm
npm install inversify-typeorm@^1.0.0 inversify@^8.2.0 typeorm@^1.1.0 reflect-metadata@^0.2.2

# yarn
yarn add inversify-typeorm@^1.0.0 inversify@^8.2.0 typeorm@^1.1.0 reflect-metadata@^0.2.2

# pnpm
pnpm add inversify-typeorm@^1.0.0 inversify@^8.2.0 typeorm@^1.1.0 reflect-metadata@^0.2.2
```

---

## Step 3: Migrating from CommonJS to ESM

`inversify-typeorm` v1.0.0 is published as a native ES Module.

If your application's `package.json` does not already have `"type": "module"`, add it:
```json
{
  "type": "module"
}
```

Replace all CommonJS `require()` calls with standard ESM `import` statements:

```typescript
// ❌ Deprecated in v1.0.0 (CommonJS require)
const { TypeOrmManager } = require('inversify-typeorm')

// ✅ Standard v1.0.0 (ESM import)
import { TypeOrmManager } from 'inversify-typeorm'
```

---

## Step 4: Updating Imports (No More Deep Path Imports)

In `v0.0.x`, decorators like `@Service()` were missing from the package entry point, forcing workarounds using internal paths. In `v1.0.0`, all public APIs and decorators are exposed from the root.

```typescript
// ❌ Deprecated deep path imports
import { Service } from 'inversify-typeorm/lib/decorators/service.decorator.js'
import { InjectRepository, InjectDataSource } from 'inversify-typeorm/lib/decorators/typeorm.decorators.js'

// ✅ Clean v1.0.0 root imports
import {
  Service,
  InjectRepository,
  InjectDataSource,
  InjectEntityManager,
  TypeOrmManager,
  DEFAULT_DATA_SOURCE_NAME,
} from 'inversify-typeorm'
```

---

## Step 5: Updating InversifyJS 8 Types & Decorators

InversifyJS 8 removed the legacy `interfaces` namespace. If your application imported types from `inversify/interfaces`:

```typescript
// ❌ Deprecated in Inversify 8
import type { interfaces } from 'inversify'
function register(container: interfaces.Container) {}

// ✅ Standard Inversify 8
import { Container, type ServiceIdentifier } from 'inversify'
function register(container: Container) {}
```

Always import `reflect-metadata` once at the very top of your application entry point before any container or decorator calls:
```typescript
import 'reflect-metadata'
```

---

## Step 6: Configuring Named DataSources (TypeORM 1.0)

TypeORM 1.0 deprecated global connection managers and removed the `name` property from raw `DataSourceOptions`. 

`inversify-typeorm` continues to provide first-class named multi-database support via `TypeOrmOptions`:

```typescript
import { TypeOrmManager } from 'inversify-typeorm'

// Default connection
await TypeOrmManager.importRoot({
  type: 'sqlite',
  database: ':memory:',
  entities: [User],
  synchronize: true,
})

// Secondary / named connection
await TypeOrmManager.importRoot({
  name: 'analyticsConnection', // <-- Fully preserved on DataSource options
  type: 'postgres',
  host: 'localhost',
  database: 'analytics',
  entities: [AnalyticsEvent],
})
```

---

## Step 7: Constructor Parameter Injection

In `v0.0.x`, decorators were restricted to property injection. `v1.0.0` unlocks full **constructor parameter injection**, enabling strict readonly dependencies and straightforward unit testing:

```typescript
import { Service, InjectRepository, InjectDataSource } from 'inversify-typeorm'
import { Repository, DataSource } from 'typeorm'
import { User } from './entities/User.js'

@Service()
export class UserService {
  constructor(
    // ✅ Parameter injection is now fully supported!
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectDataSource('analyticsConnection')
    private readonly analyticsDataSource: DataSource,
  ) {}

  async listUsers() {
    return this.userRepo.find()
  }
}
```

> **Note**: Property injection (`@InjectRepository(User) private userRepo!: Repository<User>`) remains fully supported for backward compatibility.

---

## Step 8: Custom Repositories & Pluggable Containers

### Custom Repositories
Custom repositories can now be registered directly without type casting:

```typescript
export class UserRepository extends Repository<User> {
  findActive() {
    return this.find({ where: { isActive: true } })
  }
}

// ✅ Type-safe registration
await TypeOrmManager.importRepository([UserRepository])
```

### Pluggable / Scoped Containers
If your architecture uses child containers, per-request containers, or isolated test containers, you can pass `targetContainer` directly to `TypeOrmManager`:

```typescript
import { Container } from 'inversify'
import { TypeOrmManager } from 'inversify-typeorm'

const requestContainer = new Container()

// Registers bindings directly into requestContainer instead of global container
await TypeOrmManager.importRoot(options, true, requestContainer)
await TypeOrmManager.importRepository([User], options, requestContainer)
```

---

## Step 9: Graceful Application Teardown

In `v0.0.x`, closing database connections required tracking every `DataSource` instance manually. In `v1.0.0`, `TypeOrmManager` tracks active connections and offers one-call graceful teardown:

```typescript
import { TypeOrmManager } from 'inversify-typeorm'

async function shutdown() {
  console.log('Closing all database connections...')
  await TypeOrmManager.destroyAll()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

---

## Troubleshooting FAQ

### 1. `Error: Ambiguous match found for serviceIdentifier`
- **Cause**: In `v0.0.x`, re-invoking `importRoot()` or `importRepository()` on the same container caused collisions.
- **Resolution**: `v1.0.0` automatically rebinds existing identifiers safely (`container.isBound ? rebind : bind`). If you encounter this with custom bindings, ensure you aren't binding the same token twice manually without unbinding.

### 2. `SyntaxError: Cannot use import statement outside a module`
- **Cause**: Node is attempting to execute an ESM package in a CommonJS project.
- **Resolution**: Add `"type": "module"` to your project's `package.json` or configure ts-node/tsx/SWC with ESM loader support.

### 3. TreeRepository resolved as a plain Repository
- **Cause**: In `v0.0.x`, uninitialized DataSources returned plain `Repository` instances for `@Tree()` entities.
- **Resolution**: Fixed in `v1.0.0`. `TypeOrmManager.resolveRepository` now automatically queries TypeORM's metadata storage for tree entities and instantiates `TreeRepository` correctly.

