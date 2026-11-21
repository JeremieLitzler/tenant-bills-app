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
  it('is discreet at 0: no count bubble, a muted pill', async () => {
    const { wrapper } = await mountBadge()

    expect(text(wrapper, 'sync-state')).toBe('À jour')
    expect(text(wrapper, 'sync-pending')).toBe('Aucune modification en attente')
    expect(wrapper.find('[data-testid="sync-count"]').exists()).toBe(false)
    expect(wrapper.get('span.rounded-full').classes()).toContain('text-muted-foreground')
  })

  it('shows the count in a tinted pill above 0, in the right number', async () => {
    const { wrapper, setPendingCounts } = await mountBadge()

    setPendingCounts({ a: 1 })
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-pending')).toBe('1 modification en attente')
    expect(text(wrapper, 'sync-count')).toBe('1')
    expect(wrapper.get('span.rounded-full').classes()).toContain('border-theme-warning')

    setPendingCounts({ a: 2, b: 1 })
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-pending')).toBe('3 modifications en attente')
    expect(text(wrapper, 'sync-count')).toBe('3')
  })

  it('goes back to the discreet pill when the count returns to 0', async () => {
    const { wrapper, setPendingCounts } = await mountBadge()
    setPendingCounts({ a: 2 })
    await wrapper.vm.$nextTick()

    setPendingCounts({})
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="sync-count"]').exists()).toBe(false)
    expect(text(wrapper, 'sync-pending')).toBe('Aucune modification en attente')
  })

  it('says offline, saving during a drain, and error after a failed one', async () => {
    const { wrapper, queue } = await mountBadge()

    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-state')).toBe('Hors ligne')
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
    expect(text(wrapper, 'sync-state')).toBe('À jour')

    drainQueue.mockRejectedValueOnce(new DrainError(new Error('500'), new Map()))
    await queue.drain()
    await wrapper.vm.$nextTick()
    expect(text(wrapper, 'sync-state')).toBe("Échec de l'enregistrement")
  })

  it('is sticky, so it stays visible while scrolling', async () => {
    const { wrapper } = await mountBadge()

    expect(wrapper.get('[data-testid="sync-badge"]').classes()).toContain('sticky')
  })
})
