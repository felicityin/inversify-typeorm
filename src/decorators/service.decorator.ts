import { type Container, injectable } from 'inversify'
import type { Constructor } from '../interfaces.js'
import { container as defaultContainer } from '../typeorm.manager.js'

export interface ServiceOptions {
  name?: string
  container?: Container
}

// Track registered classes per container to only rebind when the exact same class is decorated twice
const containerBoundServices = new WeakMap<Container, Map<string, Constructor>>()

/**
 * Service decorator to mark a class as injectable and bind it to an Inversify container.
 * Supports global singleton container, pluggable custom containers, and custom service tokens.
 * Only rebinds when the exact same class is decorated twice, preventing silent overwrites
 * when two different classes share the same name.
 *
 * @param nameOrOptionsOrContainer - Optional service identifier string, ServiceOptions, or target Container.
 * @param maybeContainer - Optional target Container when a string name is passed as first argument.
 * @returns Class decorator function.
 */
export const Service =
  (nameOrOptionsOrContainer?: string | ServiceOptions | Container, maybeContainer?: Container) =>
  <T extends Constructor>(cls: T): void => {
    try {
      injectable()(cls)
    } catch {
      // Idempotent: class is already decorated with @injectable
    }

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

    let registry = containerBoundServices.get(targetContainer)
    if (!registry) {
      registry = new Map<string, Constructor>()
      containerBoundServices.set(targetContainer, registry)
    }

    const previouslyBound = registry.get(serviceIdentifier)

    if (targetContainer.isBound(serviceIdentifier) && previouslyBound === cls) {
      // Only rebind when the exact same class is decorated twice
      targetContainer.rebind(serviceIdentifier).to(cls)
    } else {
      // First registration or two different classes sharing the same identifier:
      // Call bind() so Inversify preserves both bindings and surfaces an ambiguous-binding error on get()
      targetContainer.bind(serviceIdentifier).to(cls)
      registry.set(serviceIdentifier, cls)
    }
  }
