# Scenarios

The journeys the app must allow, settled in the grilling [`2026-11-17-simplify-file-structure-and-formulas`](grillings/2026-11-17-simplify-file-structure-and-formulas/GRILLING-SUMMARY.md). The file structure they act on is in [`period-file.md`](period-file.md).

## Case 1 - User logs in

```mermaid
flowchart TD
    A[User logs in] --> B{User has a period?}
    B -- no --> C["App shows 'Aucune période trouvée.'"]
    C --> D[User clicks 'Add a period']
    D --> E[[Case 5 - User creates first period]]
    B -- yes --> F[User selects an existing period]
    F --> G[[Case 2 - User loads an existing period]]
```

## Case 2 - User loads an existing period

The app shows only the months present in the period file. The highlighted month is the one whose `startDate` and `endDate` contain the current date.

```mermaid
flowchart TD
    A[User browses an existing period] --> B[App highlights the current month]
    B --> C{Has the user typed all values of the month?}
    C -- yes --> D["App invites the user to initialize the next month: message and CTA"]
    D --> E[[Case 3 - User initializes the next month]]
    C -- no --> F["App shows a sticky static message and highlights every missing input"]
    F --> G[User types the missing inputs]
    G --> C
```

## Case 3 - User initializes the next month

```mermaid
flowchart TD
    A[User clicks the CTA to initialize the next month] --> B{Which month is the current one?}
    B -- "the 12th" --> C[App does not offer to initialize a next month]
    B -- "the 11th" --> D["App initializes the 12th month (steps below)"]
    D --> E[[Case 6 - App initializes the 12th month]]
    E --> F[[Case 4 - User initializes the next period]]
    B -- "any earlier month" --> G["App initializes the next month (steps below)"]
    subgraph INIT [Initialization of the new month]
        direction TB
        I1["month = YYYY-MM of the new startDate"] --> I2["startDate = previous month's endDate"]
        I2 --> I3["endDate = prefilled, see the functional breakdown grilling:<br/>the 15th when that is Thursday to Sunday, ..."]
        I3 --> I4["every Previous index = previous month's Current index"]
        I4 --> I5["every inherited value copied as stored from the previous month<br/>(Current indexes and tenantBillAdvance are not copied)"]
        I5 --> I6["heat pump billedAmount filled from heatPumpInvoiceEstimate"]
        I6 --> I7["tenantBillAdvance = 0"]
        I7 --> I8["One queued patch carries the whole new month object"]
    end
    G --> I1
    D --> I1
```

The prefilled `endDate` follows the paragraph containing "It is suggested as the 15th when that is Thursday to Sunday [...]" of the [functional breakdown grilling](grillings/2026-10-26-functional-breakdown/GRILLING-SUMMARY.md).

## Case 4 - User initializes the next period

```mermaid
flowchart TD
    A{Are the inputs of the 11th month complete?} -- no --> B[No action to offer to the user]
    A -- yes --> C["App estimates the 12th month indexes and expenses<br/>and the provisional settlement"]
    C --> D[App invites the user to follow the next period creation workflow]
    D --> E[User clicks a button to create a draft for the next period]
    E --> F["User confirms the new monthlyTenantBillAdvance<br/>calculated by the app in the provisional settlement"]
    F --> G[User inputs the heatPumpInvoiceEstimate]
    G --> I[User reviews the values and confirms the creation]
    I --> J["App creates the new period file with:<br/>the new heatPumpInvoiceEstimate,<br/>the new monthlyTenantBillAdvance,<br/>the first month startDate,<br/>the tenantName of the current period"]
    J --> K{"App shows a dialog: what next?"}
    K -- "open the draft period" --> L[User opens the draft period]
    K -- "close the dialog" --> M[Dialog closes]
```

The estimate and the settlement follow the [period closing grilling](grillings/2026-10-29-period-closing/GRILLING-SUMMARY.md).

## Case 5 - User creates the first period

```mermaid
flowchart TD
    A["App asks the user for:<br/>heatPumpInvoiceEstimate (can be 0),<br/>monthlyTenantBillAdvance (greater than 0),<br/>startDate (can be in the past, must be a date),<br/>tenantName (non-empty)"] --> B[User submits the form]
    B --> C["App computes the period name from the startDate:<br/>start year and next year, for example 15/09/2025 gives 2025-2026,<br/>and a start in April 2026 gives 2026-2027"]
    C --> D["App creates the period file with its first month:<br/>startDate as provided, endDate pre-computed,<br/>tenantBillAdvance 0,<br/>heat pump billedAmount from heatPumpInvoiceEstimate when greater than 0"]
    D --> E["User types the missing inputs of the first month, previous indexes included"]
    E --> F[[Case 2 - User loads an existing period]]
```

## Case 6 - App initializes the 12th month of a period

```mermaid
flowchart TD
    A["App computes the estimated indexes of waterConsumption and electricity"] --> B["App sets the 12th month Current indexes from the result<br/>and sets the common.estimated flag"]
    B --> C["App generates a provisional settlement from the 12 months of the period"]
    C --> D["App computes the monthlyTenantBillAdvance for the next period draft"]
```

The estimate rules are in the [period closing grilling](grillings/2026-10-29-period-closing/GRILLING-SUMMARY.md) and in [`period-file.md`](period-file.md#the-estimated-twelfth-month). Confirming the real reading removes the `estimated` flag.

## Case 7 - User closes a period

```mermaid
flowchart TD
    A{"Do the twelve months exist, all complete, none estimated?"} -- no --> B["'Clôturer la période' is disabled"]
    A -- yes --> C["User clicks 'Clôturer la période'"]
    C --> D["App lists the months whose tenantBillAdvance is 0, without blocking"]
    D --> E{"User ticks: the water bills were received and typed?"}
    E -- no --> F[The confirmation stays disabled]
    E -- yes --> G[User confirms]
    G --> H["App writes closedOn as a date"]
    H --> I["The period is read-only and cannot be reopened"]
```

## Case 8 - User edits a value of a past month

```mermaid
flowchart TD
    A["User edits a value of a month that has later months"] --> B{What kind of value?}
    B -- "an inheritable value" --> C["App offers: apply the new value to all the following months? Yes / No"]
    B -- "a Current index" --> D["App offers: set the next month's Previous index to the new value? Yes / No"]
    B -- "anything else" --> G[Only that month changes]
    C -- yes --> E["Every later month takes the new value"]
    C -- no --> G
    D -- yes --> F["The next month's Previous index takes the new value"]
    D -- no --> G
```
