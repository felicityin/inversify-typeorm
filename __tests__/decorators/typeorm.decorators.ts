import { describe, expect, it } from '@jest/globals'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { InjectDataSource, InjectEntityManager, InjectRepository, Service } from '../../src/decorators/index.js'
import { container, TypeOrmManager } from '../../src/index.js'

class User {}

class CustomUserRepo extends Repository<User> {
  static entity = User
}

@Service()
class UserService {
  @InjectDataSource()
  public dataSource!: DataSource

  @InjectEntityManager()
  public entityManager!: EntityManager

  constructor(
    @InjectRepository(User)
    public repository: Repository<User>,
  ) {}
}

@Service()
class CustomRepoConsumer {
  constructor(
    @InjectRepository(CustomUserRepo)
    public customRepo: CustomUserRepo,
  ) {}
}

@Service()
class MappingConsumer {
  constructor(
    @InjectRepository({ entity: User, repository: CustomUserRepo })
    public customRepo: CustomUserRepo,
  ) {}
}

describe('typeorm decorators (Inversify 8 public seam)', () => {
  it('should resolve decorated properties and constructor parameters through the container', async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        entities: [User],
      },
      false,
    )
    await TypeOrmManager.importRepository([User, CustomUserRepo, { entity: User, repository: CustomUserRepo }])

    const service = container.get<UserService>(UserService.name)
    expect(service).toBeInstanceOf(UserService)
    expect(service.dataSource).toBeInstanceOf(DataSource)
    expect(service.entityManager).toBeInstanceOf(EntityManager)
    expect(service.repository).toBeInstanceOf(Repository)

    const customConsumer = container.get<CustomRepoConsumer>(CustomRepoConsumer.name)
    expect(customConsumer).toBeInstanceOf(CustomRepoConsumer)
    expect(customConsumer.customRepo).toBeInstanceOf(CustomUserRepo)

    const mappingConsumer = container.get<MappingConsumer>(MappingConsumer.name)
    expect(mappingConsumer).toBeInstanceOf(MappingConsumer)
    expect(mappingConsumer.customRepo).toBeInstanceOf(CustomUserRepo)
  })
})
