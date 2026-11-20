<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { Button } from '@/components/ui/button'
import { usePeriods } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const periods = usePeriods()

onMounted(() => {
  void periods.loadPeriodIds()
})
</script>

<template>
  <!-- Minimal list shown on the home page: F7 (#34) builds the real period management page. -->
  <section class="flex flex-col gap-4">
    <h2 class="text-xl font-semibold">{{ fr.periods.title }}</h2>
    <p v-if="periods.listStatus.value === 'loading'" data-testid="periods-loading">
      {{ fr.periods.loading }}
    </p>
    <!-- The toast tells what failed (usePeriods); the page only offers to load again. -->
    <Button
      v-else-if="
        periods.listStatus.value === 'error' || periods.listStatus.value === 'misconfigured'
      "
      data-testid="periods-retry"
      @click="periods.loadPeriodIds()"
    >
      {{ fr.periods.retry }}
    </Button>
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
