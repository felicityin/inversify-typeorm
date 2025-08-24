import type { DataSourceOptions } from 'typeorm'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = object, Args extends any[] = any[]> = new (...args: Args) => T

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
