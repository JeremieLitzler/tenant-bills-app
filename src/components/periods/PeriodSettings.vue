<script setup lang="ts">
// "Paramètres de la période" (#83): the expected monthly tenant bill advance, the only setting
// edited here (`closedOn` is set only by closing). Saves on blur through `setCell`, like a cell.
import { computed, ref, watch } from 'vue'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
import { usePeriod } from '@/composables/usePeriods'
import { fr } from '@/i18n/fr'

const props = defineProps<{ periodId: string }>()
const { file, isReadOnly, setCell } = usePeriod(() => props.periodId)

const t = fr.period.settings
const canEdit = computed(() => !isReadOnly.value && !file.value?.closedOn)
const text = ref('')
const invalid = ref(false)
watch(
  () => file.value?.monthlyTenantBillAdvance,
  (value) => (text.value = String(value ?? '')),
  { immediate: true },
)

// Unchanged saves nothing; like at creation, the advance must be above 0.
function onBlur() {
  const value = Number(text.value.replace(',', '.'))
  invalid.value = !(value > 0)
  if (invalid.value || value === file.value?.monthlyTenantBillAdvance) return
  void setCell(null, 'monthlyTenantBillAdvance', value)
}
</script>

<template>
  <section class="flex flex-col gap-2" data-testid="period-settings">
    <h2 class="text-lg font-semibold">{{ t.title }}</h2>
    <label class="flex flex-col">
      {{ t.monthlyTenantBillAdvance }}
      <input
        v-model="text"
        class="max-w-xs rounded border px-2 py-1 disabled:opacity-50"
        data-testid="setting-monthlyTenantBillAdvance"
        inputmode="decimal"
        :disabled="!canEdit"
        @blur="onBlur"
      />
    </label>
    <p
      v-if="invalid"
      class="text-theme-warning flex items-center gap-1 text-sm"
      data-testid="setting-invalid"
    >
      <IconTriangleAlert class="size-4 shrink-0" aria-hidden="true" />
      {{ t.invalid }}
    </p>
  </section>
</template>
