<script setup lang="ts">
// PROTOTYPE (#124) — the month column headers; a click opens the form on that month (Q11).
import { TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { file, url } from './state'

const open = (month: string) => Object.assign(url, { page: 'form', month })
</script>

<template>
  <TableHeader>
    <TableRow>
      <TableHead class="bg-background sticky top-0 left-0 z-30 w-56 min-w-56">Libellé</TableHead>
      <TableHead v-for="m in file.months" :key="m.month" class="bg-background sticky top-0 z-20 text-right">
        <button type="button" class="underline" @click="open(m.month)">{{ m.month }}</button>
      </TableHead>
    </TableRow>
  </TableHeader>
</template>
