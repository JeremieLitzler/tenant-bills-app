<script setup lang="ts">
// "Saisie du mois" (F6): the month's inputs as native fields that save on blur, then its computed
// figures read-only. Like the table, it only reads the period; every edit goes through `setCell`.
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { applyOffer, type Offer } from '@/domain/applyOffer'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

import ApplyDialog from './ApplyDialog.vue'
import {
  fieldText,
  formatValue,
  inputMode,
  isDecreasingIndex,
  isEditableLine,
  isInactiveTariffLine,
  LINES,
  parseField,
  type PeriodLine,
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

const valueOf = (line: PeriodLine) => line.read(entry.value!, monthFigures.value!)

const invalid = ref(new Set<string>())

// Unchanged saves nothing, emptying removes the value, a text that is no value is marked.
function onBlur(line: PeriodLine, event: FocusEvent) {
  const field = event.target as HTMLInputElement
  invalid.value.delete(line.id)
  if (field.value === fieldText(line, valueOf(line))) return
  const value = parseField(line, field.value)
  if (value === undefined) {
    invalid.value.add(line.id)
    return
  }
  void setCell(props.month, line.id, value)
  // Case 8: a value of a month with later months may be applied to them (a removal is not offered).
  const found = value === null ? undefined : applyOffer(file.value!, props.month, line.id, value)
  if (found && value !== null) {
    offer.value = {
      ...found,
      section: fr.period.table.sections[line.section],
      line: line.label,
      value: formatValue(line.kind, value),
    }
  }
}

// The apply dialog (Case 8): "Oui" queues every patch of the offer, anything else changes nothing more.
const offer = ref<(Offer & { section: string; line: string; value: string }) | undefined>()
function answer(yes: boolean) {
  if (yes && offer.value)
    for (const p of offer.value.patches) void setCell(p.month, p.field, p.value)
  offer.value = undefined
}
</script>

<template>
  <p v-if="file && !entry" data-testid="month-not-found">{{ fr.period.month.notFound }}</p>
  <form
    v-else-if="file && entry && monthFigures"
    class="mx-auto flex w-full max-w-lg flex-col gap-4 md:rounded-lg md:border md:p-6 md:shadow-sm"
    @submit.prevent
  >
    <!-- Stays in view while the form scrolls. -->
    <Button
      :as="RouterLink"
      accent
      :to="`/periods/${periodId}`"
      class="sticky top-2 z-10 inline-flex items-center gap-2 self-start"
      data-testid="to-table"
    >
      <span aria-hidden="true">&lt;</span>
      {{ fr.period.month.toTable }}
    </Button>
    <h2 class="text-xl font-semibold">{{ fr.period.month.title }}</h2>
    <label class="flex flex-col gap-1">
      {{ fr.period.month.picker }}
      <select
        class="rounded border px-2 py-1"
        data-testid="month-picker"
        :value="month"
        @change="
          router.push(`/periods/${periodId}/months/${($event.target as HTMLSelectElement).value}`)
        "
      >
        <option v-for="m in file.months" :key="m.month" :value="m.month">{{ m.month }}</option>
      </select>
    </label>
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
              :class="{ 'ring-destructive ring-2': invalid.has(line.id) }"
              :data-testid="`field-${line.id}`"
              :type="line.kind === 'date' ? 'date' : 'text'"
              :inputmode="inputMode(line.kind)"
              :value="fieldText(line, valueOf(line))"
              :disabled="!canEdit || !isEditableLine(line, entry)"
              :aria-invalid="invalid.has(line.id)"
              @blur="onBlur(line, $event)"
            />
          </label>
          <p v-if="invalid.has(line.id)" role="alert" class="text-destructive text-sm">
            {{ fr.period.month.invalid }}
          </p>
          <p
            v-else-if="isDecreasingIndex(line, entry, monthFigures)"
            role="status"
            class="text-sm text-theme-warning"
            :data-testid="`warning-${line.id}`"
          >
            {{ fr.period.month.decreasingIndex }}
          </p>
        </template>
      </template>
    </fieldset>
    <ApplyDialog
      :offer="offer"
      :section="offer?.section ?? ''"
      :line="offer?.line ?? ''"
      :value="offer?.value ?? ''"
      @answer="answer"
    />
  </form>
</template>
