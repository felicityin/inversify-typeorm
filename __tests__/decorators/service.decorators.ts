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

    it(`should rebind service if already bound in the container`, () => {
      const customContainer = new Container()
      Service('rebound_token', customContainer)(ScopedService)
      expect(customContainer.get<ScopedService>('rebound_token')).toBeInstanceOf(ScopedService)

      class ReplacementScopedService extends ScopedService {}
      Service('rebound_token', customContainer)(ReplacementScopedService)

      expect(customContainer.get<ScopedService>('rebound_token')).toBeInstanceOf(ReplacementScopedService)
    })
  })
})
