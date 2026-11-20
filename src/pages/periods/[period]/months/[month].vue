<script setup lang="ts">
import { useRoute } from 'vue-router'

import MonthForm from '@/components/periods/MonthForm.vue'
import { Button } from '@/components/ui/button'
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
  <p v-else-if="period.status.value === 'not-found'" data-testid="period-not-found">
    {{ fr.period.notFound }}
  </p>
  <div v-else-if="period.status.value === 'error' || period.status.value === 'misconfigured'">
    <Button data-testid="period-retry" @click="period.retry()">{{ fr.period.retry }}</Button>
  </div>
  <MonthForm v-else :period-id="route.params.period" :month="route.params.month" />
</template>
