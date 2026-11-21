// Period state, a singleton composable (docs/architecture.md, "State"). The module of the loaded
// periods: the list, one period's loading and refresh, and `setCell`, which composes the loaded copy
// with the save queue (src/composables/useSaveQueue.ts). It imports the session state, never the
// reverse. Concerns that will grow with #51 (sign-in drain) belong in useSaveQueue.ts, not here.
import { computed, type MaybeRefOrGetter, readonly, ref, toValue, watch } from 'vue'

import { expireOnUnauthorized } from '@/composables/expireOnUnauthorized'
import { pendingCount, pendingCountFor } from '@/composables/pendingPatches'
import { useSaveQueue } from '@/composables/useSaveQueue'
import { misconfiguredToast, useToasts } from '@/composables/useToasts'
import { newPeriodFile, type NewPeriodValues } from '@/domain/newPeriod'
import { serializePeriodFile } from '@/domain/serializePeriodFile'
import { fr } from '@/i18n/fr'
import { applyPatch } from '@/domain/applyPatch'
import { computePeriodFigures, type PeriodFigures } from '@/domain/periodFigures'
import type { PeriodFile } from '@/domain/periodFile'
import { type PeriodFileProblem, validatePeriodFile } from '@/domain/validatePeriodFile'
import {
  getPeriodFile,
  getPeriodSha,
  listPeriodIds,
  MisconfiguredError,
  NotFoundError,
  putPeriodFile,
} from '@/sync/periodsApi'
import { loadPeriodWithCopy } from '@/sync/loadPeriod'
import { savePeriodCopy } from '@/sync/periodCopies'

type ListStatus = 'idle' | 'loading' | 'ready' | 'error' | 'misconfigured'

const periodIds = ref<string[]>([])
const listStatus = ref<ListStatus>('idle')

type PeriodStatus = 'loading' | 'ready' | 'not-found' | 'error' | 'misconfigured'

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

// A misconfigured proxy gets its own status (a full-page notice); every other failure is `error`.
function failureStatus(error: unknown): 'error' | 'misconfigured' {
  return error instanceof MisconfiguredError ? 'misconfigured' : 'error'
}

// The load error of the list or of a period, told by a toast (the page keeps a "Réessayer" button).
function notifyLoadFailure(status: 'error' | 'misconfigured', message: string): void {
  useToasts().notify(status === 'misconfigured' ? misconfiguredToast : { level: 'error', message })
}

// Reads the periods folder through the proxy. A 401 ends the session (the app shell then
// redirects to the sign-in page); the state itself never redirects.
async function loadPeriodIds(): Promise<void> {
  // Q7 (#47): nothing here may clear queued edits when the proxy is misconfigured; see #30.
  listStatus.value = 'loading'
  try {
    periodIds.value = await listPeriodIds()
    listStatus.value = 'ready'
  } catch (error) {
    listStatus.value = failureStatus(error)
    notifyLoadFailure(listStatus.value, fr.periods.error)
    expireOnUnauthorized(error)
  }
}

// Reads one period file through the proxy and validates it. A 401 ends the session, as for the
// list. A file breaking a validation rule is still `ready`, flagged read-only through `problems`;
// JSON that is not shaped like a period file is an `error`.
async function loadPeriod(id: string, checkRemote = false): Promise<void> {
  const currentStatus = periodEntries.value[id]?.status
  if (currentStatus === 'ready' && checkRemote) await refreshPeriod(id, true)
  if (currentStatus === 'loading' || currentStatus === 'ready') {
    return
  }
  periodEntries.value[id] = entryWith('loading')
  try {
    const { file, problems, sha, fromCopy } = await loadPeriodWithCopy(id)
    periodEntries.value[id] = file
      ? entryWith('ready', { file, sha, problems })
      : entryWith('error')
    if (!file) notifyLoadFailure('error', fr.period.error)
    else if (fromCopy) useToasts().notify({ level: 'info', message: fr.period.localCopy })
  } catch (error) {
    if (error instanceof NotFoundError) {
      periodEntries.value[id] = entryWith('not-found')
      return
    }
    const status = failureStatus(error)
    periodEntries.value[id] = entryWith(status)
    notifyLoadFailure(status, fr.period.error)
    expireOnUnauthorized(error)
  }
}

// Pulls the other device's changes: compares the remote SHA with the loaded copy and replaces the
// copy only when they differ. Never runs while edits are pending, so none is discarded. `quiet` is
// the check made when a page opens: only a pulled change is told, not "up to date" or a failure.
async function refreshPeriod(id: string, quiet = false): Promise<void> {
  const entry = periodEntries.value[id]
  if (entry?.status !== 'ready' || entry.refresh === 'refreshing' || pendingCountFor(id) > 0) {
    return
  }
  const { notify } = useToasts()
  entry.refresh = 'refreshing'
  try {
    if ((await getPeriodSha(id)) === entry.sha) {
      entry.refresh = 'up-to-date'
      if (!quiet) notify({ level: 'info', message: fr.period.refresh.upToDate })
      return
    }
    const content = await getPeriodFile(id)
    const { file, problems } = validatePeriodFile(content.json)
    if (file) await savePeriodCopy({ id, ...content })
    if (!file) {
      entry.refresh = 'failed'
      if (!quiet) notify({ level: 'error', message: fr.period.refresh.failed })
      return
    }
    periodEntries.value[id] = entryWith('ready', {
      file,
      sha: content.sha,
      problems,
      refresh: 'updated',
    })
    notify({ level: 'info', message: fr.period.refresh.updated })
  } catch (error) {
    entry.refresh = 'failed'
    if (!quiet) notify({ level: 'error', message: fr.period.refresh.failed })
    expireOnUnauthorized(error)
  }
}

// Creates the period file in one commit (docs/architecture.md, "Period creation commit"). It needs
// the network: nothing is queued, so offline it rejects (shortcut: a queued creation is the F9
// grilling). Rejects with PeriodExistsError when the file is already there. The new period joins the
// list; its copy is loaded on first opening.
async function createPeriod(id: string, values: NewPeriodValues): Promise<void> {
  try {
    await putPeriodFile(
      id,
      serializePeriodFile(newPeriodFile(id, values)),
      undefined,
      `data(${id}): create period`,
    )
  } catch (error) {
    expireOnUnauthorized(error)
    throw error
  }
  if (!periodIds.value.includes(id)) periodIds.value = [...periodIds.value, id].sort()
  delete periodEntries.value[id]
}

// Queues the patch, applies it to the loaded copy, drains, and takes the new SHAs. Throws when the
// period cannot be edited (not loaded, read-only or closed): the caller checks `isReadOnly` first.
async function setCell(id: string, month: string | null, field: string, value: unknown) {
  const entry = periodEntries.value[id]
  if (entry?.status !== 'ready' || !entry.file) {
    throw new Error(
      `The period ${id} cannot be edited: it is not loaded (status: ${entry?.status})`,
    )
  }
  if (entry.problems.length) {
    throw new Error(
      `The period ${id} cannot be edited: it is read-only (${entry.problems.join(', ')})`,
    )
  }
  if (entry.file.closedOn) {
    throw new Error(`The period ${id} cannot be edited: it is closed (${entry.file.closedOn})`)
  }
  const patch = { period: id, month, field, value }
  await useSaveQueue().enqueue(patch)
  applyPatch(entry.file, patch)
  await drainQueued()
}

// Sends the queue and gives each written period its new SHA. Run by `setCell`, on app load and when
// the browser comes back online (App.vue); the sign-in trigger is #51's.
async function drainQueued(): Promise<void> {
  for (const [periodId, sha] of await useSaveQueue().drain()) {
    const written = periodEntries.value[periodId]
    if (written) written.sha = sha
  }
}

// One period, called by a page on setup with its route param. Loads the file when it is not held
// yet and again when the identifier changes. A page passes `checkRemote` to also pull the other
// device's changes when it opens a period already held (the SHA check of every load). `file` is read-only: every edit goes through the
// patch queue (ADR 0010), never into the object.
export function usePeriod(id: MaybeRefOrGetter<string>, { checkRemote = false } = {}) {
  watch(
    () => toValue(id),
    (value) => void loadPeriod(value, checkRemote),
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
    // Computed once from the file, read by the views. Undefined without a file, and for a read-only
    // file with malformed month entries (shortcut: any throw means malformed, so no table).
    figures: computed<PeriodFigures | undefined>(() => {
      const file = periodEntry.value?.file
      try {
        return file && computePeriodFigures(file)
      } catch {
        return undefined
      }
    }),
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
    // The "Réessayer" button of a failed load: the same load again.
    retry: () => loadPeriod(toValue(id)),
    // Enqueues a patch (ADR 0010); `month` is null for a top-level value. Resolves once drained and
    // throws when the period cannot be edited.
    setCell: (month: string | null, field: string, value: unknown) =>
      setCell(toValue(id), month, field, value),
  }
}

export function usePeriods() {
  return {
    periodIds: readonly(periodIds),
    listStatus: readonly(listStatus),
    loadPeriodIds,
    createPeriod,
    drainQueued,
    pendingCount: readonly(pendingCount),
    syncState: useSaveQueue().syncState,
    pendingCountFor,
  }
}
