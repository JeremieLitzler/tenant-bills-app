<script setup lang="ts">
import { useRoute } from 'vue-router'

import MonthForm from '@/components/periods/MonthForm.vue'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const route = useRoute('/periods/[period]/months/[month]')
// Loads the period; the form reads it back from the shared state. What a 404 looks like is #15.
const period = usePeriod(() => route.params.period)
</script>

<template>
  <p v-if="period.status.value === 'loading'" data-testid="period-loading">
    {{ fr.period.loading }}
  </p>
  <p v-else-if="period.status.value !== 'ready'" role="alert" data-testid="period-error">
    {{ fr.period.error }}
  </p>
  <MonthForm v-else :period-id="route.params.period" :month="route.params.month" />
</template>
