// PROTOTYPE (issue #9): binds the keyboard grid to the line definitions. Grid rows
// are the lines in order (section header rows are skipped, Q10); grid columns are months.
import { cellView, commitEdit, editText, lines, monthIds } from './model'
import { useGrid } from './useGrid'

export function usePeriodGrid() {
  return useGrid({
    rowCount: () => lines.length,
    colCount: monthIds.length,
    isEditable: (r, c) => cellView(c, lines[r]).editable,
    editText: (r, c) => {
      const line = lines[r]
      return line.type === 'input' ? editText(c, line) : ''
    },
    commit: (r, c, text, initial) => {
      const line = lines[r]
      if (line.type === 'input') commitEdit(c, line, text, initial)
    },
  })
}
