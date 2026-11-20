<script setup lang="ts">
// PROTOTYPE (#124) — Form A, the settled design: common fields above a horizontal tab strip, each
// tab with its icon for this month (Q4).
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import CommonFields from './CommonFields.vue'
import Fields from './Fields.vue'
import StatusIcon from './StatusIcon.vue'
import { TABS, sectionStatus, url } from './state'

defineOptions({ name: 'Horizontal tabs (settled)' })
</script>

<template>
  <div class="flex flex-col gap-4">
    <CommonFields />
    <TabsRoot v-model="url.section" class="flex flex-col gap-3">
      <TabsList class="flex gap-1 overflow-x-auto border-b">
        <TabsTrigger
          v-for="tab in TABS"
          :key="tab.id"
          :value="tab.id"
          class="data-[state=active]:border-primary flex shrink-0 items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap data-[state=active]:font-semibold"
        >
          {{ tab.label }} <StatusIcon :status="sectionStatus(url.month, tab.id)" />
        </TabsTrigger>
      </TabsList>
      <TabsContent v-for="tab in TABS" :key="tab.id" :value="tab.id">
        <Fields :section="tab.id" :month="url.month" />
      </TabsContent>
    </TabsRoot>
  </div>
</template>
