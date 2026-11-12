// Period state, a singleton composable (docs/architecture.md, "State"). The only module reaching
// src/sync/. For now it holds the period list and the periods opened so far; the queue and the
// pending count come with F3 (#30). It imports the session state, never the reverse.
import { computed, type MaybeRefOrGetter, readonly, ref, toValue, watch } from 'vue'

import { useSession } from '@/composables/useSession'
import type { PeriodFile } from '@/domain/periodFile'
import { type PeriodFileProblem, validatePeriodFile } from '@/domain/validatePeriodFile'
import { getPeriodFile, listPeriodIds, UnauthorizedError } from '@/sync/periodsApi'

type ListStatus = 'idle' | 'loading' | 'ready' | 'error'

const periodIds = ref<string[]>([])
const listStatus = ref<ListStatus>('idle')

type PeriodStatus = 'loading' | 'ready' | 'not-found' | 'error'

interface PeriodEntry {
  status: PeriodStatus
  file?: PeriodFile
  sha?: string
  problems: PeriodFileProblem[]
}

// Every period opened so far, keyed by its identifier, for the browser session. A period that is
// ready is never fetched again; a not-found or failed one is asked again on the next opening.
const periodEntries = ref<Record<string, PeriodEntry>>({})

// Reads the periods folder through the proxy. A 401 ends the session (the app shell then
// redirects to the sign-in page); the state itself never redirects.
async function loadPeriodIds(): Promise<void> {
  listStatus.value = 'loading'
  try {
    periodIds.value = await listPeriodIds()
    listStatus.value = 'ready'
  } catch (error) {
    listStatus.value = 'error'
    if (error instanceof UnauthorizedError) {
      useSession().expire()
    }
  }
}

// Reads one period file through the proxy and validates it. A 401 ends the session, as for the
// list. A file breaking a validation rule is still `ready`, flagged read-only through `problems`;
// JSON that is not shaped like a period file is an `error`.
async function loadPeriod(id: string): Promise<void> {
  const known = periodEntries.value[id]?.status
  if (known === 'loading' || known === 'ready') {
    return
  }
  periodEntries.value[id] = { status: 'loading', problems: [] }
  try {
    const content = await getPeriodFile(id)
    if (!content) {
      periodEntries.value[id] = { status: 'not-found', problems: [] }
      return
    }
    const { file, problems } = validatePeriodFile(content.json, id)
    periodEntries.value[id] = file
      ? { status: 'ready', file, sha: content.sha, problems }
      : { status: 'error', problems: [] }
  } catch (error) {
    periodEntries.value[id] = { status: 'error', problems: [] }
    if (error instanceof UnauthorizedError) {
      useSession().expire()
    }
  }
}

// One period, called by a page on setup with its route param. Loads the file when it is not held
// yet and again when the identifier changes.
export function usePeriod(id: MaybeRefOrGetter<string>) {
  watch(
    () => toValue(id),
    (value) => void loadPeriod(value),
    { immediate: true },
  )
  const entry = computed(() => periodEntries.value[toValue(id)])
  return {
    status: computed<PeriodStatus>(() => entry.value?.status ?? 'loading'),
    file: computed(() => entry.value?.file),
    sha: computed(() => entry.value?.sha),
    problems: computed(() => entry.value?.problems ?? []),
    // The file broke a validation rule: the app shows it but never writes it.
    isReadOnly: computed(() => (entry.value?.problems.length ?? 0) > 0),
  }
}

export function usePeriods() {
  return {
    periodIds: readonly(periodIds),
    listStatus: readonly(listStatus),
    loadPeriodIds,
  }
}
