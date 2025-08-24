import { injectable } from 'inversify'
import { container } from '../typeorm.manager'
import { Constructor } from '../interfaces'

export const Service =
  (name?: string) =>
  <T extends Constructor>(cls: T): void => {
    injectable()(cls)
    container.bind(name || cls.name).to(cls)
  }
