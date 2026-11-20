<script setup lang="ts">
// PROTOTYPE (#124) — Table B: a vertical section list on the left (a select on phones), the table on
// the right with the common rows first. The table gets the full width left by the list.
import { TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import { Table, TableBody } from '@/components/ui/table'

import MonthsHeader from './MonthsHeader.vue'
import Rows from './Rows.vue'
import { TABS, url } from './state'

defineOptions({ name: 'Vertical section list' })
const label = (id: string) => TABS.find((t) => t.id === id)!.label
</script>

<template>
  <div class="flex gap-4 max-md:flex-col">
    <select v-model="url.section" class="rounded border px-2 py-2 md:hidden">
      <option v-for="tab in TABS" :key="tab.id" :value="tab.id">{{ tab.label }}</option>
    </select>
    <TabsRoot v-model="url.section" orientation="vertical" class="max-md:hidden">
      <TabsList class="flex w-48 flex-col gap-1 border-r pr-2">
        <TabsTrigger
          v-for="tab in TABS"
          :key="tab.id"
          :value="tab.id"
          class="data-[state=active]:bg-muted rounded px-3 py-2 text-left text-sm data-[state=active]:font-semibold"
          >{{ tab.label }}</TabsTrigger
        >
      </TabsList>
    </TabsRoot>
    <div class="min-w-0 flex-1">
      <Table container-class="max-h-[calc(100vh-10rem)] overflow-auto" class="w-max min-w-full border-separate border-spacing-0">
        <MonthsHeader />
        <TableBody>
          <Rows section="common" label="Commun" />
          <Rows :section="url.section as never" :label="label(url.section)" />
        </TableBody>
      </Table>
    </div>
  </div>
</template>
