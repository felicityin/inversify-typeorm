import { Container } from 'inversify'
import type { DataSource, EntityManager, EntityMetadata, EntityTarget, ObjectLiteral } from 'typeorm'
import type { CustomDataSource, TypeOrmOptions, TypeOrmRepository } from './interfaces.js'
import { createDataSource, getDataSourceToken, getEntityManagerToken, getRepositoryToken } from './typeorm.utils.js'
import { DEFAULT_DATA_SOURCE_NAME } from './typeorm.constants.js'

export const container = new Container()

export class TypeOrmManager {
  /**
   * Bind DataSource and EntityManager to the container.
   * @param options
   */
  static async importRoot(options: TypeOrmOptions, shouldInitialize = true): Promise<void> {
    const dataSource = await createDataSource(options, shouldInitialize)

    const dataSourceToken = getDataSourceToken(options)
    container.bind<DataSource>(dataSourceToken).toConstantValue(dataSource)

    const entityManagerToken = getEntityManagerToken(options)
    container.bind<EntityManager>(entityManagerToken).toConstantValue(dataSource.manager)
  }

  /**
   * Binds the repository for each entity in `entities` to the container.
   * @param entities
   * @param dataSource
   */
  static async importRepository<Entity extends ObjectLiteral>(
    entities: EntityTarget<Entity>[],
    dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
  ): Promise<void> {
    const conn = this.getDataSource(dataSource)

    entities.forEach((entity: EntityTarget<Entity>) => {
      const entityMetadata = conn.entityMetadatas.find((meta: EntityMetadata) => meta.target === entity)
      const isTreeEntity = typeof entityMetadata?.treeType !== 'undefined'
      const repository = isTreeEntity
        ? conn.getTreeRepository(entity)
        : conn.options.type === 'mongodb'
        ? conn.getMongoRepository(entity)
        : conn.getRepository(entity)

      const repositoryToken = getRepositoryToken(entity, dataSource)
      container.bind<TypeOrmRepository<Entity>>(repositoryToken).toConstantValue(repository)
    })
  }

  static async destroyDataSource(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): Promise<void> {
    const conn = this.getDataSource(dataSource)
    if (conn && conn.isInitialized) await conn.destroy()
  }

  static getDataSource(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): DataSource {
    const dataSourceToken = getDataSourceToken(dataSource)
    return container.get<DataSource>(dataSourceToken)
  }
}
