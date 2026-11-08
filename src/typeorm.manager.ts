import { Container } from 'inversify'
import type { DataSource, EntityManager, EntityTarget, ObjectLiteral } from 'typeorm'
import type {
  CustomDataSource,
  CustomRepositoryConstructor,
  EntityOrCustomRepository,
  TypeOrmOptions,
} from './interfaces.js'
import { DEFAULT_DATA_SOURCE_NAME } from './typeorm.constants.js'
import {
  createDataSource,
  getDataSourceToken,
  getEntityManagerToken,
  getRepositoryToken,
  isCustomRepository,
  isCustomRepositoryMapping,
  resolveRepository,
} from './typeorm.utils.js'

export const container = new Container()

/**
 * Idempotently binds or rebinds a constant value to a target Inversify container.
 */
function bindOrRebind<T>(targetContainer: Container, token: unknown, value: T): void {
  // biome-ignore lint/suspicious/noExplicitAny: Inversify ServiceIdentifier accepts any token
  const serviceIdentifier = token as any
  if (targetContainer.isBound(serviceIdentifier)) {
    targetContainer.rebind<T>(serviceIdentifier).toConstantValue(value)
  } else {
    targetContainer.bind<T>(serviceIdentifier).toConstantValue(value)
  }
}

export class TypeOrmManager {
  private static readonly trackedDataSources = new Set<DataSource>()

  /**
   * Binds a TypeORM DataSource and its corresponding EntityManager to a DI container.
   *
   * This function initializes a DataSource using the specified options and binds
   * it along with its EntityManager to the DI container as constants.
   *
   * @param options - Configuration options for creating the DataSource.
   * @param shouldInitialize - Determines whether the DataSource should be initialized immediately.
   * @param targetContainer - Optional target container to bind into. Defaults to the shared singleton container.
   * @returns A Promise resolving to the created DataSource instance.
   */
  static async importRoot(
    options: TypeOrmOptions,
    shouldInitialize = true,
    targetContainer: Container = container,
  ): Promise<DataSource> {
    const dataSource = await createDataSource(options, shouldInitialize)
    TypeOrmManager.trackedDataSources.add(dataSource)

    const dataSourceToken = getDataSourceToken(options)
    bindOrRebind<DataSource>(targetContainer, dataSourceToken, dataSource)

    const entityManagerToken = getEntityManagerToken(options)
    bindOrRebind<EntityManager>(targetContainer, entityManagerToken, dataSource.manager)

    return dataSource
  }

  /**
   * Binds repositories for specified entities to a DI container.
   *
   * For each entity or custom repository in the provided array, this function resolves
   * the appropriate repository from the DataSource and binds it to the DI container
   * as a constant value.
   *
   * @param entities - An array of entities or custom repository classes whose repositories need to be bound.
   * @param dataSource - The DataSource from which the repositories should be resolved. Defaults to the default data source name.
   * @param targetContainer - Optional target container to bind into. Defaults to the shared singleton container.
   * @returns A Promise that resolves once all repositories are bound.
   */
  static async importRepository<Entity extends ObjectLiteral>(
    entities: EntityOrCustomRepository<Entity>[],
    dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
    targetContainer: Container = container,
  ): Promise<void> {
    const conn = TypeOrmManager.getDataSource(dataSource, targetContainer)

    for (const item of entities) {
      let entityTarget: EntityTarget<Entity> | undefined
      let customRepoConstructor: CustomRepositoryConstructor<Entity> | undefined

      if (isCustomRepositoryMapping<Entity>(item)) {
        entityTarget = item.entity
        customRepoConstructor = item.repository
      } else if (isCustomRepository<Entity>(item)) {
        customRepoConstructor = item
        const staticTarget =
          (item as unknown as { entity?: EntityTarget<Entity>; target?: EntityTarget<Entity> }).entity ||
          (item as unknown as { entity?: EntityTarget<Entity>; target?: EntityTarget<Entity> }).target
        if (staticTarget) {
          entityTarget = staticTarget
        }
      } else {
        entityTarget = item as EntityTarget<Entity>
      }

      const entityMetadata = entityTarget
        ? conn.entityMetadatas.find((meta) => meta.target === entityTarget)
        : undefined

      const repository = resolveRepository(conn, item, entityMetadata, entityTarget, customRepoConstructor)
      const repositoryToken = getRepositoryToken(item, dataSource)
      bindOrRebind(targetContainer, repositoryToken, repository)
    }
  }

  /**
   * Destroys an initialized DataSource, releasing all its resources.
   *
   * This function attempts to destroy a DataSource if it is initialized,
   * thereby closing any connections and releasing resources tied to it.
   *
   * @param dataSource - The DataSource to be destroyed. Defaults to the default data source name.
   * @param targetContainer - Optional target container from which to retrieve the DataSource. Defaults to the shared singleton.
   * @returns A Promise that resolves when the DataSource is successfully destroyed.
   */
  static async destroyDataSource(
    dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
    targetContainer: Container = container,
  ): Promise<void> {
    try {
      const conn = TypeOrmManager.getDataSource(dataSource, targetContainer)
      TypeOrmManager.trackedDataSources.delete(conn)
      if (conn?.isInitialized) {
        await conn.destroy()
      }
    } catch {
      // If data source was not bound in target container, nothing to destroy
    }
  }

  /**
   * Destroys all active DataSources tracked across the lifetime of the application.
   * Essential for graceful server shutdown hooks and integration test teardown.
   *
   * @returns A Promise resolving when all tracked DataSources have been destroyed.
   */
  static async destroyAll(): Promise<void> {
    for (const conn of TypeOrmManager.trackedDataSources) {
      if (conn.isInitialized) {
        await conn.destroy()
      }
    }
    TypeOrmManager.trackedDataSources.clear()
  }

  /**
   * Retrieves a DataSource instance from the DI container.
   *
   * This function fetches a DataSource that has been previously bound
   * to the DI container using its corresponding token.
   *
   * @param dataSource - The identifier for the DataSource to be retrieved. Defaults to the default data source name.
   * @param targetContainer - Optional target container to query. Defaults to the shared singleton container.
   * @returns The DataSource instance corresponding to the specified identifier.
   */
  static getDataSource(
    dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
    targetContainer: Container = container,
  ): DataSource {
    const dataSourceToken = getDataSourceToken(dataSource)
    return targetContainer.get<DataSource>(dataSourceToken)
  }
}
