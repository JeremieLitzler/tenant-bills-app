<script setup lang="ts">
// PROTOTYPE (issue #9), version 1: plain shadcn-vue Table, hand-built row model.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PeriodCell from '@/prototype/PeriodCell.vue'
import { cellView, lines, monthLabels, sections } from '@/prototype/model'
import { usePeriodGrid } from '@/prototype/usePeriodGrid'

const grid = usePeriodGrid()
defineExpose({ grid })

// The row model: each section's header row, then its lines with their grid row index.
const rows = sections.flatMap((section) => [
  { kind: 'header' as const, key: section.id, label: section.label },
  ...lines.flatMap((line, index) => (line.section === section.id ? [{ kind: 'line' as const, key: line.id, line, index }] : [])),
])
</script>

<template>
  <!-- Table's root is its scroll container: role, tabindex, keydown and style fall
       through to it, but its `class` prop goes to the inner <table>. -->
  <Table
    :ref="(el: any) => (grid.root = el?.$el ?? null)"
    role="grid"
    tabindex="0"
    aria-label="Tableau de la période"
    :aria-activedescendant="grid.cellId(grid.row, grid.col)"
    style="max-height: 70vh; scroll-padding: 5rem 0 0 18rem"
    class="w-max"
    @keydown="grid.onRootKeydown"
  >
    <TableHeader class="sticky top-0 z-20 bg-background">
      <TableRow>
        <TableHead class="sticky left-0 z-30 w-72 min-w-72 bg-background">Ligne</TableHead>
        <TableHead v-for="label in monthLabels" :key="label" class="text-right">{{ label }}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-for="row in rows" :key="row.key">
        <TableRow v-if="row.kind === 'header'" class="bg-muted hover:bg-muted">
          <TableCell :colspan="13" class="font-semibold"><span class="sticky left-2 inline-block">{{ row.label }}</span></TableCell>
        </TableRow>
        <TableRow v-else :class="row.line.type === 'computed' && 'bg-muted/40'">
          <TableCell class="sticky left-0 z-10 w-72 min-w-72 bg-background">{{ row.line.label }}</TableCell>
          <TableCell v-for="(_, c) in monthLabels" :key="c" class="p-0">
            <PeriodCell :r="row.index" :c="c" :view="cellView(c, row.line)" :grid="grid" />
          </TableCell>
        </TableRow>
      </template>
    </TableBody>
  </Table>
</template>
