import '../shims/nodeGlobals'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
  unobserve() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock

afterEach(() => {
  cleanup()
  localStorage.clear()
  delete window.midnight
})
