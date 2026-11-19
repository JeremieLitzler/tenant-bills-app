<script setup lang="ts">
// "Saisie du mois" (F6): the month's inputs as native fields that save on blur, then its computed
// figures read-only. Like the table, it only reads the period; every edit goes through `setCell`.
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

import {
  editText,
  formatValue,
  isEditableLine,
  isInactiveTariffLine,
  LINES,
  parseValue,
  SECTIONS,
} from './periodLines'

const props = defineProps<{ periodId: string; month: string }>()
const router = useRouter()
const { file, figures, isReadOnly, setCell } = usePeriod(() => props.periodId)

const index = computed(
  () => file.value?.months.findIndex((entry) => entry.month === props.month) ?? -1,
)
const entry = computed(() => file.value?.months[index.value])
const monthFigures = computed(() => figures.value?.months[index.value])
const canEdit = computed(() => !isReadOnly.value && !file.value?.closedOn)

// The lines the month shows: its inputs and figures, minus the lines of the inactive tariff mode.
const sections = computed(() =>
  SECTIONS.map((section) => ({
    ...section,
    lines: LINES.filter(
      (line) =>
        line.section === section.id && !!entry.value && !isInactiveTariffLine(line, entry.value),
    ),
  })),
)

const valueOf = (line: (typeof LINES)[number]) => line.read(entry.value!, monthFigures.value!)

// An index below the previous one is flagged, never refused.
function isDecreasing(line: (typeof LINES)[number]): boolean {
  const previous = LINES.find((other) => other.id === `${line.id}Previous`)
  const [current, before] = [valueOf(line), previous && valueOf(previous)]
  return typeof current === 'number' && typeof before === 'number' && current < before
}

const inputMode = (kind: string) =>
  kind === 'int' ? 'numeric' : kind === 'text' || kind === 'date' ? undefined : 'decimal'

const invalid = ref(new Set<string>())

// Unchanged saves nothing, emptying removes the value, a text that is no value is marked.
function onBlur(line: (typeof LINES)[number], event: FocusEvent) {
  const field = event.target as HTMLInputElement
  const stored = valueOf(line)
  const unchanged =
    field.value === (line.kind === 'date' ? String(stored ?? '') : editText(line, stored))
  invalid.value.delete(line.id)
  if (unchanged) return
  // A native date input already gives the stored "YYYY-MM-DD".
  const value = line.kind === 'date' ? field.value || null : parseValue(line, field.value)
  if (value === undefined) {
    invalid.value.add(line.id)
    return
  }
  void setCell(props.month, line.id, value)
}
</script>

<template>
  <p v-if="file && !entry" data-testid="month-not-found">{{ fr.period.month.notFound }}</p>
  <form v-else-if="file && entry && monthFigures" class="flex flex-col gap-4" @submit.prevent>
    <h2 class="text-xl font-semibold">{{ fr.period.month.title }}</h2>
    <label class="flex flex-col gap-1">
      {{ fr.period.month.picker }}
      <select
        class="rounded border px-2 py-1"
        data-testid="month-picker"
        :value="month"
        @change="router.push(`/periods/${periodId}/${($event.target as HTMLSelectElement).value}`)"
      >
        <option v-for="m in file.months" :key="m.month" :value="m.month">{{ m.month }}</option>
      </select>
    </label>
    <RouterLink :to="`/periods/${periodId}`" data-testid="to-table">{{
      fr.period.month.toTable
    }}</RouterLink>
    <fieldset v-for="section in sections" :key="section.id" class="flex flex-col gap-2">
      <legend class="font-semibold">{{ section.label }}</legend>
      <template v-for="line in section.lines" :key="line.id">
        <div v-if="line.computed" class="flex justify-between" :data-testid="`figure-${line.id}`">
          <span>{{ line.label }}</span>
          <output class="font-medium tabular-nums">{{
            valueOf(line) === undefined
              ? fr.period.table.empty
              : formatValue(line.kind, valueOf(line)!)
          }}</output>
        </div>
        <template v-else>
          <label class="flex flex-col gap-1">
            {{ line.label }}
            <input
              class="rounded border px-2 py-1"
              :data-testid="`field-${line.id}`"
              :type="line.kind === 'date' ? 'date' : 'text'"
              :inputmode="inputMode(line.kind)"
              :value="
                line.kind === 'date' ? String(valueOf(line) ?? '') : editText(line, valueOf(line))
              "
              :disabled="!canEdit || !isEditableLine(line, entry)"
              :aria-invalid="invalid.has(line.id)"
              @blur="onBlur(line, $event)"
            />
          </label>
          <p v-if="invalid.has(line.id)" role="alert" class="text-destructive text-sm">
            {{ fr.period.month.invalid }}
          </p>
          <p
            v-else-if="isDecreasing(line)"
            role="status"
            class="text-sm text-amber-600"
            :data-testid="`warning-${line.id}`"
          >
            {{ fr.period.month.decreasingIndex }}
          </p>
        </template>
      </template>
    </fieldset>
  </form>
</template>
