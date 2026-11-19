<script setup lang="ts">
// The Yes/No dialog of Case 8 (docs/scenarios.md), shared by the period table and the "Saisie du
// mois" form. Escape and "Non" answer No; the parent closes it by clearing `offer`.
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

import type { Offer } from '@/domain/applyOffer'
import { fr } from '@/i18n/fr'

const props = defineProps<{ offer?: Offer; section: string; line: string; value: string }>()
const emit = defineEmits<{ answer: [yes: boolean] }>()

const message = () =>
  fr.period.applyDialog[props.offer?.kind ?? 'inherited']
    .replace('{line}', props.line)
    .replace('{value}', props.value)
</script>

<template>
  <AlertDialogRoot :open="!!offer">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <AlertDialogContent
        @escape-key-down="emit('answer', false)"
        class="bg-background fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border p-6 shadow-lg"
      >
        <AlertDialogTitle class="font-semibold">{{ section }}</AlertDialogTitle>
        <AlertDialogDescription>{{ message() }}</AlertDialogDescription>
        <div class="flex justify-end gap-2">
          <AlertDialogCancel
            class="rounded-md border px-3 py-1.5 focus-visible:outline-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="emit('answer', false)"
            >{{ fr.period.applyDialog.no }}</AlertDialogCancel
          >
          <AlertDialogAction
            class="bg-primary text-primary-foreground rounded-md px-3 py-1.5 focus-visible:outline-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
            @click="emit('answer', true)"
            >{{ fr.period.applyDialog.yes }}</AlertDialogAction
          >
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
