<script setup lang="ts">
// The period table (F5): one row per line, one column per month present in the file. It only reads
// the period; every edit goes through `setCell` and the patch queue (ADR 0010).
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { applyOffer, type Offer } from '@/domain/applyOffer'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

import ApplyDialog from './ApplyDialog.vue'
import PeriodCell from './PeriodCell.vue'
import { editText, formatValue, isEditableLine, LINES, parseValue, SECTIONS } from './periodLines'

const props = defineProps<{ periodId: string }>()
const { file, figures, isReadOnly, setCell } = usePeriod(() => props.periodId)

// "2026-09" as "septembre 2026". Read in UTC so the local time zone cannot shift the month.
function monthLabel(month: string): string {
  const [year, number] = month.split('-').map(Number)
  return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// A read-only file can hold malformed entries: show only those with a month.
const columns = computed(() =>
  (file.value?.months ?? [])
    .map((entry, index) => ({ entry, figures: figures.value?.months[index] }))
    .filter(({ entry }) => typeof entry?.month === 'string')
    .map(({ entry, figures }) => ({
      month: entry.month,
      label: monthLabel(entry.month),
      entry,
      figures,
    })),
)

// Selection mode (F5): the container is the single Tab stop; the selected cell is its active descendant.
const rowIndexes = new Map(LINES.map((line, index) => [line.id, index]))
const rowOf = (line: (typeof LINES)[number]) => rowIndexes.get(line.id)!
const row = ref(0)
const col = ref(0)
const cellId = (rowIndex: number, colIndex: number) =>
  `${props.periodId}-cell-${rowIndex}-${colIndex}`
// The id and selected state of a cell, both derived from its position.
const cellProps = (line: (typeof LINES)[number], colIndex: number) => ({
  id: cellId(rowOf(line), colIndex),
  selected: rowOf(line) === row.value && colIndex === col.value,
  editing: editing.value && rowOf(line) === row.value && colIndex === col.value,
  invalid: invalid.value && rowOf(line) === row.value && colIndex === col.value,
})
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function select(rowIndex: number, colIndex: number) {
  const nextRow = Math.max(0, Math.min(LINES.length - 1, rowIndex))
  const nextCol = Math.max(0, Math.min(columns.value.length - 1, colIndex))
  // Leaving a cell being edited saves it.
  if (editing.value && (nextRow !== row.value || nextCol !== col.value)) stopEditing(true)
  row.value = nextRow
  col.value = nextCol
}

// Edit mode (F5). `initial` is the text the editor started with: an unchanged text saves nothing.
const editing = ref(false)
const draft = ref('')
const initial = ref('')
const invalid = ref(false)
watch([draft, row, col], () => (invalid.value = false))

const isEditable = (rowIndex: number, colIndex: number) =>
  !isReadOnly.value &&
  !file.value?.closedOn &&
  !!columns.value[colIndex] &&
  isEditableLine(LINES[rowIndex], columns.value[colIndex].entry)

function textAt(rowIndex: number, colIndex: number) {
  const { entry, figures } = columns.value[colIndex]
  return editText(LINES[rowIndex], LINES[rowIndex].read(entry, figures!))
}

function startEditing(rowIndex: number, colIndex: number, typed?: string) {
  initial.value = textAt(rowIndex, colIndex)
  draft.value = typed ?? initial.value
  editing.value = true
}

// Queues the edited cell. Emptying removes the value (`null`); a text that is no valid value is dropped.
// Returns false for a text that is no valid value: nothing is queued.
function save(): boolean {
  if (draft.value === initial.value) return true
  const line = LINES[row.value]
  const value = parseValue(line, draft.value)
  if (value === undefined) return false
  const month = columns.value[col.value].month
  void setCell(month, line.id, value)
  // Case 8: a value of a month with later months may be applied to them (a removal is not offered).
  const found = value === null ? undefined : applyOffer(file.value!, month, line.id, value)
  if (found && value !== null) {
    offer.value = {
      ...found,
      section: fr.period.table.sections[line.section],
      line: line.label,
      value: formatValue(line.kind, value),
    }
  }
  return true
}

// The apply dialog (Case 8): "Oui" queues every patch of the offer, anything else changes nothing more.
const offer = ref<(Offer & { section: string; line: string; value: string }) | undefined>()
function answer(yes: boolean) {
  if (yes && offer.value)
    for (const p of offer.value.patches) void setCell(p.month, p.field, p.value)
  offer.value = undefined
}

function stopEditing(saveIt: boolean) {
  if (saveIt) save()
  editing.value = false
}

// Going to a period with fewer months: the selected cell may not exist there, start from the first.
// Zero columns is a loading state, not a shorter period.
watch(
  () => columns.value.length,
  (count) => {
    if (count > 0 && col.value >= count) select(0, 0)
  },
)

function onEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    stopEditing(false)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    // An invalid text keeps the editor open, marked; leaving the cell any other way drops it.
    // shortcut: a red ring, until the global toast (#120) warns instead.
    if (!save()) {
      invalid.value = true
      return
    }
    // The next editable cell down in the same month, else back to selection mode.
    let next = row.value + 1
    while (next < LINES.length && !isEditable(next, col.value)) next++
    if (next < LINES.length) {
      row.value = next
      startEditing(next, col.value)
    } else editing.value = false
  } else return
  // The input is gone: keep the keyboard on the table.
  if (!editing.value) (event.currentTarget as HTMLElement).focus()
}

function onKeydown(event: KeyboardEvent) {
  // Edit mode keeps the arrows for the text cursor.
  if (editing.value) return onEditKeydown(event)
  const move = MOVES[event.key]
  if (move) {
    event.preventDefault()
    select(row.value + move[0], col.value + move[1])
  } else if (
    event.key === 'Enter' ||
    (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey)
  ) {
    // Enter edits the value; typing a character replaces it.
    event.preventDefault()
    if (isEditable(row.value, col.value)) {
      startEditing(row.value, col.value, event.key === 'Enter' ? undefined : event.key)
    }
  }
}

// Leaving the cell any other way than the keys saves it.
function onBlur(rowIndex: number, colIndex: number, event: FocusEvent) {
  if (!editing.value || rowIndex !== row.value || colIndex !== col.value) return
  const table = (event.target as HTMLElement).closest<HTMLElement>('[role=grid]')
  stopEditing(true)
  // The input is gone: unless the focus went to another element (Tab, a click on a field), the
  // keyboard stays on the table, on the edited cell.
  if (!event.relatedTarget) table?.focus()
}

function onDblclick(rowIndex: number, colIndex: number) {
  select(rowIndex, colIndex)
  if (isEditable(rowIndex, colIndex)) startEditing(rowIndex, colIndex)
}

watch([row, col], async () => {
  await nextTick()
  document
    .getElementById(cellId(row.value, col.value))
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
})
</script>

<template>
  <div v-if="file && figures" class="group flex flex-col gap-2">
    <!-- Kept in the layout when hidden so the table does not jump when a click gives it the focus. -->
    <p
      id="period-table-hint"
      class="text-muted-foreground invisible text-sm group-has-[:focus-visible]:visible"
    >
      {{ fr.period.table.keyboardHint }}
    </p>
    <!-- Tab leaves the table because no cell is a focus stop of its own: keep it so when cells get edited. -->
    <Table
      data-testid="period-table"
      role="grid"
      tabindex="0"
      aria-describedby="period-table-hint"
      :aria-activedescendant="cellId(row, col)"
      @keydown="onKeydown"
      container-class="focus-visible:outline-ring/50 focus-visible:outline-2 focus-visible:outline-offset-2 max-h-[calc(100vh-8rem)] overflow-auto scroll-pt-10 scroll-pl-40 max-md:scroll-pl-32 [container-type:inline-size] max-md:[scrollbar-width:none] max-md:snap-x max-md:snap-mandatory"
      class="w-max min-w-full border-separate border-spacing-0 [&_td]:snap-start max-md:[&_td]:w-[calc(100cqw-8rem)] max-md:[&_td]:whitespace-normal"
    >
      <TableHeader>
        <TableRow>
          <TableHead
            class="bg-background sticky top-0 left-0 z-30 w-40 min-w-40 max-md:w-32 max-md:min-w-32 max-md:whitespace-normal"
            >{{ fr.period.table.label }}</TableHead
          >
          <TableHead
            v-for="column in columns"
            :key="column.month"
            class="bg-background sticky top-0 z-20 snap-start"
            data-testid="period-month"
          >
            <RouterLink
              :to="`/periods/${periodId}/months/${column.month}`"
              class="underline"
              :aria-label="`${fr.period.month.title} ${column.label}`"
              >{{ column.label }}</RouterLink
            >
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-for="section in SECTIONS" :key="section.id">
          <TableRow class="bg-muted" :data-testid="`section-${section.id}`">
            <TableHead :colspan="columns.length + 1" class="bg-muted">
              <span class="sticky left-2">{{ section.label }}</span>
            </TableHead>
          </TableRow>
          <TableRow
            v-for="line in LINES.filter((l) => l.section === section.id)"
            :key="line.id"
            role="row"
            :data-testid="`line-${line.id}`"
          >
            <TableHead
              scope="row"
              class="bg-background sticky left-0 z-10 w-40 min-w-40 max-md:w-32 max-md:min-w-32 max-md:whitespace-normal"
              >{{ line.label }}</TableHead
            >
            <PeriodCell
              v-for="(column, colIndex) in columns"
              :key="column.month"
              v-bind="cellProps(line, colIndex)"
              :line="line"
              :entry="column.entry"
              :figures="column.figures"
              v-model:draft="draft"
              @click="select(rowOf(line), colIndex)"
              @dblclick="onDblclick(rowOf(line), colIndex)"
              @blur="onBlur(rowOf(line), colIndex, $event)"
            />
          </TableRow>
        </template>
      </TableBody>
    </Table>
    <ApplyDialog
      :offer="offer"
      :section="offer?.section ?? ''"
      :line="offer?.line ?? ''"
      :value="offer?.value ?? ''"
      @answer="answer"
    />
  </div>
</template>
