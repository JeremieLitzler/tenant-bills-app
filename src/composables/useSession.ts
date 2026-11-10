// Session state, a singleton composable (docs/architecture.md, "State"). The module-level refs
// are shared by every caller. There is no start-up call to a function: the app opens offline,
// so "signed in" is a hint kept in IndexedDB, and the first 401 from the proxy corrects a stale one.
import { computed, readonly, ref } from 'vue'

import { clearSessionHint, readSessionHint, writeSessionHint } from '@/lib/sessionHint'

const LOGIN_START_PATH = '/.netlify/functions/github-auth-start'
const LOGOUT_PATH = '/.netlify/functions/github-auth-logout'

const login = ref<string | null>(null)
const isSignedIn = computed(() => login.value !== null)

let restoration: Promise<void> | undefined
// Wired by the period state (F3), which imports this module and never the reverse.
let readPendingCount: () => number = () => 0

function restore(): Promise<void> {
  restoration ??= readSessionHint().then((hint) => {
    login.value ??= hint
  })
  return restoration
}

function markSignedIn(githubLogin: string): void {
  login.value = githubLogin
  void writeSessionHint(githubLogin)
}

function signIn(redirect?: string): void {
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
  window.location.assign(`${LOGIN_START_PATH}${query}`)
}

// Ends the local session. Called on a 401, and by signOut().
function expire(): void {
  login.value = null
  void clearSessionHint()
}

async function signOut(): Promise<void> {
  const pending = readPendingCount()
  const plural = pending > 1 ? 's' : ''
  const message = `${pending} modification${plural} pas encore enregistrée${plural}. Se déconnecter quand même ?`
  if (pending > 0 && !window.confirm(message)) {
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
    restore,
    markSignedIn,
    signIn,
    signOut,
    expire,
    setPendingCountSource,
  }
}
