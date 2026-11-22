<script setup lang="ts">
// The confirmation of the real reading of the estimated twelfth month (docs/period-file.md): lists
// the indexes still equal to their estimate. The parent closes it by clearing `fields`.
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from 'reka-ui'

import { Button } from '@/components/ui/button'
import { fr } from '@/i18n/fr'

defineProps<{ fields?: string[] }>()
const emit = defineEmits<{ answer: [yes: boolean] }>()

const labelOf = (id: string) => fr.period.table.lines[id as keyof typeof fr.period.table.lines]
</script>

<template>
  <AlertDialogRoot :open="!!fields">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <AlertDialogContent
        @escape-key-down="emit('answer', false)"
        class="bg-background fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border p-6 shadow-lg"
        data-testid="estimated-dialog"
      >
        <AlertDialogTitle class="font-semibold">{{ fr.period.estimated.title }}</AlertDialogTitle>
        <AlertDialogDescription as="div">
          <template v-if="fields?.length">
            <p>{{ fr.period.estimated.stillEstimated }}</p>
            <ul class="list-disc pl-6">
              <li v-for="id in fields" :key="id">{{ labelOf(id) }}</li>
            </ul>
          </template>
          <p v-else>{{ fr.period.estimated.noneEstimated }}</p>
        </AlertDialogDescription>
        <div class="flex justify-end gap-2">
          <AlertDialogCancel as-child @click="emit('answer', false)">
            <Button>{{ fr.period.estimated.cancel }}</Button>
          </AlertDialogCancel>
          <AlertDialogAction as-child @click="emit('answer', true)">
            <Button accent data-testid="estimated-confirm">{{
              fr.period.estimated.confirm
            }}</Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
