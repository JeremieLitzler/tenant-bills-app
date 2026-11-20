<script setup lang="ts">
// PROTOTYPE (#124) — Table C: no tabs. One table with every section collapsible from its header
// row; the common rows always open. Several sections can be open to compare them.
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { reactive } from 'vue'

import { Table, TableBody } from '@/components/ui/table'

import MonthsHeader from './MonthsHeader.vue'
import Rows from './Rows.vue'
import { TABS, url } from './state'

defineOptions({ name: 'Collapsible sections, no tabs' })
const open = reactive(new Set<string>([url.section]))
const toggle = (id: string) => (open.has(id) ? open.delete(id) : open.add(id))
</script>

<template>
  <Table container-class="max-h-[calc(100vh-8rem)] overflow-auto" class="w-max min-w-full border-separate border-spacing-0">
    <MonthsHeader />
    <TableBody>
      <Rows section="common" label="Commun" />
      <template v-for="tab in TABS" :key="tab.id">
        <Rows v-if="open.has(tab.id)" :section="tab.id" :label="tab.label">
          <template #label>
            <button type="button" class="flex items-center gap-1" @click="toggle(tab.id)">
              <ChevronDown class="size-4" />{{ tab.label }}
            </button>
          </template>
        </Rows>
        <tr v-else class="bg-muted">
          <th colspan="99" class="bg-muted px-2 py-2 text-left font-medium">
            <button type="button" class="sticky left-2 flex items-center gap-1" @click="toggle(tab.id)">
              <ChevronRight class="size-4" />{{ tab.label }}
            </button>
          </th>
        </tr>
      </template>
    </TableBody>
  </Table>
</template>
