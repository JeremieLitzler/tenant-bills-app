// The global toast stack: one-off events told to the landlord (docs/grillings/2026-11-20-global-
// toast-notifications). A singleton composable (docs/architecture.md, "State"); the composable that
// knows the event calls `notify`, `ToastStack` (mounted in AppShell) shows `toasts`.
import { computed, readonly, ref } from 'vue'

import { fr } from '@/i18n/fr'

export type ToastLevel = 'info' | 'warning' | 'error'

export interface ToastInput {
  level: ToastLevel
  // Already translated, from src/i18n/fr.ts.
  message: string
  link?: { href: string; label: string }
}

export interface Toast extends ToastInput {
  id: number
}

export const MAX_VISIBLE_TOASTS = 3

export const misconfiguredToast: ToastInput = {
  level: 'error',
  message: fr.misconfigured.message,
  link: { href: 'https://app.netlify.com/', label: fr.misconfigured.netlifyLink },
}

// Oldest first, so the newest sits nearest the bottom corner. Those past the limit wait here.
const queue = ref<Toast[]>([])
let nextId = 1

// A message already waiting or on screen is not shown again, whatever its level.
function notify(input: ToastInput): void {
  if (queue.value.some((toast) => toast.message === input.message)) return
  queue.value.push({ ...input, id: nextId++ })
}

function dismiss(id: number): void {
  queue.value = queue.value.filter((toast) => toast.id !== id)
}

export function useToasts() {
  return {
    toasts: readonly(computed(() => queue.value.slice(0, MAX_VISIBLE_TOASTS))),
    notify,
    dismiss,
  }
}
