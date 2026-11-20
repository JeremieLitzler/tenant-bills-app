<script setup lang="ts">
// PROTOTYPE (#124) — three variants of the read-only period table and of the "Saisie du mois" form,
// switchable with ?page= and ?variant= or the floating bar. State is in memory.
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { computed, onBeforeUnmount } from 'vue'

import FormA from './FormA.vue'
import FormB from './FormB.vue'
import FormC from './FormC.vue'
import TableA from './TableA.vue'
import TableB from './TableB.vue'
import TableC from './TableC.vue'
import { file, sectionStatus, url } from './state'

const VARIANTS = {
  table: { A: TableA, B: TableB, C: TableC },
  form: { A: FormA, B: FormB, C: FormC },
} as const
const keys = ['A', 'B', 'C'] as const
const current = computed(
  () => VARIANTS[url.page as 'table' | 'form'][url.variant as (typeof keys)[number]] ?? TableA,
)

function cycle(step: number) {
  const i = keys.indexOf(url.variant as (typeof keys)[number])
  url.variant = keys[(i + step + keys.length) % keys.length]!
}
function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable], [role=tablist]')) return
  if (e.key === 'ArrowLeft') cycle(-1)
  if (e.key === 'ArrowRight') cycle(1)
}
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// Surface the state: each month's section statuses, as the form's icons judge them.
const statuses = computed(() =>
  file.months.map((m) => ({
    month: m.month,
    sections: Object.fromEntries(
      ['waterConsumption', 'waterTreatment', 'waterSoftener', 'electricity', 'internet', 'heatPumpMaintenance'].map(
        (s) => [s, sectionStatus(m.month, s as never)],
      ),
    ),
  })),
)
</script>

<template>
  <div class="mx-auto flex max-w-screen-2xl flex-col gap-4 p-4 pb-28">
    <header class="flex flex-wrap items-center gap-4">
      <h1 class="text-2xl font-semibold">{{ file.periodName }}</h1>
      <template v-if="url.page === 'form'">
        <span class="text-muted-foreground">Saisie du mois</span>
        <select v-model="url.month" class="rounded border px-2 py-1">
          <option v-for="m in file.months" :key="m.month" :value="m.month">{{ m.month }}</option>
        </select>
        <button type="button" class="underline" @click="url.page = 'table'">Retour au tableau</button>
      </template>
    </header>

    <component :is="current" :key="`${url.page}${url.variant}`" />

    <details class="text-muted-foreground mt-8 text-xs">
      <summary>État (statuts des sections par mois)</summary>
      <pre>{{ statuses }}</pre>
    </details>
  </div>

  <!-- Prototype switcher, not part of the design. -->
  <div
    class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-3 py-2 text-sm text-white shadow-lg"
  >
    <button type="button" class="rounded-full px-2 py-1 hover:bg-white/20" @click="url.page = url.page === 'table' ? 'form' : 'table'">
      {{ url.page === 'table' ? 'Tableau' : 'Saisie' }}
    </button>
    <span class="opacity-40">|</span>
    <button type="button" aria-label="Variante précédente" @click="cycle(-1)"><ChevronLeft class="size-4" /></button>
    <span class="min-w-56 text-center">{{ url.variant }} ({{ current.name }})</span>
    <button type="button" aria-label="Variante suivante" @click="cycle(1)"><ChevronRight class="size-4" /></button>
  </div>
</template>
