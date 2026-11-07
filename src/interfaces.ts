import type { DataSource, DataSourceOptions, MongoRepository, ObjectLiteral, Repository, TreeRepository } from 'typeorm'

// biome-ignore lint/suspicious/noExplicitAny: required for generic constructor args
export type Constructor<T = object, Args extends any[] = any[]> = new (...args: Args) => T

// biome-ignore lint/suspicious/noExplicitAny: default generic type
export type CustomRepositoryConstructor<T extends ObjectLiteral = any> = Constructor<Repository<T>>

// biome-ignore lint/suspicious/noExplicitAny: default generic type
export type RepositoryToken<T extends ObjectLiteral = any> = CustomRepositoryConstructor<T> | string

export type TypeOrmOptions = {
  /**
   * Connection name identifier for multi-DataSource management.
   * TypeORM 1.x removed this from DataSourceOptions; inversify-typeorm maintains it for DI token resolution.
   */
  name?: string
  /**
   * Number of times to retry connecting
   * Default: 10
   */
  retryAttempts?: number
  /**
   * Interval between connection retry attempts (ms)
   * Default: 3000
   */
  retryInterval?: number
} & DataSourceOptions

export type DataSourceProvider = () => Promise<DataSource>
export type TypeOrmRepository<Entity extends ObjectLiteral> =
  | Repository<Entity>
  | TreeRepository<Entity>
  | MongoRepository<Entity>

export type CustomDataSource = DataSource | TypeOrmOptions | DataSourceOptions | string
