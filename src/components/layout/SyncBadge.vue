<script setup lang="ts">
import { usePeriods } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const { pendingCount, syncState } = usePeriods()
</script>

<template>
  <p class="mb-4 flex flex-wrap items-center gap-3 text-sm" data-testid="sync-badge">
    <span data-testid="sync-pending">{{ fr.shell.pending(pendingCount) }}</span>
    <span data-testid="sync-state">{{ fr.shell.syncState[syncState] }}</span>
  </p>
</template>
