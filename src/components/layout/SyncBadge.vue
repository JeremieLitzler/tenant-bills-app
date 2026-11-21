<script setup lang="ts">
import { usePeriods } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'
import type { SyncState } from '@/composables/useSaveQueue'

const { pendingCount, syncState } = usePeriods()

const dot: Record<SyncState, string> = {
  idle: 'bg-theme-success',
  saving: 'bg-theme-info animate-pulse',
  offline: 'bg-muted-foreground',
  error: 'bg-theme-error',
}
</script>

<template>
  <!-- Sticky so the landlord sees what is not saved while scrolling; discreet at 0, tinted above. -->
  <div class="pointer-events-none sticky top-2 z-10 mb-4 flex justify-end" data-testid="sync-badge">
    <span
      class="bg-background pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
      :class="
        pendingCount === 0
          ? 'text-muted-foreground'
          : 'border-theme-warning bg-[color-mix(in_oklab,var(--theme-warning)_25%,var(--background))] font-semibold shadow-sm'
      "
    >
      <span class="size-2 rounded-full" :class="dot[syncState]" aria-hidden="true" />
      <span data-testid="sync-state">{{ fr.shell.syncState[syncState] }}</span>
      <span
        v-if="pendingCount > 0"
        class="bg-theme-warning text-background grid min-w-6 place-items-center rounded-full px-1.5 text-xs"
        aria-hidden="true"
        data-testid="sync-count"
        >{{ pendingCount }}</span
      >
      <span class="sr-only" data-testid="sync-pending">{{ fr.shell.pending(pendingCount) }}</span>
    </span>
  </div>
</template>
