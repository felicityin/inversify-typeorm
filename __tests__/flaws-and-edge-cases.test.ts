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

  it('Feature: resolveRepository fallback to single-arg constructor for custom repositories', async () => {
    class SingleArgRepo extends Repository<Account> {
      constructor(manager: EntityManager, ...rest: unknown[]) {
        if (rest.length > 0 && rest[0] !== undefined) {
          throw new Error('Requires single-arg constructor fallback')
        }
        super(Account, manager)
      }
    }

    const ds = await createDataSource({ type: 'mysql', entities: [Account] }, false)
    const root = await import('../src/index.js')
    const repo = root.resolveRepository(ds, SingleArgRepo)
    expect(repo).toBeInstanceOf(SingleArgRepo)
  })

  it('Feature: destroyDataSource and destroyAll handle initialized DataSources and non-bound gracefully', async () => {
    const ds = await createDataSource({ type: 'mysql', name: 'initializedDestroyTest', entities: [Account] }, false)
    let destroyed = false
    Object.defineProperty(ds, 'isInitialized', { value: true, configurable: true })
    ds.destroy = async () => {
      destroyed = true
    }

    await TypeOrmManager.importRoot({ type: 'mysql', name: 'initializedDestroyTest', entities: [Account] }, false)
    // Overwrite with mock initialized instance in manager
    const root = await import('../src/index.js')
    const token = root.getDataSourceToken('initializedDestroyTest')
    container.rebind(token).toConstantValue(ds)

    await TypeOrmManager.destroyDataSource('initializedDestroyTest')
    expect(destroyed).toBe(true)

    // Destroy on non-bound datasource does not throw
    await expect(TypeOrmManager.destroyDataSource('completelyNonExistentDataSource')).resolves.not.toThrow()
  })
})
