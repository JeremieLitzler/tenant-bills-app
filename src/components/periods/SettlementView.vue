<script setup lang="ts">
// The settlement (F8): who owes whom, while the period is open too. It only reads the period's
// figures; every amount comes from the domain, so it matches the period table.
import { computed } from 'vue'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
import { Button } from '@/components/ui/button'
import { usePeriod } from '@/composables/usePeriods'
import type { Figure } from '@/domain/figures/figureMath'
import type { MonthFigures } from '@/domain/periodFigures'
import { fr } from '@/i18n/fr'

import { formatTotal, formatValue, monthLabel, SECTIONS } from './periodLines'

const props = defineProps<{ periodId: string }>()
const period = usePeriod(() => props.periodId)
const totals = computed(() => period.figures.value?.totals)

const money = (value: Figure) =>
  value === undefined ? fr.period.table.empty : formatValue('money', value)

// The tenant pays the whole heat pump maintenance bill.
const tenantShare = (month: MonthFigures, section: string) =>
  section === 'heatPumpMaintenance'
    ? month.heatPumpMaintenance.bill
    : (month[section as 'internet'] as { tenantShare: Figure }).tenantShare

const sections = computed(() =>
  SECTIONS.filter((section) => section.id !== 'common').map((section) => ({
    id: section.id,
    label: section.label,
    total: totals.value ? formatTotal(section.total, 'money', totals.value) : '',
    months: (period.file.value?.months ?? []).flatMap((entry, index) => {
      const figures = period.figures.value?.months[index]
      return typeof entry?.month === 'string' && figures
        ? [{ label: monthLabel(entry.month), amount: money(tenantShare(figures, section.id)) }]
        : []
    }),
  })),
)

const direction = computed(() => {
  const t = totals.value
  if (!t || t.settlementAmount === undefined) return undefined
  const amount = money(t.settlementAmount)
  return t.settlementDirection === 'landlordToTenant'
    ? fr.period.settlement.landlordOwes(amount)
    : fr.period.settlement.tenantOwes(amount)
})
</script>

<template>
  <p v-if="period.status.value === 'loading'" data-testid="period-loading">
    {{ fr.period.loading }}
  </p>
  <p v-else-if="period.status.value === 'not-found'" data-testid="period-not-found">
    {{ fr.period.notFound }}
  </p>
  <div v-else-if="period.status.value === 'error' || period.status.value === 'misconfigured'">
    <Button data-testid="period-retry" @click="period.retry()">{{ fr.period.retry }}</Button>
  </div>
  <div v-else class="flex max-w-xl flex-col gap-4" data-testid="settlement">
    <h1 class="text-2xl font-semibold">
      {{ fr.period.settlement.title }} {{ period.file.value?.periodName }}
      <span v-if="!period.file.value?.closedOn" data-testid="settlement-provisional"
        >({{ fr.period.settlement.provisional }})</span
      >
    </h1>
    <div
      v-if="period.isReadOnly.value"
      role="status"
      data-testid="period-read-only"
      class="border-theme-warning bg-theme-warning/10 text-foreground flex items-start gap-3 rounded-lg border p-3"
    >
      <IconTriangleAlert class="text-theme-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p>{{ fr.period.readOnlyNotice }}</p>
    </div>
    <section
      v-for="section in sections"
      :key="section.id"
      :data-testid="`settlement-${section.id}`"
    >
      <h2 class="flex justify-between gap-2 font-medium">
        <span>{{ section.label }}</span>
        <span class="tabular-nums" data-testid="section-total">{{ section.total }}</span>
      </h2>
      <dl class="text-muted-foreground text-sm">
        <div v-for="month in section.months" :key="month.label" class="flex justify-between gap-2">
          <dt>{{ month.label }}</dt>
          <dd class="tabular-nums">{{ month.amount }}</dd>
        </div>
      </dl>
    </section>
    <dl class="flex flex-col gap-1 border-t pt-3">
      <div class="flex justify-between gap-2">
        <dt>{{ fr.period.settlement.totalTenantShares }}</dt>
        <dd class="tabular-nums" data-testid="total-tenant-shares">
          {{ money(totals?.totalTenantShares) }}
        </dd>
      </div>
      <div class="flex justify-between gap-2">
        <dt>{{ fr.period.settlement.advancesReceived }}</dt>
        <dd class="tabular-nums" data-testid="advances-received">
          {{ money(totals?.advancesReceived) }}
        </dd>
      </div>
      <div class="flex justify-between gap-2 font-semibold">
        <dt>{{ fr.period.settlement.balance }}</dt>
        <dd class="tabular-nums" data-testid="balance">{{ money(totals?.balance) }}</dd>
      </div>
    </dl>
    <p class="text-lg font-semibold" data-testid="settlement-direction">
      {{ direction ?? fr.period.table.empty }}
    </p>
    <p data-testid="next-advance">
      {{ fr.period.settlement.nextAdvance }} : {{ money(totals?.nextAdvance) }}
      <span class="text-muted-foreground text-sm"
        >({{ fr.period.settlement.nextAdvanceAverage(money(totals?.averageAdvance)) }})</span
      >
    </p>
  </div>
</template>
