import { defer, lastValueFrom } from 'rxjs'
import type { Observable } from 'rxjs'
import { retry } from 'rxjs/operators'
import { DataSource, EntityManager, EntitySchema, Repository } from 'typeorm'
import type { DataSourceOptions, EntityMetadata, EntityTarget, ObjectLiteral } from 'typeorm'
import type { Constructor, CustomDataSource, TypeOrmOptions, TypeOrmRepository } from './interfaces.js'
import { DEFAULT_DATA_SOURCE_NAME } from './typeorm.constants.js'

/**
 * Retrieves the repository token for a given entity, incorporating the data source prefix.
 * Determines whether the entity is a custom repository or an EntitySchema
 * and generates a token identifier accordingly.
 *
 * @param entity - The entity target or schema to generate a repository token for.
 * @param dataSource - Optional, either a custom data source or the default data source name.
 * @returns {Function | string} The constructed repository token, potentially prefixed.
 */
export function getRepositoryToken<Entity extends ObjectLiteral>(
  entity: EntityTarget<Entity>,
  dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
  // eslint-disable-next-line @typescript-eslint/ban-types
): Function | string {
  const dataSourcePrefix = getDataSourcePrefix(dataSource)
  if (entity instanceof Function && entity.prototype instanceof Repository) {
    if (!dataSourcePrefix) {
      return entity
    }
    return `${dataSourcePrefix}${getCustomRepositoryToken(entity)}`
  }

  if (entity instanceof EntitySchema) {
    const token = `${dataSourcePrefix}${
      entity.options.target ? entity.options.target.name : entity.options.name
    }Repository`
    return token
  }
  return `${dataSourcePrefix}${(entity as Constructor).name}Repository`
}

/**
 * Retrieves the token for a custom repository.
 *
 * @param repository - The custom repository function to generate a token for.
 * @returns {string} The name of the repository function.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function getCustomRepositoryToken(repository: Function): string {
  return repository.name
}

/**
 * Resolves the appropriate TypeORM repository for the given entity and connection.
 * Determines if the entity is a tree entity, uses MongoDB, or defaults to a standard repository.
 *
 * @param conn - The DataSource connection.
 * @param entity - The target entity for which the repository is needed.
 * @param entityMetadata - Optional metadata of the entity, used to check if it is a tree entity.
 * @returns The determined repository for the given entity.
 */
export function resolveRepository<Entity extends ObjectLiteral>(
  conn: DataSource,
  entity: EntityTarget<Entity>,
  entityMetadata?: EntityMetadata,
): TypeOrmRepository<Entity> {
  if (typeof entityMetadata?.treeType !== 'undefined') {
    return conn.getTreeRepository(entity)
  }
  if (conn.options.type === 'mongodb') {
    return conn.getMongoRepository(entity)
  }
  return conn.getRepository(entity)
}

/**
 * Construct DataSource Token from a given dataSource string.
 *
 * @deprecated This function is deprecated since TypeORM is eliminating the `name` option in data source settings.
 * @param name - Data source name as a string.
 * @returns {string} The constructed DataSource token in the form `${name}DataSource`.
 */
function tokenFromString(name: string): string {
  return `${name}DataSource`
}

/**
 * Construct DataSource Token from given data source options.
 *
 * @deprecated This function is deprecated as TypeORM is removing the `name` option.
 * @param options - The data source options containing `name`.
 * @returns {string | typeof DataSource} The resolved DataSource token or the DataSource class itself.
 */
function tokenFromOptions(options: DataSourceOptions): string | typeof DataSource {
  return !options.name || options.name === DEFAULT_DATA_SOURCE_NAME ? DataSource : `${options.name}DataSource`
}

/**
 * Construct DataSource Token from a given DataSource instance.
 *
 * @param instance - The DataSource instance.
 * @returns {string | typeof DataSource} The resolved DataSource token based on the instance's options.
 */
function tokenFromInstance(instance: DataSource): string | typeof DataSource {
  return tokenFromOptions(instance.options)
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
  if (typeof dataSource === 'string')
    return dataSource === DEFAULT_DATA_SOURCE_NAME ? DataSource : tokenFromString(dataSource)

  if (dataSource instanceof DataSource) return tokenFromInstance(dataSource)

  return tokenFromOptions(dataSource)
}

/**
 * Retrieves the prefix for a data source, helpful for token generation.
 *
 * @param dataSource - Optional data source, either a custom one or the default.
 * @returns {string} The prefix generated for the data source.
 */
export function getDataSourcePrefix(dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): string {
  if (dataSource === DEFAULT_DATA_SOURCE_NAME) {
    return ''
  }
  if (typeof dataSource === 'string') {
    return dataSource + '_'
  }
  if (dataSource.name === DEFAULT_DATA_SOURCE_NAME || !dataSource.name) {
    return ''
  }
  return dataSource.name + '_'
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
  if (typeof dataSource === 'string')
    return dataSource === DEFAULT_DATA_SOURCE_NAME ? EntityManager : `${dataSource}EntityManager`

  if (dataSource instanceof DataSource) return getEntityManagerTokenFromOptions(dataSource.options)

  return getEntityManagerTokenFromOptions(dataSource)
}

/**
 * Construct EntityManager Token from DataSource options.
 *
 * @deprecated This approach is deprecated with the removal of the `name` key in future TypeORM updates.
 * @param options - Data source options to construct the EntityManager token.
 * @returns {string | typeof EntityManager} The resolved EntityManager token or the EntityManager class.
 */
function getEntityManagerTokenFromOptions(options: DataSourceOptions) {
  return !options.name || options.name === DEFAULT_DATA_SOURCE_NAME ? EntityManager : `${options.name}EntityManager`
}

/**
 * Asynchronously creates a DataSource instance using specified options.
 * Supports optional initialization and retry logic for connection attempts.
 *
 * @param options - Configuration options for TypeORM data source creation.
 * @param shouldInitialize - Boolean indicating whether to initialize the data source immediately.
 * @returns {Promise<DataSource>} A promise resolving to the newly created DataSource instance.
 */
export async function createDataSource(options: TypeOrmOptions, shouldInitialize = true): Promise<DataSource> {
  const { retryAttempts, retryInterval, ...dataSourceOptions } = options

  const dataSource = new DataSource(dataSourceOptions)

  if (shouldInitialize)
    return lastValueFrom(
      defer(() => {
        return dataSource.initialize()
      }).pipe(handleRetry(retryAttempts, retryInterval)),
    )
  else return Promise.resolve(dataSource)
}

/**
 * Provides custom retry logic for database connection attempts.
 *
 * @param retryAttempts - Number of retry attempts for connection.
 * @param retryInterval - Milliseconds between retry attempts.
 * @returns {<T>(source: Observable<T>) => Observable<T>} A function handling retries on an Observable source.
 */
function handleRetry(retryAttempts = 10, retryInterval = 3000): <T>(source: Observable<T>) => Observable<T> {
  return <T>(source: Observable<T>) =>
    source.pipe(
      retry({
        count: retryAttempts,
        delay: retryInterval,
      }),
    )
}
