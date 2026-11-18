import { describe, expect, it } from 'vitest'

import type { Patch } from './applyPatch'
import { commitMessage } from './commitMessage'

const patch = (month: string | null, field = 'internet.billedAmount'): Patch => ({
  period: '2026-2027',
  month,
  field,
  value: 1,
})

describe('commitMessage', () => {
  it('names a single month or settings, with no body', () => {
    expect(commitMessage('2026-2027', [patch('2026-10')])).toBe(
      'data(2026-2027): 1 edit in 2026-10',
    )
    expect(commitMessage('2026-2027', [patch(null, 'closedOn')])).toBe(
      'data(2026-2027): 1 edit in settings',
    )
  })

  it('counts several months and settings, with a body', () => {
    const patches = [
      patch('2026-10'),
      patch('2026-10', 'internet.x'),
      patch('2026-11'),
      patch(null),
    ]
    expect(commitMessage('2026-2027', patches)).toBe(
      'data(2026-2027): 4 edits in 2 months and settings\n\n2026-10: 2 edits\n2026-11: 1 edit\nsettings: 1 edit',
    )
  })

  it('uses the initialize subject for a month patch', () => {
    expect(commitMessage('2026-2027', [patch('2026-10', 'month')])).toBe(
      'data(2026-2027): initialize 2026-10',
    )
  })
})
