<script setup lang="ts">
// The state of each condition of closing a period, shown once the twelfth month exists.
import IconCircleCheck from '@/components/icons/IconCircleCheck.vue'
import IconCircleX from '@/components/icons/IconCircleX.vue'
import { fr } from '@/i18n/fr'

defineProps<{ checks: Record<string, boolean> }>()
const t = fr.period.closeChecks
</script>

<template>
  <section class="flex flex-col gap-1" data-testid="close-checks">
    <h2 class="text-lg font-semibold">{{ t.title }}</h2>
    <ul>
      <li
        v-for="(ok, key) in checks"
        :key="key"
        class="flex items-center gap-2"
        :data-testid="`close-check-${key}`"
        :data-ok="ok"
      >
        <IconCircleCheck v-if="ok" class="text-theme-success size-4 shrink-0" aria-hidden="true" />
        <IconCircleX v-else class="text-theme-error size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">{{ ok ? 'Oui' : 'Non' }} :</span>
        {{ t[key as keyof typeof t] }}
      </li>
    </ul>
  </section>
</template>
