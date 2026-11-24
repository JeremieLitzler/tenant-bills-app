import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import PeriodListItem from './PeriodListItem.vue'

const period = vi.hoisted(() => ({ status: 'ready', file: undefined as unknown }))
vi.mock('@/composables/usePeriods', async () => {
  const { computed } = await import('vue')
  return {
    usePeriod: () => ({
      status: computed(() => period.status),
      file: computed(() => period.file),
    }),
  }
})

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<i />' } }],
})

function status(state: string, file?: unknown) {
  period.status = state
  period.file = file
  return mount(PeriodListItem, { props: { id: '2026-2027' }, global: { plugins: [router] } }).get(
    '[data-testid="period-status"]',
  )
}

describe('PeriodListItem', () => {
  it('shows an open period as open', () => {
    expect(status('ready', {}).text()).toBe('Ouverte')
  })

  it('shows a period with closedOn as closed', () => {
    expect(status('ready', { closedOn: '2026-09-12' }).text()).toBe('Clôturée')
  })

  it('shows "…" while the period loads', () => {
    expect(status('loading').text()).toBe('…')
  })

  it('shows a warning "Aucun statut" when the period failed to load', () => {
    const el = status('error')
    expect(el.text()).toBe('Aucun statut')
    expect(el.find('svg').exists()).toBe(true)
  })
})
