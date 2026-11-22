<script setup lang="ts">
import { CircleCheck, CircleX, LoaderCircle, WifiOff } from '@lucide/vue'
import { computed } from 'vue'

import { usePeriods } from '@/composables/usePeriods'
import type { SyncState } from '@/composables/useSaveQueue'
import { fr } from '@/i18n/fr'

const { pendingCount, syncState } = usePeriods()

const tint: Record<SyncState, string> = {
  idle: 'bg-theme-success',
  saving: 'bg-theme-info',
  offline: 'bg-muted-foreground',
  error: 'bg-theme-error',
}
const icon = { idle: CircleCheck, saving: LoaderCircle, offline: WifiOff, error: CircleX }

const detail = computed(
  () =>
    `${pendingCount.value > 0 ? `${fr.shell.pending(pendingCount.value)}. ` : ''}${fr.shell.syncDetail[syncState.value]}`,
)
</script>

<template>
  <!-- Sticky full-width banner: the landlord sees what is not saved while scrolling. -->
  <div
    class="text-background sticky top-0 z-10 -mx-4 -mt-6 mb-4 px-4 py-2"
    :class="tint[syncState]"
    role="status"
    data-testid="sync-badge"
  >
    <div class="mx-auto flex max-w-3xl items-center gap-3">
      <component
        :is="icon[syncState]"
        class="size-6 shrink-0"
        :class="{ 'animate-spin': syncState === 'saving' }"
        aria-hidden="true"
      />
      <div class="flex-1">
        <p class="text-base leading-tight font-bold" data-testid="sync-state">
          {{ fr.shell.syncState[syncState] }}
        </p>
        <p class="text-xs leading-tight opacity-90" data-testid="sync-detail">{{ detail }}</p>
      </div>
    </div>
  </div>
</template>
