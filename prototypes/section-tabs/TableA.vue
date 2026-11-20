<script setup lang="ts">
// PROTOTYPE (#124) — Table A, the settled design: a horizontal tab strip above one table that
// always starts with the common rows, then the selected section's rows. No icons (Q2b).
import { TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { Table, TableBody } from '@/components/ui/table'

import MonthsHeader from './MonthsHeader.vue'
import Rows from './Rows.vue'
import { TABS, url } from './state'

defineOptions({ name: 'Horizontal tabs (settled)' })
const label = (id: string) => TABS.find((t) => t.id === id)!.label
</script>

<template>
  <TabsRoot v-model="url.section" class="flex flex-col gap-2">
    <TabsList class="flex gap-1 overflow-x-auto border-b">
      <TabsTrigger
        v-for="tab in TABS"
        :key="tab.id"
        :value="tab.id"
        class="data-[state=active]:border-primary shrink-0 border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap data-[state=active]:font-semibold"
        >{{ tab.label }}</TabsTrigger
      >
    </TabsList>
  </TabsRoot>
  <Table container-class="max-h-[calc(100vh-12rem)] overflow-auto" class="w-max min-w-full border-separate border-spacing-0">
    <MonthsHeader />
    <TableBody>
      <Rows section="common" label="Commun" />
      <Rows :section="url.section as never" :label="label(url.section)" />
    </TableBody>
  </Table>
</template>
