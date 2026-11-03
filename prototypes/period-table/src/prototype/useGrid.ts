// PROTOTYPE (issue #9): the keyboard model settled in the grilling (Q4, Q6 to Q10b),
// shared by the three versions. Neither shadcn-vue nor TanStack Table provides it.
import { nextTick, reactive, ref, watch } from 'vue'

export interface GridAdapter {
  rowCount: () => number
  colCount: number
  isEditable: (r: number, c: number) => boolean
  editText: (r: number, c: number) => string
  commit: (r: number, c: number, text: string, initial: string) => void
}

export function useGrid(a: GridAdapter) {
  const root = ref<HTMLElement | null>(null)
  const row = ref(0)
  const col = ref(0)
  const editing = ref(false)
  const draft = ref('')
  const initial = ref('')
  const prefix = `g${Math.random().toString(36).slice(2, 7)}`

  const cellId = (r: number, c: number) => `${prefix}-${r}-${c}`
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, v))

  watch([row, col], async () => {
    await nextTick()
    document.getElementById(cellId(row.value, col.value))?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })

  function focusRoot() {
    root.value?.focus({ preventScroll: true })
  }
  function select(r: number, c: number) {
    row.value = r
    col.value = c
    editing.value = false
    focusRoot()
  }
  function startEdit(char?: string) {
    if (!a.isEditable(row.value, col.value)) return
    initial.value = a.editText(row.value, col.value)
    draft.value = char ?? initial.value
    editing.value = true
  }
  function edit(r: number, c: number) {
    select(r, c)
    startEdit()
  }
  function commitCurrent() {
    a.commit(row.value, col.value, draft.value, initial.value)
  }

  // Selection mode: keys on the grid root (the table's single Tab stop, Q7).
  function onRootKeydown(e: KeyboardEvent) {
    if (editing.value) return
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const move = moves[e.key]
    if (move) {
      e.preventDefault()
      row.value = clamp(row.value + move[0], a.rowCount())
      col.value = clamp(col.value + move[1], a.colCount)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      startEdit()
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!a.isEditable(row.value, col.value)) return
      e.preventDefault()
      startEdit(e.key) // Q9: typing replaces the value
    }
  }

  // Edit mode: keys on the cell's input.
  function onInputKeydown(e: KeyboardEvent) {
    e.stopPropagation()
    if (e.key === 'Escape') {
      e.preventDefault()
      editing.value = false // Q8: restore, enqueue nothing
      focusRoot()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commitCurrent()
      // Q10b: next editable cell down in the same month, staying in edit mode.
      for (let r = row.value + 1; r < a.rowCount(); r++) {
        if (a.isEditable(r, col.value)) {
          row.value = r
          initial.value = a.editText(r, col.value)
          draft.value = initial.value
          return
        }
      }
      editing.value = false
      focusRoot()
    }
  }
  // Leaving the cell any other way saves (F5: save on blur).
  function onInputBlur(r: number, c: number) {
    if (!editing.value || r !== row.value || c !== col.value) return
    commitCurrent()
    editing.value = false
  }

  return reactive({ root, row, col, editing, draft, cellId, select, edit, onRootKeydown, onInputKeydown, onInputBlur })
}

export type Grid = ReturnType<typeof useGrid>
