<script setup lang="ts">
// PROTOTYPE (#124) — Form B: a left column with the common fields stacked and a vertical section
// list with icons under them, like a checklist; the selected section's fields on the right.
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'

import CommonFields from './CommonFields.vue'
import Fields from './Fields.vue'
import StatusIcon from './StatusIcon.vue'
import { TABS, sectionStatus, url } from './state'

defineOptions({ name: 'Side column checklist' })
</script>

<template>
  <TabsRoot v-model="url.section" orientation="vertical" class="flex gap-6 max-md:flex-col">
    <aside class="flex w-72 shrink-0 flex-col gap-4 max-md:w-full">
      <CommonFields columns="grid-cols-1 max-md:sm:grid-cols-2" />
      <TabsList class="flex flex-col gap-1">
        <TabsTrigger
          v-for="tab in TABS"
          :key="tab.id"
          :value="tab.id"
          class="data-[state=active]:bg-muted flex items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm data-[state=active]:font-semibold"
        >
          {{ tab.label }} <StatusIcon :status="sectionStatus(url.month, tab.id)" />
        </TabsTrigger>
      </TabsList>
    </aside>
    <TabsContent v-for="tab in TABS" :key="tab.id" :value="tab.id" class="min-w-0 flex-1">
      <h2 class="mb-3 text-lg font-semibold">{{ tab.label }}</h2>
      <Fields :section="tab.id" :month="url.month" />
    </TabsContent>
  </TabsRoot>
</template>
