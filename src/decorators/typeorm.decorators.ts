import { inject } from 'inversify'
import type { DataSource, DataSourceOptions, EntityTarget, ObjectLiteral } from 'typeorm'
import { DEFAULT_DATA_SOURCE_NAME } from '../typeorm.constants.js'
import { getDataSourceToken, getEntityManagerToken, getRepositoryToken } from '../typeorm.utils.js'

export const InjectRepository = <Entity extends ObjectLiteral>(
  entity: EntityTarget<Entity>,
  dataSource: string = DEFAULT_DATA_SOURCE_NAME,
): ParameterDecorator => inject(getRepositoryToken(entity, dataSource))

export const InjectDataSource = (dataSource?: DataSource | DataSourceOptions | string): PropertyDecorator =>
  inject(getDataSourceToken(dataSource))

export const InjectEntityManager = (dataSource?: DataSource | DataSourceOptions | string): PropertyDecorator =>
  inject(getEntityManagerToken(dataSource))
