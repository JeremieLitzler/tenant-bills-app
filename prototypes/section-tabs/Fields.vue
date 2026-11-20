<script setup lang="ts">
// PROTOTYPE (#124) — the fields of one section for one month, editing the in-memory period so the
// icons react. Computed lines are shown read-only after the inputs.
import {
  fieldText,
  inputMode,
  isInactiveTariffLine,
  parseField,
  type PeriodLine,
} from '@/components/periods/periodLines'
import type { SectionName } from '@/domain/periodFile'

import { cellText, entryOf, figuresOf, linesOf } from './state'

const props = defineProps<{ section: SectionName; month: string; columns?: string }>()

function save(line: PeriodLine, text: string) {
  const value = parseField(line, text)
  if (value === undefined) return
  const bag = entryOf(props.month)[props.section] as Record<string, unknown>
  const key = line.id.split('.')[1]!
  if (value === null) delete bag[key]
  else bag[key] = value
}
</script>

<template>
  <div class="grid gap-3" :class="columns ?? 'sm:grid-cols-2'">
    <template v-for="line in linesOf(section)" :key="line.id">
      <label
        v-if="!line.computed && !isInactiveTariffLine(line, entryOf(month))"
        class="flex flex-col gap-1 text-sm"
      >
        <span>{{ line.label }}</span>
        <input
          class="rounded border px-2 py-1"
          :class="{ 'border-amber-500 bg-amber-50 dark:bg-amber-900/30': figuresOf(month).warnings[line.id] }"
          :type="line.kind === 'date' ? 'date' : 'text'"
          :inputmode="inputMode(line.kind)"
          :value="fieldText(line, line.read(entryOf(month), figuresOf(month)))"
          @change="save(line, ($event.target as HTMLInputElement).value)"
        />
      </label>
    </template>
  </div>
  <dl class="text-muted-foreground mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
    <template v-for="line in linesOf(section).filter((l) => l.computed)" :key="line.id">
      <div class="flex justify-between gap-2 border-b py-1">
        <dt>{{ line.label }}</dt>
        <dd class="tabular-nums">{{ cellText(line, entryOf(month), figuresOf(month)) }}</dd>
      </div>
    </template>
  </dl>
</template>
