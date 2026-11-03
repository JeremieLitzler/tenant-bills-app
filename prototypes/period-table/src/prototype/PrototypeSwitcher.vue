<script setup lang="ts">
// PROTOTYPE (issue #9): floating variant switcher. Click only: the arrow keys
// belong to the period table's keyboard model, so the bar does not listen to them.
import { computed } from 'vue'

const props = defineProps<{ variants: Array<{ key: string; name: string }>; current: string }>()
const emit = defineEmits<{ change: [key: string] }>()

const index = computed(() => Math.max(0, props.variants.findIndex((v) => v.key === props.current)))
const label = computed(() => `${props.variants[index.value].key} (${props.variants[index.value].name})`)
const show = !import.meta.env.PROD

function go(step: number) {
  const n = props.variants.length
  emit('change', props.variants[(index.value + step + n) % n].key)
}
</script>

<template>
  <div
    v-if="show"
    class="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black px-4 py-2 text-sm text-white shadow-lg"
  >
    <button class="px-2" aria-label="Version précédente" @click="go(-1)">‹</button>
    <span class="font-mono">{{ label }}</span>
    <button class="px-2" aria-label="Version suivante" @click="go(1)">›</button>
  </div>
</template>
