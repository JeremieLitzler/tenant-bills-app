// Session state, a singleton composable (docs/architecture.md, "State"). The module-level ref
// is shared by every caller. There is no start-up call to a function: the app opens offline, so
// "signed in" is the `gh_login` cookie hint, and the first 401 from the proxy corrects a stale one.
import { computed, readonly, ref } from 'vue'

import { fr } from '@/i18n/fr'
import { clearLoginCookie, readLoginCookie } from '@/lib/loginCookie'

const LOGIN_START_PATH = '/.netlify/functions/github-auth-start'
const LOGOUT_PATH = '/.netlify/functions/github-auth-logout'

const login = ref<string | null>(readLoginCookie())
const isSignedIn = computed(() => login.value !== null)

// Wired by the period state (F3), which imports this module and never the reverse.
let readPendingCount: () => number = () => 0

function signIn(redirect?: string): void {
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
  window.location.assign(`${LOGIN_START_PATH}${query}`)
}

// Ends the local session. Called on a 401, and by signOut().
function expire(): void {
  login.value = null
  clearLoginCookie()
}

async function signOut(): Promise<void> {
  const pending = readPendingCount()
  if (pending > 0 && !window.confirm(fr.session.confirmSignOut(pending))) {
    return
  }
  try {
    await fetch(LOGOUT_PATH, { method: 'POST' })
  } catch {
    // Offline: the cookie ends by itself after 8 hours. The queued edits are kept either way.
  }
  expire()
}

function setPendingCountSource(source: () => number): void {
  readPendingCount = source
}

export function useSession() {
  return {
    login: readonly(login),
    isSignedIn,
    signIn,
    signOut,
    expire,
    setPendingCountSource,
  }
}
