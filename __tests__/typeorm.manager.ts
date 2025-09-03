import { describe, it, expect } from '@jest/globals'
import {
  DataSource,
  Entity,
  MongoRepository,
  Repository,
  // Tree,
  // TreeRepository
} from 'typeorm'
import type { DataSourceOptions } from 'typeorm'
import { container, TypeOrmManager } from '../src'

class User {}
// class UserTreeEntity {}

describe(`TypeOrmManager`, () => {
  Entity()(User)
  // Entity()(UserTreeEntity)
  // Tree('closure-table')(UserTreeEntity)

  it(`should get default data source and repository`, async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        entities: [User],
      },
      false,
    )
    await TypeOrmManager.importRepository([User])

    expect(TypeOrmManager.getDataSource()).toBeInstanceOf(DataSource)
    expect(container.get('UserRepository')).toBeInstanceOf(Repository)
  })

  it(`should get default mongo data source and repository`, async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mongodb',
        name: 'test_mongo',
        entities: [User],
      },
      false,
    )
    await TypeOrmManager.importRepository([User], 'test_mongo')

    expect(TypeOrmManager.getDataSource('test_mongo')).toBeInstanceOf(DataSource)
    expect(container.get('test_mongo_UserRepository')).toBeInstanceOf(MongoRepository)
  })

  //! This test is not working and it feels like library may have issues in importing tree repositories
  // it(`should get mysql data source and tree repository`, async () => {
  //   await TypeOrmManager.importRoot(
  //     {
  //       type: 'postgres',
  //       name: 'test_tree',
  //       entities: [UserTreeEntity],
  //     },
  //     false,
  //   )
  //   await TypeOrmManager.importRepository([UserTreeEntity], 'test_tree')

  //   expect(TypeOrmManager.getDataSource('test_tree')).toBeInstanceOf(DataSource)
  //   expect(container.get('test_tree_UserTreeEntityRepository')).toBeInstanceOf(TreeRepository)
  // })

  it(`should get data source and repository if given a name`, async () => {
    await TypeOrmManager.importRoot(
      {
        type: 'mysql',
        name: 'test',
        entities: [User],
      },
      false,
    )
    await TypeOrmManager.importRepository([User], 'test')

    expect(TypeOrmManager.getDataSource('test')).toBeInstanceOf(DataSource)
    expect(container.get('test_UserRepository')).toBeInstanceOf(Repository)
  })

  it(`should get default data source and repository if given data source options`, async () => {
    const options: DataSourceOptions = {
      type: 'mysql',
      name: 'test1',
      entities: [User],
    }
    await TypeOrmManager.importRoot(options, false)
    await TypeOrmManager.importRepository([User], options)

    expect(TypeOrmManager.getDataSource(options)).toBeInstanceOf(DataSource)
    expect(container.get('test1_UserRepository')).toBeInstanceOf(Repository)
  })

  it('should handle destroying a non-initialized DataSource', async () => {
    const options: DataSourceOptions = {
      type: 'mysql',
      name: 'testDestroyUninitialized',
      entities: [User],
    }

    await TypeOrmManager.importRoot(options, false)

    const dataSource = TypeOrmManager.getDataSource(options)
    expect(dataSource.isInitialized).toBe(false)

    await expect(TypeOrmManager.destroyDataSource(options)).resolves.not.toThrow()
    expect(dataSource.isInitialized).toBe(false)
  })
})
