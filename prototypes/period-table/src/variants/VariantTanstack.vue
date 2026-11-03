<script setup lang="ts">
// PROTOTYPE (issue #9), version 2: shadcn-vue data-table pattern with
// @tanstack/vue-table v9. Lines are the table's data; sections come from grouping.
import { h } from 'vue'
import {
  FlexRender,
  columnGroupingFeature,
  createExpandedRowModel,
  createGroupedRowModel,
  rowExpandingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/vue-table'
import type { ColumnDef } from '@tanstack/vue-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PeriodCell from '@/prototype/PeriodCell.vue'
import { cellView, lines, monthIds, monthLabels, sections } from '@/prototype/model'
import type { Line } from '@/prototype/model'
import { usePeriodGrid } from '@/prototype/usePeriodGrid'

const grid = usePeriodGrid()
defineExpose({ grid })

type LineRow = { index: number; line: Line; section: string }

const features = tableFeatures({
  columnGroupingFeature,
  rowExpandingFeature,
  groupedRowModel: createGroupedRowModel(),
  expandedRowModel: createExpandedRowModel(),
})

const columns: Array<ColumnDef<typeof features, LineRow>> = [
  { id: 'section', accessorKey: 'section' },
  { id: 'label', header: 'Ligne', accessorFn: (row) => row.line.label },
  ...monthIds.map((id, c): ColumnDef<typeof features, LineRow> => ({
    id,
    header: monthLabels[c],
    cell: ({ row }) => h(PeriodCell, { r: row.original.index, c, view: cellView(c, row.original.line), grid }),
  })),
]

const table = useTable({
  features,
  columns,
  data: lines.map((line, index) => ({ index, line, section: line.section })),
  initialState: { grouping: ['section'], expanded: true },
})

const sectionLabel = (id: unknown) => sections.find((s) => s.id === id)?.label
</script>

<template>
  <Table
    :ref="(el: any) => (grid.root = el?.$el ?? null)"
    role="grid"
    tabindex="0"
    aria-label="Tableau de la période"
    :aria-activedescendant="grid.cellId(grid.row, grid.col)"
    style="max-height: 70vh"
    class="w-max"
    @keydown="grid.onRootKeydown"
  >
    <TableHeader class="sticky top-0 z-20 bg-background">
      <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
        <template v-for="header in headerGroup.headers" :key="header.id">
          <TableHead
            v-if="header.column.id !== 'section'"
            :class="header.column.id === 'label' ? 'sticky left-0 z-30 bg-background' : 'text-right'"
          >
            <FlexRender v-if="!header.isPlaceholder" :header="header" />
          </TableHead>
        </template>
      </TableRow>
    </TableHeader>
    <TableBody>
      <template v-for="row in table.getRowModel().rows" :key="row.id">
        <TableRow v-if="row.getIsGrouped()" class="bg-muted hover:bg-muted">
          <TableCell :colspan="13" class="sticky left-0 font-semibold">{{ sectionLabel(row.groupingValue) }}</TableCell>
        </TableRow>
        <TableRow v-else :class="row.original.line.type === 'computed' && 'bg-muted/40'">
          <template v-for="cell in row.getAllCells()" :key="cell.id">
            <TableCell v-if="cell.column.id === 'label'" class="sticky left-0 z-10 bg-background">
              <FlexRender :cell="cell" />
            </TableCell>
            <TableCell v-else-if="cell.column.id !== 'section'" class="p-0">
              <FlexRender :cell="cell" />
            </TableCell>
          </template>
        </TableRow>
      </template>
    </TableBody>
  </Table>
</template>
