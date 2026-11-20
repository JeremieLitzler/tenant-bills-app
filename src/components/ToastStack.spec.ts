import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

async function mountStack() {
  vi.resetModules()
  const { useToasts } = await import('@/composables/useToasts')
  const { default: ToastStack } = await import('./ToastStack.vue')
  return { wrapper: mount(ToastStack, { attachTo: document.body }), toasts: useToasts() }
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('ToastStack', () => {
  it('gives warning and error toasts role alert, and info role status', async () => {
    const { wrapper, toasts } = await mountStack()
    toasts.notify({ level: 'info', message: 'i' })
    toasts.notify({ level: 'warning', message: 'w' })
    toasts.notify({ level: 'error', message: 'e' })
    await nextTick()

    const roles = wrapper.findAll('[data-testid="toast"]').map((t) => t.attributes('role'))
    expect(roles).toEqual(['status', 'alert', 'alert'])
  })

  it('closes a toast with its "Fermer" button', async () => {
    const { wrapper, toasts } = await mountStack()
    toasts.notify({ level: 'error', message: 'e' })
    await nextTick()

    await wrapper.get('button[aria-label="Fermer"]').trigger('click')

    expect(wrapper.find('[data-testid="toast"]').exists()).toBe(false)
    expect(toasts.toasts.value).toEqual([])
  })

  it('shows the link of the misconfigured toast', async () => {
    const { wrapper, toasts } = await mountStack()
    const { misconfiguredToast } = await import('@/composables/useToasts')
    toasts.notify(misconfiguredToast)
    await nextTick()

    const link = wrapper.get('[data-testid="toast"] a')
    expect(link.attributes('href')).toBe('https://app.netlify.com/')
    expect(link.text()).toBe('Ouvrir Netlify')
  })

  it('closes an info toast after 5 seconds and keeps a warning and an error', async () => {
    vi.useFakeTimers()
    const { wrapper, toasts } = await mountStack()
    toasts.notify({ level: 'info', message: 'i' })
    toasts.notify({ level: 'warning', message: 'w' })
    toasts.notify({ level: 'error', message: 'e' })
    await nextTick()

    await vi.advanceTimersByTimeAsync(4900)
    expect(wrapper.findAll('[data-testid="toast"]')).toHaveLength(3)
    await vi.advanceTimersByTimeAsync(200)
    expect(wrapper.findAll('[data-testid="toast"]').map((t) => t.attributes('data-level'))).toEqual(
      ['warning', 'error'],
    )
  })
})
