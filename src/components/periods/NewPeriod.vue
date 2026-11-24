<script setup lang="ts">
// "Nouvelle période" (docs/scenarios.md, Case 5): the button, refused with its reason, and the form
// of the four creation values. The advance is prefilled once, from the previous settlement.
import { reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
import { Button } from '@/components/ui/button'
import { useNewPeriod, usePeriods } from '@/composables/usePeriods'
import { useToasts } from '@/composables/useToasts'
import { checkNewPeriod, periodIdFromStart } from '@/domain/newPeriod'
import { fr } from '@/i18n/fr'
import { PeriodExistsError } from '@/sync/periodsApi'

const t = fr.periods.newPeriod
const router = useRouter()
const { notify } = useToasts()
const periods = usePeriods()
const { eligibility, suggestedAdvance, prefillUnavailable } = useNewPeriod()
const open = ref(false)
const busy = ref(false)
const form = reactive({
  tenantName: '',
  monthlyTenantBillAdvance: '',
  heatPumpInvoiceEstimate: '0',
  startDate: '',
})

watch(open, (isOpen) => {
  if (isOpen) {
    form.monthlyTenantBillAdvance =
      suggestedAdvance.value === undefined ? '' : String(suggestedAdvance.value)
  }
})

async function submit() {
  const checked = checkNewPeriod(form)
  if ('invalid' in checked) {
    notify({ level: 'error', message: t.invalid[checked.invalid] })
    return
  }
  const id = periodIdFromStart(checked.values.startDate)
  busy.value = true
  try {
    if (await periods.previousBlocksNew(id)) {
      notify({ level: 'warning', message: t.refused })
      return
    }
    await periods.createPeriod(id, checked.values)
    await router.push(`/periods/${id}`)
  } catch (error) {
    notify({
      level: 'error',
      message: error instanceof PeriodExistsError ? t.exists(id) : t.failed,
    })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-2">
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
      class="text-theme-warning flex items-center gap-1 text-center text-sm"
      data-testid="new-period-reason"
    >
      <IconTriangleAlert class="size-4 shrink-0" aria-hidden="true" />
      {{ eligibility === 'refused' ? t.refused : t.unknown }}
    </p>
    <p v-if="eligibility === 'loading'" class="text-sm" data-testid="new-period-checking">
      {{ t.checking }}
    </p>
    <form
      v-if="open"
      class="flex flex-col gap-2 self-stretch"
      data-testid="new-period-form"
      @submit.prevent="submit"
    >
      <label class="flex flex-col"
        >{{ t.tenantName
        }}<input v-model="form.tenantName" class="rounded border px-2 py-1" name="tenantName"
      /></label>
      <label class="flex flex-col"
        >{{ t.monthlyTenantBillAdvance
        }}<input
          v-model="form.monthlyTenantBillAdvance"
          class="rounded border px-2 py-1"
          name="monthlyTenantBillAdvance"
          inputmode="decimal"
      /></label>
      <p v-if="prefillUnavailable" class="text-sm" data-testid="new-period-prefill-hint">
        {{ t.prefillUnavailable }}
      </p>
      <label class="flex flex-col"
        >{{ t.heatPumpInvoiceEstimate
        }}<input
          v-model="form.heatPumpInvoiceEstimate"
          class="rounded border px-2 py-1"
          name="heatPumpInvoiceEstimate"
          inputmode="decimal"
      /></label>
      <label class="flex flex-col"
        >{{ t.startDate
        }}<input
          v-model="form.startDate"
          class="rounded border px-2 py-1"
          name="startDate"
          type="date"
      /></label>
      <div class="flex gap-2">
        <Button accent type="submit" :disabled="busy">{{ t.create }}</Button>
        <Button type="button" @click="open = false">{{ t.cancel }}</Button>
      </div>
    </form>
  </div>
</template>
