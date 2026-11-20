<script setup lang="ts">
// PROTOTYPE (#124) — the common fields, shown above (or beside) the section tabs (Q3b).
import Fields from './Fields.vue'
import { url } from './state'

defineProps<{ columns?: string }>()
</script>

<template>
  <fieldset class="rounded border p-3">
    <legend class="px-1 font-semibold">Commun</legend>
    <Fields section="common" :month="url.month" :columns="columns ?? 'sm:grid-cols-3 lg:grid-cols-5'" />
  </fieldset>
</template>
