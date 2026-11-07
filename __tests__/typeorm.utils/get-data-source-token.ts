import { describe, expect, it } from '@jest/globals'
import type { DataSourceOptions } from 'typeorm'
import { DataSource } from 'typeorm'
import { getDataSourceToken } from '../../src/index.js'
import type { TypeOrmOptions } from '../../src/interfaces.js'

const DEFAULT_DATA_SOURCE_NAME = 'default'

describe(`getDataSourceToken`, () => {
  it(`should get a default data source token`, () => {
    expect(getDataSourceToken()).toBeInstanceOf(Function)
    expect(getDataSourceToken(DEFAULT_DATA_SOURCE_NAME)).toBeInstanceOf(Function)
  })

  it(`should get a data source token if give a name`, () => {
    expect(getDataSourceToken('a')).toBe('aDataSource')
    expect(getDataSourceToken('test')).toBe('testDataSource')
  })

  it(`should get a data source token if give a created data source`, () => {
    const dataSource = new DataSource({
      type: 'mysql',
    })
    expect(getDataSourceToken(dataSource)).toBeInstanceOf(Function)

    const dataSource1 = new DataSource({
      name: DEFAULT_DATA_SOURCE_NAME,
      type: 'mysql',
    } as TypeOrmOptions as DataSourceOptions)
    expect(getDataSourceToken(dataSource1)).toBeInstanceOf(Function)

    const dataSource2 = new DataSource({
      name: 'test',
      type: 'mysql',
    } as TypeOrmOptions as DataSourceOptions)
    expect(getDataSourceToken(dataSource2)).toBe('testDataSource')
  })

  it(`should get a data source token if give data source options`, () => {
    const dataSourceOptions: DataSourceOptions = {
      type: 'mysql',
    }
    expect(getDataSourceToken(dataSourceOptions)).toBeInstanceOf(Function)

    const dataSourceOptions1: TypeOrmOptions = {
      name: DEFAULT_DATA_SOURCE_NAME,
      type: 'mysql',
    }
    expect(getDataSourceToken(dataSourceOptions1)).toBeInstanceOf(Function)

    const dataSourceOptions2: TypeOrmOptions = {
      name: 'test',
      type: 'mysql',
    }
    expect(getDataSourceToken(dataSourceOptions2)).toBe('testDataSource')
  })
})
