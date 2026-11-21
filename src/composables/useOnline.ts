// Whether the browser is online, a singleton shared by the sync status (useSaveQueue.ts) and the
// app shell (App.vue drains when it comes back).
import { readonly, ref } from 'vue'

const online = ref(navigator.onLine)
window.addEventListener('online', () => (online.value = true))
window.addEventListener('offline', () => (online.value = false))

export function useOnline() {
  return { online: readonly(online) }
}
