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

  it('has a body only when more than one group is edited', () => {
    expect(commitMessage('2026-2027', [patch('2026-10'), patch('2026-10', 'internet.x')])).toBe(
      'data(2026-2027): 2 edits in 2026-10',
    )
    expect(commitMessage('2026-2027', [patch('2026-10'), patch('2026-11')])).toBe(
      'data(2026-2027): 2 edits in 2 months\n\n2026-10: 1 edit\n2026-11: 1 edit',
    )
    expect(commitMessage('2026-2027', [patch('2026-10'), patch(null)])).toBe(
      'data(2026-2027): 2 edits in 2026-10 and settings\n\n2026-10: 1 edit\nsettings: 1 edit',
    )
  })

  it('lists months in period order, settings last', () => {
    const patches = [patch(null), patch('2026-11'), patch('2026-09')]
    expect(commitMessage('2026-2027', patches)).toBe(
      'data(2026-2027): 3 edits in 2 months and settings\n\n2026-09: 1 edit\n2026-11: 1 edit\nsettings: 1 edit',
    )
  })

  it('counts removals', () => {
    const removal = { ...patch('2026-10'), value: null }
    expect(commitMessage('2026-2027', [removal, patch('2026-10', 'internet.x')])).toBe(
      'data(2026-2027): 2 edits in 2026-10',
    )
  })

  it('keeps the initialize subject and lists the other edits in the body', () => {
    expect(
      commitMessage('2026-2027', [patch('2026-10', 'month'), patch('2026-10'), patch(null)]),
    ).toBe('data(2026-2027): initialize 2026-10\n\n2026-10: 1 edit\nsettings: 1 edit')
  })
})
