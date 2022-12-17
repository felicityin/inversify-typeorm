import { DataSourceOptions, EntitySchema } from 'typeorm'

// eslint-disable-next-line @typescript-eslint/ban-types
export type EntityClassOrSchema = Function | EntitySchema

export type TypeOrmOptions = {
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
} & Partial<DataSourceOptions>
