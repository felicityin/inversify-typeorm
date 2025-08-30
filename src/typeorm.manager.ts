import { Container } from 'inversify'
import type { DataSource, EntityManager, EntityTarget, ObjectLiteral } from 'typeorm'
import type { CustomDataSource, TypeOrmOptions, TypeOrmRepository } from './interfaces.js'
import {
  createDataSource,
  getDataSourceToken,
  getEntityManagerToken,
  getRepositoryToken,
  resolveRepository,
} from './typeorm.utils.js'
import { DEFAULT_DATA_SOURCE_NAME } from './typeorm.constants.js'

export const container = new Container()

export class TypeOrmManager {
  /**
   * Binds a TypeORM DataSource and its corresponding EntityManager to a DI container.
   *
   * This function initializes a DataSource using the specified options and binds
   * it along with its EntityManager to the DI container as constants.
   *
   * @param options - Configuration options for creating the DataSource.
   * @param shouldInitialize - Determines whether the DataSource should be initialized immediately.
   * @returns A Promise that resolves when DataSource and EntityManager are bound.
   */
  static async importRoot(options: TypeOrmOptions, shouldInitialize = true): Promise<void> {
    const dataSource = await createDataSource(options, shouldInitialize)

    const dataSourceToken = getDataSourceToken(options)
    container.bind<DataSource>(dataSourceToken).toConstantValue(dataSource)

    const entityManagerToken = getEntityManagerToken(options)
    container.bind<EntityManager>(entityManagerToken).toConstantValue(dataSource.manager)
  }

  /**
   * Binds repositories for specified entities to a DI container.
   *
   * For each entity in the provided entities array, this function resolves
   * the appropriate repository from the DataSource and binds it to the DI container
   * as a constant value.
   *
   * @param entities - An array of entities whose repositories need to be bound.
   * @param dataSource - The DataSource from which the repositories should be resolved. Defaults to the default data source name.
   * @returns A Promise that resolves once all repositories are bound.
   */
  static async importRepository<Entity extends ObjectLiteral>(
    entities: EntityTarget<Entity>[],
    dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
  ): Promise<void> {
    const conn = this.getDataSource(dataSource)

    entities.forEach((entity) => {
      const entityMetadata = conn.entityMetadatas.find((meta) => meta.target === entity)
      const repository = resolveRepository(conn, entity, entityMetadata)
      const repositoryToken = getRepositoryToken(entity, dataSource)
      container.bind<TypeOrmRepository<Entity>>(repositoryToken).toConstantValue(repository)
    })
  }

  /**
   * Destroys an initialized DataSource, releasing all its resources.
   *
   * This function attempts to destroy a DataSource if it is initialized,
   * thereby closing any connections and releasing resources tied to it.
   *
   * @param dataSource - The DataSource to be destroyed. Defaults to the default data source name.
   * @returns A Promise that resolves when the DataSource is successfully destroyed.
   */
  static async destroyDataSource(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): Promise<void> {
    const conn = this.getDataSource(dataSource)
    if (conn && conn.isInitialized) await conn.destroy()
  }

  /**
   * Retrieves a DataSource instance from the DI container.
   *
   * This function fetches a DataSource that has been previously bound
   * to the DI container using its corresponding token.
   *
   * @param dataSource - The identifier for the DataSource to be retrieved. Defaults to the default data source name.
   * @returns The DataSource instance corresponding to the specified identifier.
   */
  static getDataSource(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): DataSource {
    const dataSourceToken = getDataSourceToken(dataSource)
    return container.get<DataSource>(dataSourceToken)
  }
}
