<script setup lang="ts">
// A button look. The base is the "No" button (outlined); `accent` is the "Yes" button (filled),
// `warning` a button that confirms a risky step (warning color, white text).
// `as` renders it as another element or component (a `RouterLink`); extra attributes pass through.
import type { Component } from 'vue'

import { cn } from '@/lib/utils'

withDefaults(defineProps<{ accent?: boolean; warning?: boolean; as?: string | Component }>(), {
  as: 'button',
})
</script>

<template>
  <component
    :is="as"
    :class="
      cn(
        'focus-visible:outline-foreground rounded-md px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2',
        warning
          ? 'bg-theme-warning ring-theme-warning/60 text-white hover:ring-2 hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-offset-2'
          : accent
            ? 'bg-primary text-primary-foreground'
            : 'bg-background border',
      )
    "
  >
    <slot />
  </component>
</template>
