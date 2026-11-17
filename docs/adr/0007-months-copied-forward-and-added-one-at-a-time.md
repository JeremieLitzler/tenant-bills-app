# A month is copied from the previous one and added one at a time, with both indexes stored

A period file holds one to twelve months, in order, and the app adds the next one when the landlord initializes it. The new month is a copy of the previous one: every inheritable value is copied as stored, and each meter's previous index takes the previous month's current index. A month is therefore read exactly as stored, with no resolution step; current indexes, the received tenant bill advance and the heat pump amount are not copied. Each month stores `startDate` and `endDate` (the new `startDate` is the previous `endDate`) and a `month: "YYYY-MM"` set at initialization and never edited. A period may start in any month, because it follows the tenant's entrance, and holds at most twelve months. The user interface shows only the months present in the file.

Nothing the app can compute is stored: the period status and whether a month is complete are computed, and only `closedOn` is kept. The estimated twelfth month is marked by a stored `common.estimated` flag, which also blocks closing the period.

Initializing a month is one queued patch whose value is the whole new month object, drained like any other patch (ADR 0010). A correction in a past month does not reach the later months by itself: after the edit of an inheritable value, one Yes/No dialog offers to apply it to all the following months, and the edit of a current index offers to set the next month's previous index. The existing `2025-2026` file is converted once by a script to `schemaVersion: 2`; the app reads only that shape and opens an older one read-only.

## Considered options

- **Keep display-time inheritance**: rejected, because resolving a value through earlier months, with provenance, was the main source of domain code and special cases (first month, tariff switch, meter replacement).
- **Twelve fixed months created with the period**: rejected, because copying at initialization needs the previous month to exist.
- **Apply a correction only to the later months that still hold the old value**: rejected for one Yes/No dialog that overwrites all of them, which is simpler to explain.

## Consequences

- A stale value is possible after a correction the user declines to apply; the dialog is the only guard.
- The domain no longer needs `resolveValue` or provenance; the figures read each month as stored.
- The data repo and the golden fixtures use the new shape, and every ticket that read the old one is re-scoped.
