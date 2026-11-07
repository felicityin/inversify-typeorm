import { describe, expect, it } from '@jest/globals'
import type { DataSourceOptions } from 'typeorm'
import { DataSource } from 'typeorm'
import { getDataSourcePrefix } from '../../src/index.js'
import type { TypeOrmOptions } from '../../src/interfaces.js'

const DEFAULT_DATA_SOURCE_NAME = 'default'

describe(`getDataSourcePrefix`, () => {
  it(`should get a default prefix`, () => {
    expect(getDataSourcePrefix()).toBe('')
    expect(getDataSourcePrefix(DEFAULT_DATA_SOURCE_NAME)).toBe('')
  })

  it(`should get a prefix if give a name`, () => {
    expect(getDataSourcePrefix('a')).toBe('a_')
    expect(getDataSourcePrefix('test')).toBe('test_')
  })

  it(`should get a prefix if give a created data source`, () => {
    const dataSource = new DataSource({
      type: 'mysql',
    })
    expect(getDataSourcePrefix(dataSource)).toBe('')

    const dataSource1 = new DataSource({
      name: DEFAULT_DATA_SOURCE_NAME,
      type: 'mysql',
    } as TypeOrmOptions as DataSourceOptions)
    expect(getDataSourcePrefix(dataSource1)).toBe('')

    const dataSource2 = new DataSource({
      name: 'test',
      type: 'mysql',
    } as TypeOrmOptions as DataSourceOptions)
    expect(getDataSourcePrefix(dataSource2)).toBe('test_')
  })

  it(`should get a prefix if give data source options`, () => {
    const dataSourceOptions: DataSourceOptions = {
      type: 'mysql',
    }
    expect(getDataSourcePrefix(dataSourceOptions)).toBe('')

    const dataSourceOptions1: TypeOrmOptions = {
      name: DEFAULT_DATA_SOURCE_NAME,
      type: 'mysql',
    }
    expect(getDataSourcePrefix(dataSourceOptions1)).toBe('')

    const dataSourceOptions2: TypeOrmOptions = {
      name: 'test',
      type: 'mysql',
    }
    expect(getDataSourcePrefix(dataSourceOptions2)).toBe('test_')
  })
})
