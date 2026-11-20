<script setup lang="ts">
// The global toasts, on reka-ui's Toast primitives. An info toast closes by itself after 5 seconds
// (the timer pauses on hover and focus); warning and error stay until closed. No swipe, no
// animation, and a toast never takes the focus.
import { CircleX, Info, TriangleAlert, X } from '@lucide/vue'
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastViewport } from 'reka-ui'

import { type ToastLevel, useToasts } from '@/composables/useToasts'
import { fr } from '@/i18n/fr'

const { toasts, dismiss } = useToasts()

const INFO_DURATION_MS = 5000

// Full class strings, so Tailwind sees them.
const LOOK: Record<ToastLevel, { box: string; iconColor: string; icon: typeof Info }> = {
  info: {
    box: 'border-theme-info bg-[color-mix(in_oklab,var(--theme-info)_10%,var(--background))]',
    iconColor: 'text-theme-info',
    icon: Info,
  },
  warning: {
    box: 'border-theme-warning bg-[color-mix(in_oklab,var(--theme-warning)_10%,var(--background))]',
    iconColor: 'text-theme-warning',
    icon: TriangleAlert,
  },
  error: {
    box: 'border-theme-error bg-[color-mix(in_oklab,var(--theme-error)_10%,var(--background))]',
    iconColor: 'text-theme-error',
    icon: CircleX,
  },
}
</script>

<template>
  <ToastProvider :swipe-threshold="Infinity">
    <ToastRoot
      v-for="toast in toasts"
      :key="toast.id"
      :open="true"
      :duration="toast.level === 'info' ? INFO_DURATION_MS : Infinity"
      :role="toast.level === 'info' ? 'status' : 'alert'"
      :data-level="toast.level"
      data-testid="toast"
      :class="[
        'text-foreground flex items-start gap-3 rounded-lg border p-3',
        LOOK[toast.level].box,
      ]"
      @update:open="(open: boolean) => !open && dismiss(toast.id)"
    >
      <component
        :is="LOOK[toast.level].icon"
        :class="['mt-0.5 size-5 shrink-0', LOOK[toast.level].iconColor]"
        aria-hidden="true"
      />
      <ToastDescription class="flex-1 text-sm">
        {{ toast.message }}
        <a
          v-if="toast.link"
          :href="toast.link.href"
          target="_blank"
          rel="noopener"
          class="underline"
          >{{ toast.link.label }}</a
        >
      </ToastDescription>
      <ToastClose :aria-label="fr.toast.close" class="shrink-0">
        <X class="size-4" aria-hidden="true" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport
      class="fixed right-4 bottom-4 left-4 z-50 m-0 flex list-none flex-col gap-2 p-0 sm:left-auto sm:w-96"
    />
  </ToastProvider>
</template>
