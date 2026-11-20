import { beforeEach, describe, expect, it, vi } from 'vitest'

async function load() {
  vi.resetModules()
  return (await import('./useToasts')).useToasts()
}

describe('useToasts', () => {
  let toasts: Awaited<ReturnType<typeof load>>

  beforeEach(async () => {
    toasts = await load()
  })

  it('lists the notified toasts with their level, oldest first', () => {
    toasts.notify({ level: 'info', message: 'a' })
    toasts.notify({ level: 'warning', message: 'b' })
    toasts.notify({ level: 'error', message: 'c', link: { href: 'https://x', label: 'x' } })

    expect(toasts.toasts.value.map((t) => [t.level, t.message])).toEqual([
      ['info', 'a'],
      ['warning', 'b'],
      ['error', 'c'],
    ])
    expect(toasts.toasts.value[2].link).toEqual({ href: 'https://x', label: 'x' })
  })

  it('shows at most 3 toasts and lets the others wait until one is dismissed', () => {
    for (const message of ['a', 'b', 'c', 'd']) toasts.notify({ level: 'error', message })

    expect(toasts.toasts.value.map((t) => t.message)).toEqual(['a', 'b', 'c'])
    toasts.dismiss(toasts.toasts.value[0].id)
    expect(toasts.toasts.value.map((t) => t.message)).toEqual(['b', 'c', 'd'])
  })

  it('does not show a message again while it is on screen, whatever the level', () => {
    toasts.notify({ level: 'info', message: 'a' })
    toasts.notify({ level: 'error', message: 'a' })
    expect(toasts.toasts.value).toHaveLength(1)

    toasts.dismiss(toasts.toasts.value[0].id)
    toasts.notify({ level: 'error', message: 'a' })
    expect(toasts.toasts.value).toHaveLength(1)
  })
})
