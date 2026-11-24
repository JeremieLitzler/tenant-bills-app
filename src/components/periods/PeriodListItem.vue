<script setup lang="ts">
import { RouterLink } from 'vue-router'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const props = defineProps<{ id: string }>()

// Closed is read from the file (docs/period-file.md), so each row loads its period.
// shortcut: one full load per row; a status without a per-file fetch is planned in a new issue
// (docs/implementation-feedbacks/2026-11-24-issue-80/NEW-ISSUE-status-without-fetch.md).
const { file, status } = usePeriod(() => props.id)
</script>

<template>
  <li class="flex items-center gap-3">
    <RouterLink :to="`/periods/${id}`" class="underline">{{ id }}</RouterLink>
    <span v-if="file" data-testid="period-status">
      {{ file.closedOn ? fr.periods.closed : fr.periods.open }}
    </span>
    <span v-else-if="status === 'loading'" data-testid="period-status">…</span>
    <span
      v-else
      class="text-theme-warning flex items-center gap-1 text-sm"
      data-testid="period-status"
    >
      <IconTriangleAlert class="size-4" aria-hidden="true" />
      {{ fr.periods.noStatus }}
    </span>
  </li>
</template>
