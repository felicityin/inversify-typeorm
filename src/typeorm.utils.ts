import type { DataSourceOptions, EntityMetadata, EntityTarget, ObjectLiteral } from 'typeorm'
import { DataSource, EntityManager, EntitySchema, getMetadataArgsStorage, Repository } from 'typeorm'
import type {
  Constructor,
  CustomDataSource,
  CustomRepositoryConstructor,
  EntityOrCustomRepository,
  RepositoryToken,
  TypeOrmOptions,
  TypeOrmRepository,
} from './interfaces.js'
import { DEFAULT_DATA_SOURCE_NAME } from './typeorm.constants.js'

/**
 * Normalizes and extracts the connection name from any valid CustomDataSource representation.
 *
 * @param dataSource - CustomDataSource representation.
 * @returns {string | undefined} The extracted data source name.
 */
export function extractDataSourceName(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): string | undefined {
  if (typeof dataSource === 'string') return dataSource
  const options = dataSource instanceof DataSource ? dataSource.options : dataSource
  return (options as TypeOrmOptions)?.name
}

/**
 * Retrieves the repository token for a given entity, incorporating the data source prefix.
 * Determines whether the entity is a custom repository or an EntitySchema
 * and generates a token identifier accordingly.
 *
 * @param entity - The entity target, schema, or custom repository class.
 * @param dataSource - Optional, either a custom data source or the default data source name.
 * @returns {RepositoryToken<Entity>} The constructed repository token, potentially prefixed.
 */
export function getRepositoryToken<Entity extends ObjectLiteral>(
  entity: EntityOrCustomRepository<Entity>,
  dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
): RepositoryToken<Entity> {
  const dataSourcePrefix = getDataSourcePrefix(dataSource)

  if (isCustomRepository<Entity>(entity)) {
    return dataSourcePrefix ? `${dataSourcePrefix}${getCustomRepositoryToken(entity)}` : entity
  }

  if (entity instanceof EntitySchema) {
    const name = entity.options.target ? (entity.options.target as Constructor).name : entity.options.name
    return `${dataSourcePrefix}${name}Repository`
  }
  return `${dataSourcePrefix}${(entity as Constructor).name}Repository`
}

/**
 * Retrieves the token for a custom repository.
 *
 * @param repository - The custom repository function to generate a token for.
 * @returns {string} The name of the repository function.
 */
export function getCustomRepositoryToken<T extends ObjectLiteral>(repository: CustomRepositoryConstructor<T>): string {
  return repository.name
}

/**
 * Determines if the given entity is a custom repository constructor.
 *
 * @param entity - The entity to check.
 * @returns True if the entity is a function and its prototype is an instance of Repository, otherwise false.
 */
export function isCustomRepository<T extends ObjectLiteral>(entity: unknown): entity is CustomRepositoryConstructor<T> {
  return typeof entity === 'function' && (entity as Constructor).prototype instanceof Repository
}

/**
 * Resolves the appropriate TypeORM repository for the given entity and connection.
 * Determines if the entity is a tree entity, uses MongoDB, or defaults to a standard repository.
 *
 * @param conn - The DataSource connection.
 * @param entity - The target entity or custom repository for which the repository is needed.
 * @param entityMetadata - Optional metadata of the entity, used to check if it is a tree entity.
 * @returns The determined repository for the given entity.
 */
export function resolveRepository<Entity extends ObjectLiteral>(
  conn: DataSource,
  entity: EntityOrCustomRepository<Entity>,
  entityMetadata?: EntityMetadata,
): TypeOrmRepository<Entity> {
  if (isCustomRepository<Entity>(entity)) {
    const customConstructor = entity as Constructor<Repository<Entity>>
    const target = entityMetadata?.target as Constructor | undefined
    try {
      return new customConstructor(target, conn.manager, conn.createQueryRunner()) as TypeOrmRepository<Entity>
    } catch {
      return new customConstructor(conn.manager) as TypeOrmRepository<Entity>
    }
  }

  const isTree =
    typeof entityMetadata?.treeType !== 'undefined' ||
    getMetadataArgsStorage().trees.some((tree) => tree.target === entity)

  if (isTree) {
    return conn.getTreeRepository(entity as EntityTarget<Entity>)
  }
  if (conn.options.type === 'mongodb') {
    return conn.getMongoRepository(entity as EntityTarget<Entity>)
  }
  return conn.getRepository(entity as EntityTarget<Entity>)
}

/**
 * Retrieves the token for a data source, including handling custom and default sources.
 *
 * @param dataSource - Optional, can be a custom data source or the default data source name.
 * @returns {string | typeof DataSource} The generated DataSource token.
 */
export function getDataSourceToken(
  dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
): string | typeof DataSource {
  const name = extractDataSourceName(dataSource)
  return !name || name === DEFAULT_DATA_SOURCE_NAME ? DataSource : `${name}DataSource`
}

/**
 * Retrieves the prefix for a data source, helpful for token generation.
 *
 * @param dataSource - Optional data source, either a custom one or the default.
 * @returns {string} The prefix generated for the data source.
 */
export function getDataSourcePrefix(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): string {
  const name = extractDataSourceName(dataSource)
  return name && name !== DEFAULT_DATA_SOURCE_NAME ? `${name}_` : ''
}

/**
 * Retrieves the token for an EntityManager, incorporating data source details.
 *
 * @param dataSource - Optional, a custom data source or the default name.
 * @returns {string | typeof EntityManager} The constructed EntityManager token.
 */
export function getEntityManagerToken(
  dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
): string | typeof EntityManager {
  const name = extractDataSourceName(dataSource)
  return !name || name === DEFAULT_DATA_SOURCE_NAME ? EntityManager : `${name}EntityManager`
}

/**
 * Asynchronously creates a DataSource instance using specified options.
 * Supports optional initialization and retry logic for connection attempts.
 * Preserves the connection name on `dataSource.options.name`.
 *
 * @param options - Configuration options for TypeORM data source creation.
 * @param shouldInitialize - Boolean indicating whether to initialize the data source immediately.
 * @returns {Promise<DataSource>} A promise resolving to the newly created DataSource instance.
 */
export async function createDataSource(options: TypeOrmOptions, shouldInitialize = true): Promise<DataSource> {
  const { name, retryAttempts = 10, retryInterval = 3000, ...dataSourceOptions } = options

  const dataSource = new DataSource(dataSourceOptions as DataSourceOptions)
  if (name) {
    ;(dataSource.options as TypeOrmOptions).name = name
  }

  if (shouldInitialize) {
    await handleRetry(() => dataSource.initialize(), retryAttempts, retryInterval)
  }
  return dataSource
}

/**
 * Provides custom retry logic for database connection attempts using native async/await.
 * Guarantees at least one execution attempt even if retryAttempts is 0.
 *
 * @param operation - Async operation to execute and retry upon failure.
 * @param retryAttempts - Number of retry attempts for connection.
 * @param retryInterval - Milliseconds between retry attempts.
 * @returns {Promise<T>} A promise resolving to the result of the operation.
 */
export async function handleRetry<T>(
  operation: () => Promise<T>,
  retryAttempts = 10,
  retryInterval = 3000,
): Promise<T> {
  let lastError: unknown
  const maxAttempts = Math.max(1, retryAttempts)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt + 1 < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval))
      }
    }
  }
  throw lastError
}
