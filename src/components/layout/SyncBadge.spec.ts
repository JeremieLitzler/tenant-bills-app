import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DrainError } from '@/sync/drainQueue'

const drainQueue = vi.fn<() => Promise<Map<string, string>>>()

async function mountBadge() {
  vi.resetModules()
  vi.doMock('@/sync/drainQueue', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/sync/drainQueue')>()),
    drainQueue,
  }))
  vi.doMock('@/sync/patchQueue', () => ({
    listPatches: async () => [],
    enqueuePatch: async () => {},
  }))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const { default: SyncBadge } = await import('./SyncBadge.vue')
  const { setPendingCounts } = await import('@/composables/pendingPatches')
  const { useSaveQueue } = await import('@/composables/useSaveQueue')
  return { wrapper: mount(SyncBadge), setPendingCounts, queue: useSaveQueue() }
}

const text = (wrapper: ReturnType<typeof mount>, id: string) =>
  wrapper.get(`[data-testid="${id}"]`).text()

afterEach(() => {
  drainQueue.mockReset()
  vi.restoreAllMocks()
  vi.doUnmock('@/sync/drainQueue')
  vi.doUnmock('@/sync/patchQueue')
})

describe('SyncBadge', () => {
  it('says everything is saved at 0, on a green banner with no count', async () => {
    const { wrapper } = await mountBadge()

    expect(text(wrapper, 'sync-state')).toBe('Tout est enregistré')
    expect(text(wrapper, 'sync-detail')).toBe('Vos modifications sont sur GitHub.')
    expect(wrapper.get('[data-testid="sync-badge"]').classes()).toContain('bg-theme-success')
  })

  it('puts the pending count in the detail, in the right number', async () => {
    const { wrapper, setPendingCounts } = await mountBadge()

    setPendingCounts({ a: 1 })
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-detail')).toBe(
      '1 modification en attente. Vos modifications sont sur GitHub.',
    )

    setPendingCounts({ a: 2, b: 1 })
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-detail')).toContain('3 modifications en attente.')

    setPendingCounts({})
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-detail')).toBe('Vos modifications sont sur GitHub.')
  })

  it('says offline, saving during a drain, and error after a failed one', async () => {
    const { wrapper, queue } = await mountBadge()

    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-state')).toBe('Hors ligne')
    expect(wrapper.get('[data-testid="sync-badge"]').classes()).toContain('bg-muted-foreground')
    expect(text(wrapper, 'sync-detail')).toContain('enregistrées dans votre navigateur')
    window.dispatchEvent(new Event('online'))
    await wrapper.vm.$nextTick()

    let finish: (written: Map<string, string>) => void = () => undefined
    drainQueue.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    const draining = queue.drain()
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-state')).toBe('Enregistrement…')
    finish(new Map())
    await draining
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-state')).toBe('Tout est enregistré')

    drainQueue.mockRejectedValueOnce(new DrainError(new Error('500'), new Map()))
    await queue.drain()
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-state')).toBe("Échec de l'enregistrement")
    expect(wrapper.get('[data-testid="sync-badge"]').classes()).toContain('bg-theme-error')
  })

  it('is sticky, so it stays visible while scrolling', async () => {
    const { wrapper } = await mountBadge()

    expect(wrapper.get('[data-testid="sync-badge"]').classes()).toContain('sticky')
  })
})
