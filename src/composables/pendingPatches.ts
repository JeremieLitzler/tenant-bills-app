// Edits not yet saved on one period. Always zero until the patch queue exists (F3, #30), which
// replaces this body; "Rafraîchir" is already gated on it (src/composables/usePeriods.ts).
export function pendingCountFor(id: string): number {
  void id
  return 0
}
