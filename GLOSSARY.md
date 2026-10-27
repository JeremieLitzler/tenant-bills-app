# Tenant bills

Tracking of the shared charges between the landlord and the tenant of the studio, month by month, and the yearly settlement of who owes what to whom.

## Parties

**Landlord** (_Bailleur_):
The owner who lives in the main dwelling, pays the utility bills and re-invoices the tenant's share.
_Avoid_: Owner, propriétaire

**Tenant** (_Locataire_):
The occupant of the studio who pays a monthly charge advance and their share of the charges.
_Avoid_: Renter

**Occupant count** (_Nb d'occupants_):
The number of people counted for the landlord or the tenant in a month, used to split the fixed parts of the bills.
_Avoid_: Units, parts

## Time

**Period** (_Période_):
Twelve consecutive months, September to August, over which charges are tracked and then settled.
_Avoid_: Year, exercice

**Month** (_Mois_):
One column of a period, holding the readings and prices for that month. A month is named after the calendar month in which its consumption window starts: the "September" month runs from the mid-September reading date to the mid-October one.

**Reading date** (_Date de relevé_):
The day the meters are read for a month; it closes the month's consumption window for every section.
_Avoid_: Au (alone), index date

## Money

**Charge advance** (_Avance sur charges_):
The fixed amount the tenant transfers each month ahead of the settlement.
_Avoid_: Provision, deposit

**Tenant share** (_Part Locataire_):
The part of a section's monthly bill the tenant owes.

**Landlord share** (_Part Bailleur_):
The part of a section's monthly bill the landlord keeps.

**Settlement** (_Régularisation_):
The comparison, at the end of a period, of the charge advances received with the tenant shares owed, giving the balance due and the next period's charge advance.
_Avoid_: Reconciliation, regularization

## Sections

**Section**:
One kind of charge tracked in the table: water consumption, water treatment, electricity, water softener, internet, heat pump maintenance.

**Index** (_Index compteur_):
The cumulative value displayed by a meter at a reading date.
_Avoid_: Counter value

**Previous index** (_Index précédent_):
The index of a meter at the previous month's reading date.

**Current index** (_Index actuel_):
The index of a meter at this month's reading date.

**Main meter** (_Compteur Général_):
The water meter measuring the whole house, landlord and tenant together.

**Studio meter** (_Compteur Studio_):
A meter measuring the tenant's consumption only; water has one for softened and one for unsoftened water.

**Tariff mode**:
How electricity is priced for a month: a single Base rate, or off-peak (HC) and peak (HP) rates.
