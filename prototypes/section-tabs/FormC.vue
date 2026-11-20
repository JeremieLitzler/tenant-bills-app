<script setup lang="ts">
// PROTOTYPE (#124) — Form C: no tabs. Common fields above, then every section as a collapsible
// panel with its icon in the summary; several panels can be open at once.
import CommonFields from './CommonFields.vue'
import Fields from './Fields.vue'
import StatusIcon from './StatusIcon.vue'
import { TABS, sectionStatus, url } from './state'

defineOptions({ name: 'Collapsible panels, no tabs' })
</script>

<template>
  <div class="flex flex-col gap-3">
    <CommonFields />
    <details
      v-for="tab in TABS"
      :key="tab.id"
      class="rounded border"
      :open="tab.id === url.section"
      @toggle="($event.target as HTMLDetailsElement).open && (url.section = tab.id)"
    >
      <summary class="flex cursor-pointer items-center gap-2 px-3 py-2 font-semibold">
        {{ tab.label }} <StatusIcon :status="sectionStatus(url.month, tab.id)" />
      </summary>
      <div class="border-t p-3"><Fields :section="tab.id" :month="url.month" /></div>
    </details>
  </div>
</template>
