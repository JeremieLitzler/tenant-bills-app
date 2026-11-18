// A 401 from the proxy ends the session; the app shell then redirects to the sign-in page.
import { useSession } from '@/composables/useSession'
import { UnauthorizedError } from '@/sync/periodsApi'

export function expireOnUnauthorized(error: unknown): void {
  if (error instanceof UnauthorizedError) {
    useSession().expire()
  }
}
