<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import MisconfiguredNotice from '@/components/MisconfiguredNotice.vue'
import { usePeriods } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const periods = usePeriods()

onMounted(() => {
  void periods.loadPeriodIds()
})
</script>

<template>
  <!-- Minimal list shown on the home page: F7 (#34) builds the real period management page. -->
  <MisconfiguredNotice v-if="periods.listStatus.value === 'misconfigured'" />
  <section v-else class="flex flex-col gap-4">
    <h2 class="text-xl font-semibold">{{ fr.periods.title }}</h2>
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
