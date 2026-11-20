<script setup lang="ts">
// PROTOTYPE (#124) — the rows of one section in the read-only table: a header row, then its lines.
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import type { SectionName } from '@/domain/periodFile'

import { cellText, figures, file, linesOf } from './state'

defineProps<{ section: SectionName; label: string }>()
</script>

<template>
  <TableRow class="bg-muted">
    <TableHead :colspan="file.months.length + 1" class="bg-muted">
      <span class="sticky left-2"><slot name="label">{{ label }}</slot></span>
    </TableHead>
  </TableRow>
  <TableRow v-for="line in linesOf(section)" :key="line.id">
    <TableHead scope="row" class="bg-background sticky left-0 z-10 w-56 min-w-56 whitespace-normal">
      {{ line.label }}
    </TableHead>
    <TableCell
      v-for="(entry, i) in file.months"
      :key="entry.month"
      class="text-right tabular-nums"
      :class="{
        'text-muted-foreground': line.computed,
        'bg-amber-100 dark:bg-amber-900/40': figures[i]!.warnings[line.id],
      }"
      >{{ cellText(line, entry, figures[i]!) }}</TableCell
    >
  </TableRow>
</template>
