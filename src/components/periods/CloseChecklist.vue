<script setup lang="ts">
// The state of each condition of closing a period, shown once the twelfth month exists.
import type { SectionName } from '@/domain/periodFile'
import IconCircleCheck from '@/components/icons/IconCircleCheck.vue'
import IconCircleX from '@/components/icons/IconCircleX.vue'
import { fr } from '@/i18n/fr'

import { monthLabel } from './periodLines'

defineProps<{
  checks: Record<string, boolean>
  incompleteMonths: { month: string; sections: string[] }[]
}>()
const t = fr.period.closeChecks
</script>

<template>
  <section class="flex flex-col gap-1" data-testid="close-checks">
    <h2 class="text-lg font-semibold">{{ t.title }}</h2>
    <ul>
      <li
        v-for="(ok, key) in checks"
        :key="key"
        class="flex items-start gap-2"
        :data-testid="`close-check-${key}`"
        :data-ok="ok"
      >
        <IconCircleCheck
          v-if="ok"
          class="text-theme-success mt-1 size-4 shrink-0"
          aria-hidden="true"
        />
        <IconCircleX v-else class="text-theme-error mt-1 size-4 shrink-0" aria-hidden="true" />
        <span class="sr-only">{{ ok ? t.yes : t.no }} :</span>
        <div>
          {{ t[key as keyof typeof t] }}
          <ul
            v-if="key === 'allComplete' && !ok"
            class="list-disc pl-6 text-sm"
            data-testid="close-check-incomplete-months"
          >
            <li v-for="m in incompleteMonths" :key="m.month">
              {{ monthLabel(m.month) }} :
              {{ m.sections.map((s) => fr.period.table.sections[s as SectionName]).join(', ') }}
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </section>
</template>
