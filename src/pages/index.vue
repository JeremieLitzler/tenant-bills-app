<script setup lang="ts">
import PeriodList from '@/components/periods/PeriodList.vue'
import { usePeriods } from '@/composables/usePeriods'

const periods = usePeriods()
</script>

<template>
  <!-- Placeholder: / will redirect to the current period (issues #75 and #79). -->
  <div class="flex flex-col gap-6">
    <h1 v-if="periods.listStatus.value !== 'misconfigured'" class="text-2xl font-semibold">
      Bienvenue
    </h1>
    <PeriodList />
  </div>
</template>
