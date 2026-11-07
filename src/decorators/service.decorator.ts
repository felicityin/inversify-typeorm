import { injectable } from 'inversify'
import type { Constructor } from '../interfaces.js'
import { container } from '../typeorm.manager.js'

export const Service =
  (name?: string) =>
  <T extends Constructor>(cls: T): void => {
    injectable()(cls)
    container.bind(name || cls.name).to(cls)
  }
