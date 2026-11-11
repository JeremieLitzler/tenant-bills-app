import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function mountSignInPage(query: string) {
  vi.resetModules()
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
  const { default: router } = await import('@/router')
  const { default: SignIn } = await import('./sign-in.vue')
  await router.push(`/sign-in${query}`)
  return mount(SignIn, { global: { plugins: [router] } })
}

beforeEach(() => {
  document.cookie = 'gh_login=; Path=/; Max-Age=0'
})

describe('sign-in page', () => {
  it('is reachable signed out and offers the GitHub sign-in', async () => {
    const wrapper = await mountSignInPage('')

    expect(wrapper.find('button').text()).toBe('Se connecter avec GitHub')
    expect(wrapper.find('[data-testid="sign-in-error"]').exists()).toBe(false)
  })

  it('shows the not-allowed message', async () => {
    const wrapper = await mountSignInPage('?error=not-allowed')

    expect(wrapper.get('[data-testid="sign-in-error"]').text()).toBe(
      "Ce compte GitHub n'est pas autorisé à utiliser l'application.",
    )
  })

  it('shows the misconfiguration message with the Netlify link and no variable name', async () => {
    const wrapper = await mountSignInPage('?error=misconfigured')

    const error = wrapper.get('[data-testid="sign-in-error"]')
    expect(error.text()).toContain("L'application n'est pas configurée correctement.")
    expect(error.get('a').attributes('href')).toBe('https://app.netlify.com/')
    expect(wrapper.text()).not.toMatch(/GITHUB_OAUTH|ALLOWED_LOGINS/)
  })

  it('shows the failure message without the Netlify link', async () => {
    const wrapper = await mountSignInPage('?error=failed')

    const error = wrapper.get('[data-testid="sign-in-error"]')
    expect(error.text()).toContain('La connexion à GitHub a échoué.')
    expect(error.find('a').exists()).toBe(false)
  })

  it('ignores an unknown error code', async () => {
    const wrapper = await mountSignInPage('?error=whatever')

    expect(wrapper.find('[data-testid="sign-in-error"]').exists()).toBe(false)
  })
})
