<script setup lang="ts">
// PROTOTYPE (issue #9), version 3: native <table> styled with Tailwind, hand-built
// row model, no shadcn-vue and no TanStack. Classes copied from shadcn-vue's Table.
import PeriodCell from '@/prototype/PeriodCell.vue'
import { cellView, lines, monthLabels, sections } from '@/prototype/model'
import { usePeriodGrid } from '@/prototype/usePeriodGrid'

const grid = usePeriodGrid()
defineExpose({ grid })

const rows = sections.flatMap((section) => [
  { kind: 'header' as const, key: section.id, label: section.label },
  ...lines.flatMap((line, index) => (line.section === section.id ? [{ kind: 'line' as const, key: line.id, line, index }] : [])),
])
</script>

<template>
  <div
    :ref="(el: any) => (grid.root = el)"
    role="grid"
    tabindex="0"
    aria-label="Tableau de la période"
    :aria-activedescendant="grid.cellId(grid.row, grid.col)"
    class="relative max-h-[70vh] w-full overflow-auto scroll-pt-20 scroll-pl-72"
    @keydown="grid.onRootKeydown"
  >
    <table class="w-max caption-bottom text-sm">
      <thead class="sticky top-0 z-20 bg-background [&_tr]:border-b">
        <tr>
          <th class="sticky left-0 z-30 h-10 w-72 min-w-72 bg-background px-2 text-left font-medium whitespace-nowrap">Ligne</th>
          <th v-for="label in monthLabels" :key="label" class="h-10 px-2 text-right font-medium whitespace-nowrap">{{ label }}</th>
        </tr>
      </thead>
      <tbody class="[&_tr:last-child]:border-0">
        <template v-for="row in rows" :key="row.key">
          <tr v-if="row.kind === 'header'" class="border-b bg-muted">
            <td colspan="13" class="p-2 font-semibold whitespace-nowrap"><span class="sticky left-2 inline-block">{{ row.label }}</span></td>
          </tr>
          <tr v-else class="border-b transition-colors hover:bg-muted/50" :class="row.line.type === 'computed' && 'bg-muted/40'">
            <td class="sticky left-0 z-10 w-72 min-w-72 bg-background p-2 whitespace-nowrap">{{ row.line.label }}</td>
            <td v-for="(_, c) in monthLabels" :key="c" class="p-0">
              <PeriodCell :r="row.index" :c="c" :view="cellView(c, row.line)" :grid="grid" />
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
