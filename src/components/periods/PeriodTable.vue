<script setup lang="ts">
// The period table (F5): one row per line, one column per month present in the file. It only reads
// the period; a month is edited in its form ("Saisie du mois").
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import IconChevronDown from '@/components/icons/IconChevronDown.vue'

import { useOpenSections } from '@/composables/useOpenSections'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

import PeriodCell from './PeriodCell.vue'
import { formatValue, LINES, type PeriodLine, SECTIONS } from './periodLines'

const props = defineProps<{ periodId: string }>()
const router = useRouter()
const { file, figures } = usePeriod(() => props.periodId)
const { isOpen, setOpen, openQuery, toQuery, open } = useOpenSections()

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

// The total column's text: empty for a line without a total, a dash when a month is uncomputable.
function totalText(line: PeriodLine): string {
  if (!line.total || !figures.value) return ''
  const total = line.total(figures.value.totals)
  return total === undefined ? fr.period.table.empty : formatValue(line.kind, total)
}

// Selection mode (F5): the container is the single Tab stop; the selected cell is its active descendant.
// The rows in display order: the common lines, then per section its header row and its lines. The
// lines of a closed section are not shown, so the arrows skip them.
type Row = { key: string; line?: PeriodLine; section?: string }
const ROWS: Row[] = SECTIONS.flatMap((section) => {
  const lines = LINES.filter((line) => line.section === section.id).map((line) => ({
    key: line.id,
    line,
  }))
  return section.id === 'common'
    ? lines
    : [{ key: `section:${section.id}`, section: section.id }, ...lines]
})
const rowIndexes = new Map(ROWS.map((r, index) => [r.key, index]))
const visibleRows = computed(() =>
  ROWS.filter((r) => !r.line || r.line.section === 'common' || isOpen(r.line.section)),
)
const row = ref(ROWS[0].key)
const col = ref(0)
const isHeader = (key: string) => key.startsWith('section:')
const cellId = (key: string, colIndex: number) =>
  `${props.periodId}-cell-${rowIndexes.get(key)}-${colIndex}`
const headerId = (section: string) => `${props.periodId}-header-${section}`
const activeId = computed(() =>
  isHeader(row.value) ? headerId(row.value.slice(8)) : cellId(row.value, col.value),
)
// The id and selected state of a cell, both derived from its position.
const cellProps = (line: PeriodLine, colIndex: number) => ({
  id: cellId(line.id, colIndex),
  selected: line.id === row.value && colIndex === col.value,
})
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

function select(key: string, colIndex: number) {
  row.value = key
  col.value = Math.max(0, Math.min(columns.value.length - 1, colIndex))
}

function move([down, right]: [number, number]) {
  const at = visibleRows.value.findIndex((r) => r.key === row.value)
  const next = visibleRows.value[Math.max(0, Math.min(visibleRows.value.length - 1, at + down))]
  select(next.key, isHeader(next.key) ? col.value : col.value + right)
}

// Going to a period with fewer months: the selected cell may not exist there, start from the first.
// Zero columns is a loading state, not a shorter period.
watch(
  () => columns.value.length,
  (count) => {
    if (count > 0 && col.value >= count) select(ROWS[0].key, 0)
  },
)

// Closing the section of the selected cell moves the selection to its header row.
watch(visibleRows, (rows) => {
  if (!rows.some((r) => r.key === row.value)) {
    row.value = `section:${ROWS[rowIndexes.get(row.value)!].line!.section}`
  }
})

const toggle = (section: string) => setOpen(section, !isOpen(section))

// Opens the form of the cell's month with the cell's field focused, and its section open.
function openForm(key: string, colIndex: number) {
  const section = ROWS[rowIndexes.get(key)!].line?.section
  const sections =
    section && section !== 'common' ? [...new Set([...open.value, section])] : open.value
  void router.push({
    path: `/periods/${props.periodId}/months/${columns.value[colIndex].month}`,
    query: { field: key, ...toQuery(sections) },
  })
}

function onKeydown(event: KeyboardEvent) {
  const arrow = MOVES[event.key]
  if (arrow) {
    event.preventDefault()
    // On a header row, right opens the section and left closes it.
    if (isHeader(row.value) && arrow[1]) setOpen(row.value.slice(8), arrow[1] > 0)
    else move(arrow)
  } else if (event.key === 'Enter' || event.key === ' ') {
    // Also stops a focused header button from clicking itself on top of this.
    if (isHeader(row.value)) {
      event.preventDefault()
      toggle(row.value.slice(8))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openForm(row.value, col.value)
    }
  }
}

function onDblclick(key: string, colIndex: number) {
  select(key, colIndex)
  openForm(key, colIndex)
}

watch(activeId, async () => {
  await nextTick()
  document.getElementById(activeId.value)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
    <Table
      data-testid="period-table"
      role="grid"
      tabindex="0"
      aria-describedby="period-table-hint"
      :aria-activedescendant="activeId"
      @keydown="onKeydown"
      container-class="focus-visible:outline-ring/50 focus-visible:outline-2 focus-visible:outline-offset-2 max-h-[calc(100vh-8rem)] overflow-auto scroll-pt-10 scroll-pl-56 max-md:scroll-pl-52 [container-type:inline-size] max-md:[scrollbar-width:none] max-md:snap-x max-md:snap-mandatory"
      class="w-max min-w-full border-separate border-spacing-0 [&_td]:snap-start max-md:[&_td]:w-[calc(100cqw-13rem)] max-md:[&_td]:whitespace-normal"
    >
      <TableHeader>
        <TableRow>
          <TableHead
            class="bg-background sticky top-0 left-0 z-30 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ fr.period.table.label }}</TableHead
          >
          <TableHead
            v-for="column in columns"
            :key="column.month"
            class="bg-background sticky top-0 z-20 snap-start"
            data-testid="period-month"
          >
            <RouterLink
              :to="{ path: `/periods/${periodId}/months/${column.month}`, query: openQuery }"
              class="underline"
              :aria-label="`${fr.period.month.title} ${column.label}`"
              >{{ column.label }}</RouterLink
            >
            <span
              v-if="column.entry.common?.estimated"
              class="text-theme-warning ml-1 rounded border border-current px-1 text-xs"
              data-testid="estimated-badge"
              >{{ fr.period.estimated.badge }}</span
            >
          </TableHead>
          <TableHead class="bg-background sticky top-0 z-20 snap-start">{{
            fr.period.table.total
          }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-for="section in SECTIONS" :key="section.id">
          <TableRow
            v-if="section.id !== 'common'"
            :id="headerId(section.id)"
            class="bg-muted"
            role="row"
            :data-testid="`section-${section.id}`"
          >
            <TableHead :colspan="columns.length + 2" class="bg-muted">
              <button
                type="button"
                tabindex="-1"
                class="sticky left-2 inline-flex items-center gap-1 font-medium"
                :class="{ 'ring-ring/50 ring-2': row === `section:${section.id}` }"
                :aria-expanded="isOpen(section.id)"
                @click="(select(`section:${section.id}`, col), toggle(section.id))"
              >
                <IconChevronDown
                  class="size-4 transition-transform"
                  :class="{ '-rotate-90': !isOpen(section.id) }"
                  aria-hidden="true"
                />
                {{ section.label }}
              </button>
            </TableHead>
          </TableRow>
          <template v-if="section.id === 'common' || isOpen(section.id)">
            <TableRow
              v-for="line in LINES.filter((l) => l.section === section.id)"
              :key="line.id"
              role="row"
              :data-testid="`line-${line.id}`"
            >
              <TableHead
                scope="row"
                class="bg-background sticky left-0 z-10 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
                >{{ line.label }}</TableHead
              >
              <PeriodCell
                v-for="(column, colIndex) in columns"
                :key="column.month"
                v-bind="cellProps(line, colIndex)"
                :line="line"
                :entry="column.entry"
                :figures="column.figures"
                @click="select(line.id, colIndex)"
                @dblclick="onDblclick(line.id, colIndex)"
              />
              <TableCell
                class="text-right font-medium tabular-nums"
                role="gridcell"
                data-testid="total"
                >{{ totalText(line) }}</TableCell
              >
            </TableRow>
          </template>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
