<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const route = useRoute('/periods/[period]')
const period = usePeriod(() => route.params.period)

// "2026-09" as "septembre 2026". Read in UTC so the local time zone cannot shift the month.
function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const months = computed(() =>
  (period.file.value?.months ?? []).map((entry) => ({
    key: entry.month,
    label: monthLabel(entry.month),
  })),
)
</script>

<template>
  <!-- Placeholder view: F5 (#32) builds the period table. What a 404 page looks like is #15. -->
  <p v-if="period.status.value === 'loading'" data-testid="period-loading">
    {{ fr.period.loading }}
  </p>
  <p v-else-if="period.status.value === 'not-found'" data-testid="period-not-found">
    {{ fr.period.notFound }}
  </p>
  <p v-else-if="period.status.value === 'error'" role="alert" data-testid="period-error">
    {{ fr.period.error }}
  </p>
  <div v-else class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">{{ period.file.value?.periodName }}</h1>
    <div v-if="period.isReadOnly.value" role="status" data-testid="period-read-only">
      <p>{{ fr.period.readOnlyNotice }}</p>
      <ul class="list-disc pl-6">
        <li v-for="problem in period.problems.value" :key="problem">
          {{ fr.period.problems[problem] }}
        </li>
      </ul>
    </div>
    <ul data-testid="period-months" class="flex flex-col gap-1">
      <li v-for="month in months" :key="month.key">{{ month.label }}</li>
    </ul>
  </div>
</template>
