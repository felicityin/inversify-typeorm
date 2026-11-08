import { type Container, injectable } from 'inversify'
import type { Constructor } from '../interfaces.js'
import { container as defaultContainer } from '../typeorm.manager.js'

export interface ServiceOptions {
  name?: string
  container?: Container
}

/**
 * Service decorator to mark a class as injectable and bind it to an Inversify container.
 * Supports global singleton container, pluggable custom containers, and custom service tokens.
 *
 * @param nameOrOptionsOrContainer - Optional service identifier string, ServiceOptions, or target Container.
 * @param maybeContainer - Optional target Container when a string name is passed as first argument.
 * @returns Class decorator function.
 */
export const Service =
  (nameOrOptionsOrContainer?: string | ServiceOptions | Container, maybeContainer?: Container) =>
  <T extends Constructor>(cls: T): void => {
    injectable()(cls)

    let name: string | undefined
    let targetContainer: Container = defaultContainer

    if (
      nameOrOptionsOrContainer &&
      typeof (nameOrOptionsOrContainer as Container).bind === 'function' &&
      typeof (nameOrOptionsOrContainer as Container).isBound === 'function'
    ) {
      targetContainer = nameOrOptionsOrContainer as Container
    } else if (typeof nameOrOptionsOrContainer === 'object' && nameOrOptionsOrContainer !== null) {
      name = (nameOrOptionsOrContainer as ServiceOptions).name
      targetContainer = (nameOrOptionsOrContainer as ServiceOptions).container || defaultContainer
    } else if (typeof nameOrOptionsOrContainer === 'string') {
      name = nameOrOptionsOrContainer
      if (maybeContainer) {
        targetContainer = maybeContainer
      }
    }

    const serviceIdentifier = name || cls.name
    if (targetContainer.isBound(serviceIdentifier)) {
      targetContainer.rebind(serviceIdentifier).to(cls)
    } else {
      targetContainer.bind(serviceIdentifier).to(cls)
    }
  }
