<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import MisconfiguredNotice from '@/components/MisconfiguredNotice.vue'
import PeriodTable from '@/components/periods/PeriodTable.vue'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const route = useRoute('/periods/[period]')
const period = usePeriod(() => route.params.period)

const refreshMessage = computed(() => {
  switch (period.refreshStatus.value) {
    case 'up-to-date':
      return fr.period.refresh.upToDate
    case 'updated':
      return fr.period.refresh.updated
    case 'failed':
      return fr.period.refresh.failed
    default:
      return undefined
  }
})
</script>

<template>
  <!-- What a 404 page looks like is #15. -->
  <MisconfiguredNotice v-if="period.status.value === 'misconfigured'" />
  <p v-else-if="period.status.value === 'loading'" data-testid="period-loading">
    {{ fr.period.loading }}
  </p>
  <p v-else-if="period.status.value === 'not-found'" data-testid="period-not-found">
    {{ fr.period.notFound }}
  </p>
  <p v-else-if="period.status.value === 'error'" role="alert" data-testid="period-error">
    {{ fr.period.error }}
  </p>
  <div v-else class="flex flex-col gap-4">
    <div class="flex items-center gap-4">
      <h1 class="text-2xl font-semibold">{{ period.file.value?.periodName }}</h1>
      <button
        type="button"
        class="rounded border px-3 py-1 disabled:opacity-50"
        data-testid="period-refresh"
        :disabled="!period.canRefresh.value"
        @click="period.refresh()"
      >
        {{
          period.refreshStatus.value === 'refreshing'
            ? fr.period.refresh.refreshing
            : fr.period.refresh.button
        }}
      </button>
    </div>
    <p
      v-if="refreshMessage"
      :role="period.refreshStatus.value === 'failed' ? 'alert' : 'status'"
      data-testid="period-refresh-result"
    >
      {{ refreshMessage }}
    </p>
    <div v-if="period.isReadOnly.value" role="status" data-testid="period-read-only">
      <p>{{ fr.period.readOnlyNotice }}</p>
      <ul class="list-disc pl-6">
        <li v-for="problem in period.problems.value" :key="problem">
          {{ fr.period.problems[problem] }}
        </li>
      </ul>
    </div>
    <PeriodTable :period-id="route.params.period" />
  </div>
</template>
