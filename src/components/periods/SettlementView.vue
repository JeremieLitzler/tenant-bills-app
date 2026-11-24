<script setup lang="ts">
// The settlement (F8): who owes whom, while the period is open too. It only reads the period's
// figures; every amount comes from the domain, so it matches the period table.
import { computed } from 'vue'

import IconTriangleAlert from '@/components/icons/IconTriangleAlert.vue'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

// A read-only file can hold malformed entries: keep only the months that have a name.
const columns = computed(() =>
  (period.file.value?.months ?? []).flatMap((entry, index) => {
    const figures = period.figures.value?.months[index]
    return typeof entry?.month === 'string' && figures
      ? [{ month: entry.month, label: monthLabel(entry.month), entry, figures }]
      : []
  }),
)

const sections = computed(() =>
  SECTIONS.filter((section) => section.id !== 'common').map((section) => ({
    id: section.id,
    label: section.label,
    total: totals.value ? formatTotal(section.total, 'money', totals.value) : '',
    amounts: columns.value.map((column) => money(tenantShare(column.figures, section.id))),
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
  <div v-else class="flex flex-col gap-4" data-testid="settlement">
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
    <Table
      data-testid="settlement-table"
      container-class="max-h-[calc(100vh-8rem)] overflow-auto scroll-pl-56 max-md:scroll-pl-52"
      class="w-max min-w-full border-separate border-spacing-0"
    >
      <TableHeader>
        <TableRow>
          <TableHead
            class="bg-background sticky top-0 left-0 z-30 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ fr.period.table.label }}</TableHead
          >
          <TableHead class="bg-background sticky top-0 z-20">{{ fr.period.table.total }}</TableHead>
          <TableHead
            v-for="column in columns"
            :key="column.month"
            class="bg-background sticky top-0 z-20"
            >{{ column.label }}</TableHead
          >
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="section in sections"
          :key="section.id"
          :data-testid="`settlement-${section.id}`"
        >
          <TableHead
            scope="row"
            class="bg-background sticky left-0 z-10 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ section.label }}</TableHead
          >
          <TableCell class="text-right font-medium tabular-nums" data-testid="section-total">{{
            section.total
          }}</TableCell>
          <TableCell
            v-for="(amount, index) in section.amounts"
            :key="columns[index].month"
            class="text-right tabular-nums"
            >{{ amount }}</TableCell
          >
        </TableRow>
        <TableRow class="bg-muted font-medium">
          <TableHead
            scope="row"
            class="bg-muted sticky left-0 z-10 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ fr.period.settlement.totalTenantShares }}</TableHead
          >
          <TableCell class="text-right tabular-nums" data-testid="total-tenant-shares">{{
            money(totals?.totalTenantShares)
          }}</TableCell>
          <TableCell :colspan="columns.length" />
        </TableRow>
        <TableRow>
          <TableHead
            scope="row"
            class="bg-background sticky left-0 z-10 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ fr.period.settlement.advancesReceived }}</TableHead
          >
          <TableCell class="text-right tabular-nums" data-testid="advances-received">{{
            money(totals?.advancesReceived)
          }}</TableCell>
          <TableCell
            v-for="column in columns"
            :key="column.month"
            class="text-right tabular-nums"
            >{{ money(column.entry.common.tenantBillAdvance) }}</TableCell
          >
        </TableRow>
        <TableRow class="font-semibold">
          <TableHead
            scope="row"
            class="bg-background sticky left-0 z-10 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ fr.period.settlement.balance }}</TableHead
          >
          <TableCell class="text-right tabular-nums" data-testid="balance">{{
            money(totals?.balance)
          }}</TableCell>
          <TableCell :colspan="columns.length" data-testid="settlement-direction">{{
            direction ?? fr.period.table.empty
          }}</TableCell>
        </TableRow>
        <TableRow data-testid="next-advance">
          <TableHead
            scope="row"
            class="bg-background sticky left-0 z-10 w-56 min-w-56 max-md:w-52 max-md:min-w-52 max-md:whitespace-normal"
            >{{ fr.period.settlement.nextAdvance }}</TableHead
          >
          <TableCell class="text-right tabular-nums">{{ money(totals?.nextAdvance) }}</TableCell>
          <TableCell :colspan="columns.length" class="text-muted-foreground text-sm">{{
            fr.period.settlement.nextAdvanceAverage(money(totals?.averageAdvance))
          }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
