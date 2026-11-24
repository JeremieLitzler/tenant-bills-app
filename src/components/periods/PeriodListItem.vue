<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const props = defineProps<{ id: string }>()

// Closed is read from the file (docs/period-file.md): the status needs the period loaded.
const { file } = usePeriod(() => props.id)
</script>

<template>
  <li class="flex gap-3">
    <RouterLink :to="`/periods/${id}`" class="underline">{{ id }}</RouterLink>
    <span v-if="file" data-testid="period-status">
      {{ file.closedOn ? fr.periods.closed : fr.periods.open }}
    </span>
  </li>
</template>
