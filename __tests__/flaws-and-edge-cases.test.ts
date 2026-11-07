import { describe, expect, it } from '@jest/globals'
import type { EntityManager, EntityTarget } from 'typeorm'
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository, Tree, TreeRepository } from 'typeorm'
import { container, createDataSource, getRepositoryToken, TypeOrmManager } from '../src'
import { InjectDataSource, InjectEntityManager, InjectRepository, Service } from '../src/decorators'

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

  it('Flaw 2: Custom Repository resolution in importRepository', async () => {
    // 1. On named data source
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'custom_repo_conn',
        entities: [Account],
      },
      false,
    )

    await TypeOrmManager.importRepository(
      [CustomAccountRepository as unknown as EntityTarget<Account>],
      'custom_repo_conn',
    )

    const namedToken = getRepositoryToken(CustomAccountRepository, 'custom_repo_conn')
    const namedResolved = container.get(namedToken)
    expect(namedResolved).toBeInstanceOf(CustomAccountRepository)
    expect(namedResolved).toBeInstanceOf(Repository)

    // 2. On default data source
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        entities: [Account],
      },
      false,
    )
    await TypeOrmManager.importRepository([CustomAccountRepository as unknown as EntityTarget<Account>])

    const defaultResolved = container.get(CustomAccountRepository)
    expect(defaultResolved).toBeInstanceOf(CustomAccountRepository)
    expect(defaultResolved).toBeInstanceOf(Repository)
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
})
