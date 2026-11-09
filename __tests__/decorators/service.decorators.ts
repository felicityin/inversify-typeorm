import { describe, expect, it } from '@jest/globals'
import { Container } from 'inversify'
import { Service } from '../../src/decorators/index.js'
import { container } from '../../src/index.js'

class DummyService {}
class NamedService {}
class ScopedService {}
class ScopedNamedService {}
class OptionsNamedService {}

describe(`service decorator`, () => {
  describe(`service decorator`, () => {
    it(`should get a dummy service from the container`, () => {
      Service()(DummyService)
      expect(container.get<DummyService>(DummyService.name)).toBeInstanceOf(DummyService)
    })

    it(`should get a named service from the container`, () => {
      Service('named')(NamedService)
      expect(container.get<NamedService>('named')).toBeInstanceOf(NamedService)
    })

    it(`should bind to a custom target container when passed directly`, () => {
      const customContainer = new Container()
      Service(customContainer)(ScopedService)

      expect(customContainer.get<ScopedService>(ScopedService.name)).toBeInstanceOf(ScopedService)
      expect(container.isBound(ScopedService.name)).toBe(false)
    })

    it(`should bind to a custom target container with custom name`, () => {
      const customContainer = new Container()
      Service('scoped_custom', customContainer)(ScopedNamedService)

      expect(customContainer.get<ScopedNamedService>('scoped_custom')).toBeInstanceOf(ScopedNamedService)
      expect(container.isBound('scoped_custom')).toBe(false)
    })

    it(`should bind using ServiceOptions configuration object`, () => {
      const customContainer = new Container()
      Service({ name: 'options_custom', container: customContainer })(OptionsNamedService)

      expect(customContainer.get<OptionsNamedService>('options_custom')).toBeInstanceOf(OptionsNamedService)
      expect(container.isBound('options_custom')).toBe(false)
    })

    it(`should only rebind when the exact same class is decorated twice`, () => {
      const customContainer = new Container()
      Service('same_token', customContainer)(ScopedService)
      expect(customContainer.get<ScopedService>('same_token')).toBeInstanceOf(ScopedService)

      // Decorating the exact same class again rebinds cleanly
      Service('same_token', customContainer)(ScopedService)
      expect(customContainer.get<ScopedService>('same_token')).toBeInstanceOf(ScopedService)
    })

    it(`should not overwrite when two different classes share the same name, surfacing ambiguous binding error at get()`, () => {
      const customContainer = new Container()
      class ServiceA {}
      class ServiceB {}

      Service('shared_name', customContainer)(ServiceA)
      Service('shared_name', customContainer)(ServiceB)

      // Must not silently overwrite ServiceA with ServiceB; get() must throw ambiguous binding error
      expect(() => customContainer.get('shared_name')).toThrow(/Ambiguous bindings found/i)
    })
  })
})
