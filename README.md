 /grill-with-docs

## Goal

about using @"Suivi des charges de location (v2).xlsx" that contains last year consumptions for water,
electricity, bills of water treatment, internet, expenses for the water softener and the maintenance of the heat pump.

the app is in french.

I need an interface that displays a similar table to Tab "Période-092026-092027" with editable cells.
On blur, the edited cells is saved to the JSON file. No concurrence edit calls allowed (stack edits in an IndexedDb queue)

Let's start with breaking down the functionnal and establish features and build an implementation tree per feature.

## Historic Datasheet

Tab "Période-092026-092027" is the current year. Tab "Période-092025-092026" is a full year. It is prefilled for the coming months, but the webapp doesn't need to.

Tab "Régularisation-2025/2026" is the summary for the year 1 to calculate the amount owed either from the tenant to the landlord
or the inverse.

Tab "Régularisation-2025/2026" is the sheet to summarize the year that ended to see who owes what to whom and the next year monthly charges to pay.

Each month, I update the following line's cells (read column A for the meaning). Below the details of each line's meaning:

### Header

- line 1: the months
- line 2: the share in units for the landlord. used in formulas below
- line 3: the share in units for the tenant. used in formulas below

### Section "Avance sur charges"

- line 7: it is the monthly bill provision. when I receive the money by bank transfer, I set the value, always 70 euros.

### Section "Consommation Eau"

- lines 9, 12 and 15:
  - for the start: take the manual input for now (later, basically the previous's last month of the previous year)
  - for the next month, it takes respectively the previous month value of lines 10, 13, 16
- lines 10, 13, 16, : when we are about the 15th of the month the 15th. input must be entered for the current month. the 15th can be a thursday, friday,
  saturday or sunday. if neither of these days is the 15th, then the input recording day is the smallest. the historic data may not have
  followed this strictly nor the app should lock into the "smallest". I should be able to pick the date I take readings in any case. the computing rule is a suggestion, not necessarly what is submitted
- lines 18 to 23: those are rarely changing. for a new month, set the previous month value. edit must be available.
- lines 11, 14, 17, 24, 25 and 26: contains formulas from the other lines described above them.

### Section "Assainissement Eau"

- lines 29 to 37: repeat values of lines 9 to 17
- lines 38 to 43: similar to lines 18 to 23 but for the water treatment bill.
- lines 44 to 46: similar to lines 24, 25 and 26, contains formulas from the other lines described above (29-43).

### Section "Electricité"

- lines 48 to 78: works similarly to Section "Consommation Eau" but with specific constants and readings.

### Section "Adoucisseur"

- lines 80 to 84: works similarly to Section "Consommation Eau" but with specific constants and readings. much simpler setup.

### Section "Internet"

- lines 86 to 88: works similarly to Section "Consommation Eau" but with specific constants and readings. much simpler setup.

### Section "Entretien annuel PAC Air-Air"

- line 90 : 154 euros split evenly in 12 parts.

## Tech stack

The app should use latest Vue 3 with Shadcn UI components in particular for the table and the forms.

The data will be stored on a secondary private repository `https://github.com/JeremieLitzler/tenant-bills-data` holding a single json per year.

To update the data, we'll use Netlify Functions similar to the project `https://github.com/JeremieLitzler/french-gas-stations-scraper` regarding:

- the auth process
- the writing of the JSON file

Use IndexedDb to store data on device instead of a full pull from the JSON file.

Hosting of the webapp is also on Netlify.
