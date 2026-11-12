// Period state, a singleton composable (docs/architecture.md, "State"). The only module reaching
// src/sync/. For now it holds the period list and the periods opened so far; the queue and the
// pending count come with F3 (#30). It imports the session state, never the reverse.
import { computed, type MaybeRefOrGetter, readonly, ref, toValue, watch } from 'vue'

import { pendingCountFor } from '@/composables/pendingPatches'
import { useSession } from '@/composables/useSession'
import type { PeriodFile } from '@/domain/periodFile'
import { type PeriodFileProblem, validatePeriodFile } from '@/domain/validatePeriodFile'
import {
  getPeriodFile,
  getPeriodSha,
  listPeriodIds,
  NotFoundError,
  UnauthorizedError,
} from '@/sync/periodsApi'

type ListStatus = 'idle' | 'loading' | 'ready' | 'error'

const periodIds = ref<string[]>([])
const listStatus = ref<ListStatus>('idle')

type PeriodStatus = 'loading' | 'ready' | 'not-found' | 'error'

// The outcome of the last "Rafraîchir": `refreshing` while it runs, `failed` when the copy could
// not be compared or replaced (the loaded copy is kept).
export type RefreshStatus = 'idle' | 'refreshing' | 'up-to-date' | 'updated' | 'failed'

interface PeriodEntry {
  status: PeriodStatus
  refresh: RefreshStatus
  file?: PeriodFile
  sha?: string
  problems: PeriodFileProblem[]
}

function entryWith(
  status: PeriodStatus,
  rest: Partial<Omit<PeriodEntry, 'status'>> = {},
): PeriodEntry {
  return { status, refresh: 'idle', problems: [], ...rest }
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
  const currentStatus = periodEntries.value[id]?.status
  if (currentStatus === 'loading' || currentStatus === 'ready') {
    return
  }
  periodEntries.value[id] = entryWith('loading')
  try {
    const content = await getPeriodFile(id)
    const { file, problems } = validatePeriodFile(content.json, id)
    periodEntries.value[id] = file
      ? entryWith('ready', { file, sha: content.sha, problems })
      : entryWith('error')
  } catch (error) {
    if (error instanceof NotFoundError) {
      periodEntries.value[id] = entryWith('not-found')
      return
    }
    periodEntries.value[id] = entryWith('error')
    if (error instanceof UnauthorizedError) {
      useSession().expire()
    }
  }
}

// Pulls the other device's changes: compares the remote SHA with the loaded copy and replaces the
// copy only when they differ. Never runs while edits are pending, so none is discarded.
async function refreshPeriod(id: string): Promise<void> {
  const entry = periodEntries.value[id]
  if (entry?.status !== 'ready' || entry.refresh === 'refreshing' || pendingCountFor(id) > 0) {
    return
  }
  entry.refresh = 'refreshing'
  try {
    if ((await getPeriodSha(id)) === entry.sha) {
      entry.refresh = 'up-to-date'
      return
    }
    const content = await getPeriodFile(id)
    const { file, problems } = validatePeriodFile(content.json, id)
    if (!file) {
      entry.refresh = 'failed'
      return
    }
    periodEntries.value[id] = entryWith('ready', {
      file,
      sha: content.sha,
      problems,
      refresh: 'updated',
    })
  } catch (error) {
    entry.refresh = 'failed'
    if (error instanceof UnauthorizedError) {
      useSession().expire()
    }
  }
}

// One period, called by a page on setup with its route param. Loads the file when it is not held
// yet and again when the identifier changes. `file` is read-only: every edit goes through the
// patch queue (ADR 0004), never into the object.
export function usePeriod(id: MaybeRefOrGetter<string>) {
  watch(
    () => toValue(id),
    (value) => void loadPeriod(value),
    { immediate: true },
  )
  const periodEntry = computed(() => periodEntries.value[toValue(id)])
  return {
    status: computed<PeriodStatus>(() => periodEntry.value?.status ?? 'loading'),
    file: computed(() => {
      const file = periodEntry.value?.file
      return file ? readonly(file) : undefined
    }),
    sha: computed(() => periodEntry.value?.sha),
    problems: computed(() => periodEntry.value?.problems ?? []),
    // The file broke a validation rule: the app shows it but never writes it.
    isReadOnly: computed(() => (periodEntry.value?.problems.length ?? 0) > 0),
    refreshStatus: computed<RefreshStatus>(() => periodEntry.value?.refresh ?? 'idle'),
    // "Rafraîchir" is available once the period is loaded, unless edits are waiting to be saved.
    canRefresh: computed(
      () =>
        periodEntry.value?.status === 'ready' &&
        periodEntry.value.refresh !== 'refreshing' &&
        pendingCountFor(toValue(id)) === 0,
    ),
    refresh: () => refreshPeriod(toValue(id)),
  }
}

export function usePeriods() {
  return {
    periodIds: readonly(periodIds),
    listStatus: readonly(listStatus),
    loadPeriodIds,
    pendingCountFor,
  }
}
