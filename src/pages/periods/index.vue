<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { usePeriods } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const periods = usePeriods()

onMounted(() => {
  void periods.loadPeriodIds()
})
</script>

<template>
  <!-- Minimal list: F7 (#34) builds the real period management page. -->
  <section class="flex flex-col gap-4">
    <h1 class="text-2xl font-semibold">{{ fr.periods.title }}</h1>
    <p v-if="periods.listStatus.value === 'loading'" data-testid="periods-loading">
      {{ fr.periods.loading }}
    </p>
    <p v-else-if="periods.listStatus.value === 'error'" role="alert" data-testid="periods-error">
      {{ fr.periods.error }}
    </p>
    <p
      v-else-if="periods.listStatus.value === 'ready' && periods.periodIds.value.length === 0"
      data-testid="periods-empty"
    >
      {{ fr.periods.empty }}
    </p>
    <ul v-else class="flex flex-col gap-2">
      <li v-for="id in periods.periodIds.value" :key="id">
        <RouterLink :to="`/periods/${id}`" class="underline">{{ id }}</RouterLink>
      </li>
    </ul>
  </section>
</template>
