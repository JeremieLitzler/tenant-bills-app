import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validPeriodJson } from '@tests/helpers/periodFile'

// The local stores are IndexedDB, which `flushPromises` does not wait for (src/sync/ has its own specs).
vi.mock('@/sync/periodCopies', () => ({
  savePeriodCopy: async () => {},
  readPeriodCopy: async () => undefined,
}))
vi.mock('@/sync/patchQueue', () => ({
  enqueuePatch: async () => {},
  listPatches: async () => [],
}))

const getPeriodFile = vi.fn()

vi.mock('@/sync/periodsApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sync/periodsApi')>()),
  getPeriodFile,
  listPeriodIds: vi.fn().mockResolvedValue([]),
}))

async function openMonthPage(path: string) {
  document.cookie = 'gh_login=JeremieLitzler; Path=/'
  const { default: router } = await import('@/router')
  const { default: App } = await import('@/App.vue')
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.resetModules()
  getPeriodFile.mockReset()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('month page', () => {
  it('hands the route parameters to the form', async () => {
    getPeriodFile.mockResolvedValue({ json: validPeriodJson(), sha: 's' })
    const wrapper = await openMonthPage('/periods/2026-2027/months/2026-10')
    expect(wrapper.get<HTMLSelectElement>('[data-testid="month-picker"]').element.value).toBe(
      '2026-10',
    )
  })

  it('shows the not-found state of a period that does not exist', async () => {
    const { NotFoundError } = await import('@/sync/periodsApi')
    getPeriodFile.mockRejectedValue(new NotFoundError())
    const wrapper = await openMonthPage('/periods/2030-2031/months/2030-09')
    expect(wrapper.find('[data-testid="period-not-found"]').exists()).toBe(true)
  })
})
