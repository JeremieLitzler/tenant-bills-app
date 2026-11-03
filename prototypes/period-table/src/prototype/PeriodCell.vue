<script setup lang="ts">
// PROTOTYPE (issue #9): the content of one month cell, identical in the three
// versions so that the styling does not tilt the comparison.
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import type { CellView } from './model'
import type { Grid } from './useGrid'

const props = defineProps<{ r: number; c: number; view: CellView; grid: Grid }>()

const selected = computed(() => props.grid.row === props.r && props.grid.col === props.c)
const editingHere = computed(() => selected.value && props.grid.editing)

const input = ref<HTMLInputElement | null>(null)
function focusInput(el: unknown) {
  const node = el as HTMLInputElement | null
  input.value = node
  if (node && document.activeElement !== node) {
    node.focus()
    node.setSelectionRange(node.value.length, node.value.length)
  }
}
</script>

<template>
  <div
    :id="grid.cellId(r, c)"
    role="gridcell"
    :aria-selected="selected"
    :aria-readonly="!view.editable"
    :title="view.warning"
    :class="cn(
      'relative flex h-8 min-w-24 items-center justify-end gap-1 px-2 tabular-nums select-none',
      view.source === 'inherited' && 'text-muted-foreground italic',
      view.source === 'derived' && !view.computed && 'text-muted-foreground',
      view.computed && 'font-medium',
      view.notApplicable && 'bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--color-muted)_6px_8px)]',
      view.editable ? 'cursor-cell' : 'cursor-default',
      view.warning && 'text-amber-700',
      selected && 'outline-2 -outline-offset-2 outline-primary',
    )"
    @click="grid.select(r, c)"
    @dblclick="view.editable && grid.edit(r, c)"
  >
    <input
      v-if="editingHere"
      :ref="focusInput"
      v-model="grid.draft"
      class="absolute inset-0 w-full bg-background px-2 text-right outline-2 -outline-offset-2 outline-primary"
      @keydown="grid.onInputKeydown"
      @blur="grid.onInputBlur(r, c)"
    />
    <template v-else>
      <span v-if="view.warning" aria-hidden="true">⚠</span>
      <span>{{ view.text }}</span>
    </template>
  </div>
</template>
