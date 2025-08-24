import { inject } from 'inversify'
import { DataSource, DataSourceOptions, EntityTarget, ObjectLiteral } from 'typeorm'
import { DEFAULT_DATA_SOURCE_NAME } from '../typeorm.constants'
import { getDataSourceToken, getEntityManagerToken, getRepositoryToken } from '../typeorm.utils'

export const InjectRepository = <Entity extends ObjectLiteral>(
  entity: EntityTarget<Entity>,
  dataSource: string = DEFAULT_DATA_SOURCE_NAME,
): PropertyDecorator => inject(getRepositoryToken(entity, dataSource))

export const InjectDataSource = (dataSource?: DataSource | DataSourceOptions | string): PropertyDecorator =>
  inject(getDataSourceToken(dataSource))

export const InjectEntityManager = (dataSource?: DataSource | DataSourceOptions | string): PropertyDecorator =>
  inject(getEntityManagerToken(dataSource))
