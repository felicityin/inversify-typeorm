import { describe, expect, it } from '@jest/globals'
import type { EntityManager } from 'typeorm'
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository, Tree, TreeRepository } from 'typeorm'
import { InjectDataSource, InjectEntityManager, InjectRepository, Service } from '../src/decorators/index.js'
import { container, createDataSource, getRepositoryToken, TypeOrmManager } from '../src/index.js'

@Entity()
class TreeCategory {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  name!: string
}

@Entity()
class Account {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  balance!: number
}

class CustomAccountRepository extends Repository<Account> {
  findRichAccounts() {
    return this.find()
  }
}

class StaticCustomAccountRepo extends Repository<Account> {
  static entity = Account

  findRichAccounts() {
    return this.find()
  }
}

@Service()
class DefaultAccountService {
  @InjectDataSource()
  public dataSource!: DataSource

  @InjectEntityManager()
  public entityManager!: EntityManager

  constructor(
    @InjectRepository(Account)
    public accountRepo: Repository<Account>,
  ) {}
}

@Service()
class NamedAccountService {
  constructor(
    @InjectRepository(Account, 'named_conn')
    public accountRepo: Repository<Account>,
  ) {}
}

describe('Flaws and Edge Cases (TDD Verification Seam)', () => {
  it('Flaw 1: TreeRepository resolution fails when DataSource is uninitialized or entityMetadata is missing', async () => {
    Tree('closure-table')(TreeCategory)

    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'tree_conn',
        entities: [TreeCategory],
      },
      false,
    )

    await TypeOrmManager.importRepository([TreeCategory], 'tree_conn')

    const repo = container.get('tree_conn_TreeCategoryRepository')
    expect(repo).toBeInstanceOf(TreeRepository)
  })

  it('Flaw 2: Custom Repository resolution in importRepository with explicit mapping and operations', async () => {
    // 1. On named data source with explicit entity mapping
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'custom_repo_conn',
        entities: [Account],
      },
      false,
    )

    await TypeOrmManager.importRepository(
      [{ entity: Account, repository: CustomAccountRepository }],
      'custom_repo_conn',
    )

    const namedToken = getRepositoryToken(CustomAccountRepository, 'custom_repo_conn')
    const namedResolved = container.get(namedToken) as unknown as CustomAccountRepository
    expect(namedResolved).toBeInstanceOf(CustomAccountRepository)
    expect(namedResolved).toBeInstanceOf(Repository)
    expect(namedResolved.target).toBe(Account)

    // 2. On default data source with static entity on class
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        entities: [Account],
      },
      false,
    )
    await TypeOrmManager.importRepository([StaticCustomAccountRepo])

    const defaultResolved = container.get(StaticCustomAccountRepo) as unknown as StaticCustomAccountRepo
    expect(defaultResolved).toBeInstanceOf(StaticCustomAccountRepo)
    expect(defaultResolved).toBeInstanceOf(Repository)
    expect(defaultResolved.target).toBe(Account)

    // 3. Verify actual metadata and repository operation (e.g. find()) on custom repository
    const mockMetadata = {
      target: Account,
      tableName: 'account',
    } as unknown as import('typeorm').EntityMetadata

    const mockDataSource = await createDataSource({ type: 'mysql', entities: [Account] }, false)
    Object.defineProperty(mockDataSource, 'isInitialized', { value: true, configurable: true })
    Object.defineProperty(mockDataSource, 'entityMetadatas', { value: [mockMetadata], configurable: true })
    mockDataSource.getMetadata = (target) => {
      if (target === Account) return mockMetadata
      throw new Error(`No metadata for "${String(target)}" was found.`)
    }
    // Mock manager.find to verify that this.target is passed to EntityManager
    mockDataSource.manager.find = (async (entity: unknown) => {
      if (entity === Account) {
        return [{ id: 1, balance: 5000 }]
      }
      return []
    }) as typeof mockDataSource.manager.find

    await TypeOrmManager.importRoot({ type: 'mysql', entities: [Account] }, false)
    container.rebind(DataSource).toConstantValue(mockDataSource)
    await TypeOrmManager.importRepository([{ entity: Account, repository: CustomAccountRepository }])

    const resolvedRepo = container.get(CustomAccountRepository) as unknown as CustomAccountRepository
    expect(resolvedRepo).toBeInstanceOf(CustomAccountRepository)
    expect(resolvedRepo.target).toBe(Account)
    expect(resolvedRepo.metadata.tableName).toBe('account')

    // Execute actual custom repository operation
    const accounts = await resolvedRepo.findRichAccounts()
    expect(accounts).toEqual([{ id: 1, balance: 5000 }])
  })

  it('Flaw 3: Constructor parameter injection with @InjectRepository on default data source', async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        entities: [Account],
      },
      false,
    )
    await TypeOrmManager.importRepository([Account])

    const service = container.get<DefaultAccountService>(DefaultAccountService.name)
    expect(service).toBeInstanceOf(DefaultAccountService)
    expect(service.accountRepo).toBeInstanceOf(Repository)
    expect(service.dataSource).toBeInstanceOf(DataSource)
  })

  it('Flaw 4: Constructor parameter injection with @InjectRepository on named data source', async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'named_conn',
        entities: [Account],
      },
      false,
    )
    await TypeOrmManager.importRepository([Account], 'named_conn')

    const service = container.get<NamedAccountService>(NamedAccountService.name)
    expect(service).toBeInstanceOf(NamedAccountService)
    expect(service.accountRepo).toBeInstanceOf(Repository)
  })

  it('Flaw 5: Root index exports missing decorators and constants', async () => {
    // Dynamic import of root index to test what is publicly exposed by the library entry point
    const root = await import('../src/index.js')

    expect(root).toHaveProperty('InjectRepository')
    expect(root).toHaveProperty('InjectDataSource')
    expect(root).toHaveProperty('InjectEntityManager')
    expect(root).toHaveProperty('Service')
    expect(root).toHaveProperty('DEFAULT_DATA_SOURCE_NAME')
  })

  it('Flaw 6: Retry connection attempts on database connection failure', async () => {
    // We verify createDataSource retry logic behavior
    const options = {
      type: 'mysql' as const,
      database: 'test',
      retryAttempts: 3,
      retryInterval: 20,
    }

    // Testing createDataSource with a failing connection
    await expect(
      createDataSource(
        {
          ...options,
          host: '127.0.0.1',
          port: 65534, // invalid closed port
          connectTimeout: 50,
        },
        true,
      ),
    ).rejects.toThrow()
  })

  it('Feature: Container pluggability & scope isolation', async () => {
    const { Container } = await import('inversify')
    const isolatedContainer = new Container()

    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'isolatedScope',
        entities: [Account],
      },
      false,
      isolatedContainer,
    )
    await TypeOrmManager.importRepository([Account], 'isolatedScope', isolatedContainer)

    expect(TypeOrmManager.getDataSource('isolatedScope', isolatedContainer)).toBeInstanceOf(DataSource)
    expect(isolatedContainer.get('isolatedScope_AccountRepository')).toBeInstanceOf(Repository)

    // Verify it is not bound in global container
    expect(() => container.get('isolatedScope_AccountRepository')).toThrow()
  })

  it('Feature: destroyAll cleanly closes all tracked DataSources', async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'trackedConn1',
        entities: [Account],
      },
      false,
    )
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'trackedConn2',
        entities: [Account],
      },
      false,
    )

    await expect(TypeOrmManager.destroyAll()).resolves.not.toThrow()
  })

  it('Teardown resilience: destroyAll continues disposing remaining connections on error and aggregates failures', async () => {
    const conn1 = await TypeOrmManager.importRoot({ type: 'mysql', name: 'resilientConn1', entities: [Account] }, false)
    const conn2 = await TypeOrmManager.importRoot({ type: 'mysql', name: 'resilientConn2', entities: [Account] }, false)
    const conn3 = await TypeOrmManager.importRoot({ type: 'mysql', name: 'resilientConn3', entities: [Account] }, false)

    let conn1Destroyed = false
    Object.defineProperty(conn1, 'isInitialized', { value: true, configurable: true })
    conn1.destroy = async () => {
      conn1Destroyed = true
      throw new Error('conn1 destruction failed')
    }

    let conn2Destroyed = false
    Object.defineProperty(conn2, 'isInitialized', { value: true, configurable: true })
    conn2.destroy = async () => {
      conn2Destroyed = true
    }

    let conn3Destroyed = false
    Object.defineProperty(conn3, 'isInitialized', { value: true, configurable: true })
    conn3.destroy = async () => {
      conn3Destroyed = true
      throw new Error('conn3 destruction failed')
    }

    // Must attempt teardown on all connections, clear the registry, and throw an AggregateError
    let thrownError: unknown
    try {
      await TypeOrmManager.destroyAll()
    } catch (err) {
      thrownError = err
    }

    expect(conn1Destroyed).toBe(true)
    expect(conn2Destroyed).toBe(true)
    expect(conn3Destroyed).toBe(true)
    expect(thrownError).toBeInstanceOf(AggregateError)
    const aggErr = thrownError as AggregateError
    expect(aggErr.errors).toHaveLength(2)
    expect((aggErr.errors[0] as Error).message).toBe('conn1 destruction failed')
    expect((aggErr.errors[1] as Error).message).toBe('conn3 destruction failed')

    // Subsequent destroyAll call should find trackedDataSources empty and resolve without error
    await expect(TypeOrmManager.destroyAll()).resolves.not.toThrow()

    // Single error case: re-throws the exact original error directly
    const singleConn = await TypeOrmManager.importRoot(
      { type: 'mysql', name: 'singleFailConn', entities: [Account] },
      false,
    )
    Object.defineProperty(singleConn, 'isInitialized', { value: true, configurable: true })
    singleConn.destroy = async () => {
      throw new Error('single teardown failure')
    }
    await expect(TypeOrmManager.destroyAll()).rejects.toThrow('single teardown failure')
  })

  it('Fix: createDataSource preserves name on dataSource.options', async () => {
    const ds = await createDataSource(
      {
        type: 'mysql',
        name: 'preservedName',
        entities: [Account],
      },
      false,
    )

    const root = await import('../src/index.js')
    expect((ds.options as import('../src/interfaces.js').TypeOrmOptions).name).toBe('preservedName')
    expect(root.getDataSourceToken(ds)).toBe('preservedNameDataSource')
    expect(root.getDataSourcePrefix(ds)).toBe('preservedName_')
  })

  it('Fix: handleRetry executes at least once when retryAttempts is 0', async () => {
    const root = await import('../src/typeorm.utils.js')
    let called = 0
    const result = await root.handleRetry(async () => {
      called++
      return 'success'
    }, 0)

    expect(result).toBe('success')
    expect(called).toBe(1)

    // Fails on 0 retry attempts
    await expect(
      root.handleRetry(async () => {
        throw new Error('immediate failure')
      }, 0),
    ).rejects.toThrow('immediate failure')
  })

  it('Issue 2: destroyDataSource propagates errors thrown by conn.destroy() and ignores only unbound data sources', async () => {
    const ds = await createDataSource({ type: 'mysql', name: 'failingDestroyConn', entities: [Account] }, false)
    Object.defineProperty(ds, 'isInitialized', { value: true, configurable: true })
    ds.destroy = async () => {
      throw new Error('Database shutdown failed')
    }

    await TypeOrmManager.importRoot({ type: 'mysql', name: 'failingDestroyConn', entities: [Account] }, false)
    const root = await import('../src/index.js')
    const token = root.getDataSourceToken('failingDestroyConn')
    container.rebind(token).toConstantValue(ds)

    // Errors raised by destroy() must propagate
    await expect(TypeOrmManager.destroyDataSource('failingDestroyConn')).rejects.toThrow('Database shutdown failed')

    // Unbound data source is safely ignored
    await expect(TypeOrmManager.destroyDataSource('completelyUnboundDataSource')).resolves.not.toThrow()
  })

  it('Issue 3: importRepository throws descriptive error when custom repository lacks entity target', async () => {
    class BareCustomRepo extends Repository<Account> {}

    await TypeOrmManager.importRoot({ type: 'mysql', name: 'bare_repo_conn', entities: [Account] }, false)

    await expect(TypeOrmManager.importRepository([BareCustomRepo], 'bare_repo_conn')).rejects.toThrow(
      'Cannot resolve entity target for custom repository "BareCustomRepo". Please provide an explicit mapping ({ entity, repository: BareCustomRepo }) or define "static entity = <Entity>" on the repository class.',
    )
  })

  it('Issue 4 & 5: resolveRepository passes only (target, conn.manager), does NOT call createQueryRunner(), and propagates constructor errors', async () => {
    let capturedArgs: unknown[] = []
    class CustomRepoWithArgsCapture extends Repository<Account> {
      constructor(...args: unknown[]) {
        capturedArgs = args
        super(args[0] as typeof Account, args[1] as EntityManager)
      }
    }

    const ds = await createDataSource({ type: 'mysql', entities: [Account] }, false)
    let createQueryRunnerCalled = false
    ds.createQueryRunner = () => {
      createQueryRunnerCalled = true
      return {} as never
    }

    const root = await import('../src/index.js')
    const repo = root.resolveRepository(ds, CustomRepoWithArgsCapture, undefined, Account, CustomRepoWithArgsCapture)

    expect(repo).toBeInstanceOf(CustomRepoWithArgsCapture)
    expect(createQueryRunnerCalled).toBe(false)
    expect(capturedArgs).toHaveLength(2)
    expect(capturedArgs[0]).toBe(Account)
    expect(capturedArgs[1]).toBe(ds.manager)

    // Verify constructor error propagation (no silent fallback swallowing genuine bugs)
    class BuggyCustomRepo extends Repository<Account> {
      constructor() {
        super(Account, {} as never)
        throw new Error('Real constructor bug')
      }
    }

    expect(() => {
      root.resolveRepository(ds, BuggyCustomRepo, undefined, Account, BuggyCustomRepo)
    }).toThrow('Real constructor bug')
  })
})
