import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import { useSession } from '@/composables/useSession'
import { safeRedirect } from '@/lib/safeRedirect'

const SIGN_IN_PATH = '/sign-in'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// The only place holding the redirect rules. A signed-out visitor goes to the sign-in page,
// which remembers the asked path; a signed-in visitor opening the sign-in page goes back to that
// path (or `/`), unless the page has an error to show. Pages declare `meta: { public: true }`
// to skip the session check.
router.beforeEach((to) => {
  const session = useSession()
  if (to.path === SIGN_IN_PATH) {
    const hasError = typeof to.query.error === 'string'
    return session.isSignedIn.value && !hasError ? (safeRedirect(to.query.redirect) ?? '/') : true
  }
  if (to.meta.public || session.isSignedIn.value) {
    return true
  }
  return { path: SIGN_IN_PATH, query: { redirect: to.fullPath } }
})

export default router
