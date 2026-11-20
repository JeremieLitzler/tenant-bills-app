<script setup lang="ts">
// PROTOTYPE (#124) — Q4: green check when complete, warning triangle on a warning, nothing otherwise.
import { CircleCheck, TriangleAlert } from '@lucide/vue'

defineProps<{ status: 'warning' | 'complete' | 'none' }>()
</script>

<template>
  <TriangleAlert v-if="status === 'warning'" class="size-4 shrink-0 text-amber-600" aria-label="Avertissement" />
  <CircleCheck v-else-if="status === 'complete'" class="size-4 shrink-0 text-green-600" aria-label="Complet" />
</template>
