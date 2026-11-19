<script setup lang="ts">
// A button look. The base is the "No" button (outlined); `accent` is the "Yes" button (filled).
// `as` renders it as another element or component (a `RouterLink`); extra attributes pass through.
import type { Component } from 'vue'

import { cn } from '@/lib/utils'

withDefaults(defineProps<{ accent?: boolean; as?: string | Component }>(), { as: 'button' })
</script>

<template>
  <component
    :is="as"
    :class="
      cn(
        'focus-visible:outline-foreground rounded-md px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2',
        accent ? 'bg-primary text-primary-foreground' : 'bg-background border',
      )
    "
  >
    <slot />
  </component>
</template>
