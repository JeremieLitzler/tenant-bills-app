// Period state, a singleton composable (docs/architecture.md, "State"). The module of the loaded
// periods: the list, one period's loading and refresh, and `setCell`, which composes the loaded copy
// with the save queue (src/composables/useSaveQueue.ts). It imports the session state, never the
// reverse. Queue concerns belong in useSaveQueue.ts, not here.
import { computed, type MaybeRefOrGetter, readonly, ref, toValue, watch } from 'vue'

import { expireOnUnauthorized } from '@/composables/expireOnUnauthorized'
import { pendingCount, pendingCountFor } from '@/composables/pendingPatches'
import { useSaveQueue } from '@/composables/useSaveQueue'
import { useSession } from '@/composables/useSession'
import { misconfiguredToast, useToasts } from '@/composables/useToasts'
import { newPeriodFile, type NewPeriodValues } from '@/domain/newPeriod'
import { serializePeriodFile } from '@/domain/serializePeriodFile'
import { fr } from '@/i18n/fr'
import { applyPatch, MONTH_FIELD } from '@/domain/applyPatch'
import { estimatedIndexes, staleEstimates } from '@/domain/estimateTwelfthMonth'
import { initializeMonth } from '@/domain/initializeMonth'
import { MAX_MONTHS } from '@/domain/monthConstants'
import { monthCompleteness } from '@/domain/monthCompleteness'
import { computePeriodFigures, type PeriodFigures } from '@/domain/periodFigures'
import type { MonthEntry, PeriodFile } from '@/domain/periodFile'
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
import { readEstimate, removeEstimate, saveEstimate } from '@/sync/estimateCopies'
import { savePeriodCopy } from '@/sync/periodCopies'

// "Se déconnecter" confirms with the real count of queued edits.
useSession().setPendingCountSource(() => pendingCount.value)

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
// copy only when they differ. Never runs while edits are pending, so none is discarded. `silentUnlessUpdated`
// is the check made when a page opens: only a pulled change is told, not "up to date" or a failure.
async function refreshPeriod(id: string, silentUnlessUpdated = false): Promise<void> {
  const entry = periodEntries.value[id]
  if (entry?.status !== 'ready' || entry.refresh === 'refreshing' || pendingCountFor(id) > 0) {
    return
  }
  const { notify } = useToasts()
  entry.refresh = 'refreshing'
  try {
    if ((await getPeriodSha(id)) === entry.sha) {
      entry.refresh = 'up-to-date'
      if (!silentUnlessUpdated) notify({ level: 'info', message: fr.period.refresh.upToDate })
      return
    }
    const content = await getPeriodFile(id)
    const { file, problems } = validatePeriodFile(content.json)
    if (file) await savePeriodCopy({ id, ...content })
    if (!file) {
      entry.refresh = 'failed'
      if (!silentUnlessUpdated) notify({ level: 'error', message: fr.period.refresh.failed })
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
    if (!silentUnlessUpdated) notify({ level: 'error', message: fr.period.refresh.failed })
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

// The previous period's id: the same form one year earlier, for an id running from one year to the
// next (2026-2027) or within one year (2026-2026). Any other id has none, so the lookup never
// reads the period itself. shortcut: the id format is the only link between periods; upgrade
// when the file carries its predecessor.
function previousPeriodId(id: string): string | undefined {
  const match = /^(\d{4})-(\d{4})$/.exec(id)
  if (!match) return undefined
  const [from, to] = [Number(match[1]), Number(match[2])]
  return to === from || to === from + 1 ? `${from - 1}-${to - 1}` : undefined
}

// The previous period's twelfth month, for the estimate: undefined when that period does not exist
// (the estimate then falls back to this period's eleventh month). Any other failure throws.
async function readPreviousTwelfth(id: string): Promise<MonthEntry | undefined> {
  const previous = previousPeriodId(id)
  if (!previous) return undefined
  try {
    return validatePeriodFile((await getPeriodFile(previous)).json).file?.months[MAX_MONTHS - 1]
  } catch (error) {
    if (error instanceof NotFoundError) return undefined
    expireOnUnauthorized(error)
    throw error
  }
}

// "Initialiser le mois suivant" (docs/scenarios.md, Cases 3 and 6): queues the new month as one
// patch. Only the twelfth month needs the previous period's file.
async function initializeNextMonth(id: string): Promise<void> {
  const file = periodEntries.value[id]?.file
  if (!file) return
  let previousTwelfth: MonthEntry | undefined
  try {
    if (file.months.length === MAX_MONTHS - 1) previousTwelfth = await readPreviousTwelfth(id)
  } catch {
    useToasts().notify({ level: 'error', message: fr.period.initializeMonth.failed })
    return
  }
  const next = initializeMonth(file, previousTwelfth)
  if (!next) return
  // Kept until the real reading is confirmed, so the confirmation can list what is still estimated.
  if (next.common.estimated) await saveEstimate(id, next.month, estimatedIndexes(next))
  await setCell(id, next.month, MONTH_FIELD, next)
}

// The current indexes of an estimated month still equal to their estimate, as line ids
// (docs/period-file.md, "The estimated twelfth month"); undefined when this device holds no copy
// of the estimate (another device initialized the month, or the browser data was cleared).
async function indexesStillEstimated(id: string, month: string): Promise<string[] | undefined> {
  const entry = periodEntries.value[id]?.file?.months.find((m) => m.month === month)
  const estimate = entry && (await readEstimate(id, month))
  if (!estimate) return undefined
  return Object.keys(estimate).filter((field) => {
    const [section, key] = field.split('.')
    return (entry[section as 'electricity'] as Record<string, unknown>)[key] === estimate[field]
  })
}

// After a `tariffMode` change on an estimated month: removes the estimated indexes of the tariffs
// it no longer reads, in either direction (hchp to base, base to hchp).
async function clearStaleEstimates(id: string, month: string): Promise<void> {
  const entry = periodEntries.value[id]?.file?.months.find((m) => m.month === month)
  const estimate = entry?.common.estimated ? await readEstimate(id, month) : undefined
  if (!entry || !estimate) return
  for (const field of staleEstimates(entry, estimate)) await setCell(id, month, field, null)
}

// "Confirmer le relevé réel": removes the flag and forgets the estimate.
async function confirmReading(id: string, month: string): Promise<void> {
  await setCell(id, month, 'common.estimated', null)
  await removeEstimate(id, month)
}

// Sends the queue and gives each written period its new SHA. Run by `setCell`, on app load and when
// the browser comes back online (App.vue). Sign-in is a full-page return from GitHub, so it is the app load.
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
    // `available`: the last month is complete and a next one can start; `incomplete`: it must be
    // completed first; `none`: no month yet, twelve months, closed or read-only.
    nextMonth: computed<'available' | 'incomplete' | 'none'>(() => {
      const entry = periodEntries.value[toValue(id)]
      const last = entry?.file?.months.at(-1)
      if (!last || entry.file?.closedOn || entry.problems.length) return 'none'
      if ((entry.file?.months.length ?? 0) >= MAX_MONTHS) return 'none'
      return monthCompleteness(last).complete ? 'available' : 'incomplete'
    }),
    initializeNextMonth: () => initializeNextMonth(toValue(id)),
    indexesStillEstimated: (month: string) => indexesStillEstimated(toValue(id), month),
    clearStaleEstimates: (month: string) => clearStaleEstimates(toValue(id), month),
    confirmReading: (month: string) => confirmReading(toValue(id), month),
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
    // Reads the queue in IndexedDB into the counts; App.vue runs it on load, before any drain ends.
    loadPendingCounts: () => useSaveQueue().syncPendingCounts(),
    pendingCount: readonly(pendingCount),
    syncState: useSaveQueue().syncState,
    pendingCountFor,
  }
}
