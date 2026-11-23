<script setup lang="ts">
// Tells a closed period is read-only (its cells and the month form's inputs are locked).
import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
import { fr } from '@/i18n/fr'

import { formatValue } from './periodLines'

defineProps<{ closedOn: string }>()
</script>

<template>
  <div
    role="status"
    data-testid="period-closed"
    class="border-theme-warning bg-theme-warning/10 text-foreground flex items-start gap-3 rounded-lg border p-3"
  >
    <IconTriangleAlert class="text-theme-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
    <p>{{ fr.period.closedNotice(formatValue('date', closedOn)) }}</p>
  </div>
</template>
