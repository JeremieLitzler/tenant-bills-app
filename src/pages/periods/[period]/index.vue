<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'

import PeriodTable from '@/components/periods/PeriodTable.vue'
import { Button } from '@/components/ui/button'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const route = useRoute('/periods/[period]/')
const period = usePeriod(() => route.params.period, { checkRemote: true })

// Demo of #48 until F5 (#32) builds the table: `setCell('2026-09', 'internet.billedAmount', 21)`
// in the browser console edits the open period. Development only; remove with the table's arrival.
if (import.meta.env.DEV) {
  window.setCell = period.setCell
  onBeforeUnmount(() => delete window.setCell)
}
</script>

<template>
  <!-- What a 404 page looks like is #15. -->
  <p v-if="period.status.value === 'loading'" data-testid="period-loading">
    {{ fr.period.loading }}
  </p>
  <p v-else-if="period.status.value === 'not-found'" data-testid="period-not-found">
    {{ fr.period.notFound }}
  </p>
  <!-- The toast tells what failed (usePeriod); the page only offers to load again. -->
  <div v-else-if="period.status.value === 'error' || period.status.value === 'misconfigured'">
    <Button data-testid="period-retry" @click="period.retry()">{{ fr.period.retry }}</Button>
  </div>
  <div v-else class="flex flex-col gap-4">
    <div class="flex items-center gap-4">
      <Button :as="RouterLink" to="/" data-testid="period-back">{{ fr.period.back }}</Button>
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
    <div
      v-if="period.isReadOnly.value"
      role="status"
      data-testid="period-read-only"
      class="border-theme-warning bg-theme-warning/10 text-foreground flex items-start gap-3 rounded-lg border p-3"
    >
      <IconTriangleAlert class="text-theme-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p>{{ fr.period.readOnlyNotice }}</p>
        <ul class="list-disc pl-6">
          <li v-for="problem in period.problems.value" :key="problem">
            {{ fr.period.problems[problem] }}
          </li>
        </ul>
      </div>
    </div>
    <Button
      v-if="period.nextMonth.value === 'available'"
      accent
      class="self-start"
      data-testid="initialize-month"
      @click="period.initializeNextMonth()"
    >
      {{ fr.period.initializeMonth.button }}
    </Button>
    <div
      v-else-if="period.nextMonth.value === 'incomplete'"
      role="status"
      data-testid="initialize-month-incomplete"
      class="border-theme-warning bg-theme-warning/10 text-foreground flex items-start gap-3 rounded-lg border p-3"
    >
      <IconTriangleAlert class="text-theme-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p>{{ fr.period.initializeMonth.incomplete }}</p>
    </div>
    <PeriodTable :period-id="route.params.period" />
  </div>
</template>
