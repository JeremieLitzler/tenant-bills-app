# Edits are per-cell patches drained one PUT at a time, rebased automatically on conflict

Each blur stores a patch `{ period, month, field, value }` in an IndexedDB queue and applies it to the local copy; a single `drainQueue()` sends every queued patch as one GitHub Contents API `PUT`, never two at once. On a 409 (the other device wrote the file), the app pulls the remote file, re-applies the same patches on top of it and retries once, so the queued edit wins on a cell changed on both sides.

This deliberately differs from `french-gas-stations-scraper`, which sends whole-file writes and asks for a manual pull on conflict: here edits are typed on two devices (phone for readings, computer for the table) and are small and independent, so replaying them is safe, while a manual pull would discard a meter reading typed offline.
