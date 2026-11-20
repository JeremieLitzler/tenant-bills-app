import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function mountSignInPage(query: string) {
  vi.resetModules()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
  const { default: router } = await import('@/router')
  const { default: SignIn } = await import('./sign-in.vue')
  await router.push(`/sign-in${query}`)
  const { useToasts } = await import('@/composables/useToasts')
  const wrapper = mount(SignIn, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router, toasts: useToasts().toasts }
}

beforeEach(() => {
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('sign-in page', () => {
  it('is reachable signed out and offers the GitHub sign-in', async () => {
    const { wrapper, toasts } = await mountSignInPage('')

    expect(wrapper.find('button').text()).toBe('Se connecter avec GitHub')
    expect(toasts.value).toEqual([])
  })

  it('shows the not-allowed message as an error toast, then removes error from the URL', async () => {
    const { toasts, router } = await mountSignInPage('?error=not-allowed&redirect=%2Fperiods')

    expect(toasts.value).toMatchObject([
      {
        level: 'error',
        message: "Ce compte GitHub n'est pas autorisé à utiliser l'application.",
      },
    ])
    expect(router.currentRoute.value.query).toEqual({ redirect: '/periods' })
  })

  it('shows the misconfiguration toast with the Netlify link and no variable name', async () => {
    const { toasts } = await mountSignInPage('?error=misconfigured')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toContain("L'application n'est pas configurée correctement.")
    expect(toasts.value[0].link?.href).toBe('https://app.netlify.com/')
    expect(JSON.stringify(toasts.value)).not.toMatch(/GITHUB_OAUTH|ALLOWED_LOGINS/)
  })

  it('shows the failure message without the Netlify link', async () => {
    const { toasts } = await mountSignInPage('?error=failed')

    expect(toasts.value[0].message).toContain('La connexion à GitHub a échoué.')
    expect(toasts.value[0].link).toBeUndefined()
  })

  it('ignores an unknown error code', async () => {
    const { toasts } = await mountSignInPage('?error=whatever')

    expect(toasts.value).toEqual([])
  })
})
