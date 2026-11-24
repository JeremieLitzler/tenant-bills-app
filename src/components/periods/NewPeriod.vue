<script setup lang="ts">
// "Nouvelle période" (docs/scenarios.md, Case 5): the button, refused with its reason, and the form
// of the four creation values. The advance is prefilled once, from the previous settlement.
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { useNewPeriod, usePeriods } from '@/composables/usePeriods'
import { useToasts } from '@/composables/useToasts'
import { periodIdFromStart } from '@/domain/newPeriod'
import { fr } from '@/i18n/fr'
import { PeriodExistsError } from '@/sync/periodsApi'

const t = fr.periods.newPeriod
const router = useRouter()
const { eligibility, suggestedAdvance } = useNewPeriod()
const open = ref(false)
const busy = ref(false)
const tenantName = ref('')
const advance = ref('')
const estimate = ref('0')
const startDate = ref('')

watch(open, (isOpen) => {
  if (isOpen)
    advance.value = suggestedAdvance.value === undefined ? '' : String(suggestedAdvance.value)
})

async function submit() {
  const values = {
    tenantName: tenantName.value.trim(),
    monthlyTenantBillAdvance: Number(advance.value),
    heatPumpInvoiceEstimate: Number(estimate.value),
    startDate: startDate.value,
  }
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(values.startDate) && !isNaN(Date.parse(values.startDate))
  if (
    !values.tenantName ||
    !(values.monthlyTenantBillAdvance > 0) ||
    !(values.heatPumpInvoiceEstimate >= 0) ||
    !validDate
  ) {
    useToasts().notify({ level: 'error', message: t.invalid })
    return
  }
  const id = periodIdFromStart(values.startDate)
  busy.value = true
  try {
    await usePeriods().createPeriod(id, values)
    await router.push(`/periods/${id}`)
  } catch (error) {
    useToasts().notify({
      level: 'error',
      message: error instanceof PeriodExistsError ? t.exists(id) : t.failed,
    })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <Button
      v-if="!open"
      :disabled="eligibility !== 'allowed'"
      data-testid="new-period"
      @click="open = true"
    >
      {{ t.button }}
    </Button>
    <p
      v-if="eligibility === 'refused' || eligibility === 'unknown'"
      data-testid="new-period-reason"
    >
      {{ eligibility === 'refused' ? t.refused : t.unknown }}
    </p>
    <form
      v-if="open"
      class="flex flex-col gap-2"
      data-testid="new-period-form"
      @submit.prevent="submit"
    >
      <label class="flex flex-col"
        >{{ t.tenantName }}<input v-model="tenantName" class="border px-2 py-1" name="tenantName"
      /></label>
      <label class="flex flex-col"
        >{{ t.monthlyTenantBillAdvance
        }}<input
          v-model="advance"
          class="border px-2 py-1"
          name="monthlyTenantBillAdvance"
          inputmode="decimal"
      /></label>
      <label class="flex flex-col"
        >{{ t.heatPumpInvoiceEstimate
        }}<input
          v-model="estimate"
          class="border px-2 py-1"
          name="heatPumpInvoiceEstimate"
          inputmode="decimal"
      /></label>
      <label class="flex flex-col"
        >{{ t.startDate
        }}<input v-model="startDate" class="border px-2 py-1" name="startDate" type="date"
      /></label>
      <div class="flex gap-2">
        <Button accent type="submit" :disabled="busy">{{ t.create }}</Button>
        <Button type="button" @click="open = false">{{ t.cancel }}</Button>
      </div>
    </form>
  </div>
</template>
