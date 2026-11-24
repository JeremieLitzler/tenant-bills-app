<script setup lang="ts">
// "Clôturer la période": the confirmation of a final action (ADR 0006). It lists the months whose
// tenant bill advance is 0 without blocking, and needs the water bills tick.
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from 'reka-ui'
import { ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { fr } from '@/i18n/fr'

import { monthLabel } from './periodLines'

defineProps<{ disabled: boolean; monthsWithoutAdvance: string[] }>()
const emit = defineEmits<{ confirm: [] }>()

const t = fr.period.close
const open = ref(false)
const billsReceived = ref(false)
watch(open, () => (billsReceived.value = false))
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogTrigger as-child>
      <Button data-testid="period-close" :disabled="disabled">{{ t.button }}</Button>
    </AlertDialogTrigger>
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 z-50 bg-black/50" />
      <AlertDialogContent
        data-testid="period-close-dialog"
        class="bg-background fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border p-6 shadow-lg"
      >
        <AlertDialogTitle class="font-semibold">{{ t.title }}</AlertDialogTitle>
        <AlertDialogDescription as="div" class="flex flex-col gap-3">
          <div v-if="monthsWithoutAdvance.length" data-testid="period-close-no-advance">
            <p>{{ t.noAdvance }}</p>
            <ul class="list-disc pl-6">
              <li v-for="month in monthsWithoutAdvance" :key="month">{{ monthLabel(month) }}</li>
            </ul>
          </div>
          <label class="flex items-start gap-2">
            <input
              v-model="billsReceived"
              type="checkbox"
              class="mt-1.5 shrink-0"
              data-testid="period-close-bills"
            />
            {{ t.billsReceived }}
          </label>
          <p class="font-semibold">{{ t.irreversible }}</p>
        </AlertDialogDescription>
        <div class="flex justify-end gap-2">
          <AlertDialogCancel as-child>
            <Button>{{ t.cancel }}</Button>
          </AlertDialogCancel>
          <AlertDialogAction as-child @click="billsReceived && emit('confirm')">
            <Button accent data-testid="period-close-confirm" :disabled="!billsReceived">{{
              t.confirm
            }}</Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
