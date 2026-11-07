import { describe, expect, it } from '@jest/globals'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { InjectDataSource, InjectEntityManager, InjectRepository, Service } from '../../src/decorators/index.js'
import { container, TypeOrmManager } from '../../src/index.js'

class User {}

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

describe('typeorm decorators (Inversify 8 public seam)', () => {
  it('should resolve decorated properties and constructor parameters through the container', async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        entities: [User],
      },
      false,
    )
    await TypeOrmManager.importRepository([User])

    const service = container.get<UserService>(UserService.name)
    expect(service).toBeInstanceOf(UserService)
    expect(service.dataSource).toBeInstanceOf(DataSource)
    expect(service.entityManager).toBeInstanceOf(EntityManager)
    expect(service.repository).toBeInstanceOf(Repository)
  })
})
