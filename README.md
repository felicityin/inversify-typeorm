# inversify-typeorm

Dependency injection and service container integration for [TypeORM](https://github.com/typeorm/typeorm) using [InversifyJS](https://github.com/inversify/InversifyJS).

The implementation is strongly inspired by [@nestjs/typeorm](https://github.com/nestjs/typeorm).

---

## Installation

Install `inversify-typeorm` and its peer dependencies:

```bash
npm install inversify-typeorm typeorm inversify reflect-metadata
```

### TypeScript Prerequisites

Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "target": "es2022" // or higher (es2023)
  }
}
```

Import `reflect-metadata` once at the very top of your application entry point (e.g. `index.ts` or `app.ts`):

```typescript
import 'reflect-metadata'
```

---

## Basic Usage

### 1. Define an Entity

```typescript
// user.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  name!: string
}
```

### 2. Initialize the Database Connection

Bind the `DataSource` and `EntityManager` to the Inversify container using `TypeOrmManager.importRoot()`, and register your entity repositories using `TypeOrmManager.importRepository()`:

```typescript
// app.ts
import { TypeOrmManager } from 'inversify-typeorm'
import { User } from './user.entity.js'

// 1. Initialize DataSource and bind to container
await TypeOrmManager.importRoot({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'test',
  password: 'test',
  database: 'test',
  synchronize: true,
  logging: false,
  entities: [User],
})

// 2. Bind User repository to container
await TypeOrmManager.importRepository([User])
```

### 3. Inject into Services

Decorate your service with `@Service()` to bind it to the container. You can inject the `DataSource`, `EntityManager`, or `Repository` via **constructor parameters** or **class properties**:

```typescript
// user.service.ts
import { DataSource, EntityManager, Repository } from 'typeorm'
import { InjectDataSource, InjectEntityManager, InjectRepository, Service } from 'inversify-typeorm'
import { User } from './user.entity.js'

@Service()
export class UserService {
  // Property injection
  @InjectDataSource()
  private dataSource!: DataSource

  @InjectEntityManager()
  private entityManager!: EntityManager

  // Constructor parameter injection
  constructor(
    @InjectRepository(User)
    private repository: Repository<User>,
  ) {}

  saveByRepository(user: User): Promise<User> {
    return this.repository.save(user)
  }

  saveByManager(user: User): Promise<User> {
    return this.entityManager.save(user)
  }

  async saveManyByTransaction(users: User[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      for (const user of users) {
        await queryRunner.manager.save(user)
      }
      await queryRunner.commitTransaction()
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  findAll(): Promise<User[]> {
    return this.repository.find()
  }
}
```

### 4. Resolve Service and Execute

Retrieve your service directly from the container:

```typescript
// app.ts
import { container } from 'inversify-typeorm'
import { UserService } from './user.service.js'

const service = container.get<UserService>(UserService.name)

const user = new User()
user.id = 1
user.name = 'Alice'

await service.saveByRepository(user)
const users = await service.findAll()
console.log({ users })
```

### 5. Closing the Connection

When shutting down your application:

```typescript
await TypeOrmManager.destroyDataSource()
```

---

## Multiple DataSources

You can configure and isolate multiple database connections by specifying a unique `name`:

```typescript
// 1. Initialize secondary connection
await TypeOrmManager.importRoot({
  name: 'analyticsConn',
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'test',
  password: 'test',
  database: 'analytics',
  entities: [Metric],
})

// 2. Bind repositories to that named connection
await TypeOrmManager.importRepository([Metric], 'analyticsConn')

// 3. Inject by connection name
@Service()
export class MetricService {
  constructor(
    @InjectRepository(Metric, 'analyticsConn')
    private metricRepo: Repository<Metric>,

    @InjectDataSource('analyticsConn')
    private analyticsSource: DataSource,
  ) {}
}
```

---

## Examples

Practical working examples are located in the [`examples/`](./examples) directory:
- [`default-conn`](./examples/default-conn): Single database connection with transactions and repository injection.
- [`named-conn`](./examples/named-conn): Multiple named database connections.
- [`relations`](./examples/relations): One-to-many and many-to-one entity relations.

---

## License

MIT
