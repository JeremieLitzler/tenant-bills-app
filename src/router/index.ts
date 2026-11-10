import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import { useSession } from '@/composables/useSession'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// The only place holding the redirect rule: every route needs a session unless the page
// declares `meta: { public: true }`. Sign-in sends the visitor back to `redirect`.
router.beforeEach(async (to) => {
  const session = useSession()
  await session.restore()
  if (to.meta.public || session.isSignedIn.value) {
    return true
  }
  return { path: '/sign-in', query: { redirect: to.fullPath } }
})

export default router
