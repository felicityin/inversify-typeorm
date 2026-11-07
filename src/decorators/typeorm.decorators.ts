import { inject } from 'inversify'
import type { EntityTarget, ObjectLiteral } from 'typeorm'
import type { CustomDataSource } from '../interfaces.js'
import { DEFAULT_DATA_SOURCE_NAME } from '../typeorm.constants.js'
import { getDataSourceToken, getEntityManagerToken, getRepositoryToken } from '../typeorm.utils.js'

export type InjectDecorator = (target: object, propertyKey?: string | symbol, parameterIndex?: number) => void

export const InjectRepository = <Entity extends ObjectLiteral>(
  entity: EntityTarget<Entity>,
  dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME,
): InjectDecorator => inject(getRepositoryToken(entity, dataSource)) as InjectDecorator

export const InjectDataSource = (dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): InjectDecorator =>
  inject(getDataSourceToken(dataSource)) as InjectDecorator

export const InjectEntityManager = (dataSource: CustomDataSource = DEFAULT_DATA_SOURCE_NAME): InjectDecorator =>
  inject(getEntityManagerToken(dataSource)) as InjectDecorator
