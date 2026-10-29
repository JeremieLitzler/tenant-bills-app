# Tenant bills

Tracking of the shared charges between the landlord and the tenant of the studio, month by month, and the yearly settlement of who owes what to whom.

## Parties

**Landlord** (_Bailleur_):
The owner who lives in the main dwelling, pays the utility bills and re-invoices the tenant's share.
_Avoid_: Owner, propriétaire

**Tenant** (_Locataire_):
The occupant of the studio who pays a monthly tenant bill advance and their share of the charges.
_Avoid_: Renter

**Occupant count** (_Nb d'occupants_):
The number of people counted for the landlord or the tenant in a month, used to split the fixed parts of the bills.
_Avoid_: Units, parts

## Time

**Period** (_Période_):
Twelve consecutive months, September to August, over which charges are tracked and then settled.
_Avoid_: Year, exercice

**Closed period** (_Période clôturée_):
A period whose settlement the landlord has declared final, once every reading and every bill of the period is in. Until it is closed, a period is open and its settlement is provisional. Nothing in a closed period changes.
_Avoid_: Finished, archived, complete period

**Running period** (_Période en cours_):
The open period containing today.
_Avoid_: Current year

**Month** (_Mois_):
One column of a period, holding the readings and prices for that month. A month is named after the calendar month in which its consumption window starts: the "September" month runs from the mid-September reading date to the mid-October one.

**Reading date** (_Date de relevé_):
The day the meters are read for a month; it closes the month's consumption window for every section.
_Avoid_: Au (alone), index date

**Estimated month** (_Mois estimé_):
The last month of a period while its indexes are estimated from an earlier month's consumption and its reading is not yet taken.

## Money

**Tenant bill advance** (_Avance sur charges_):
The amount the tenant actually transferred in a month ahead of the settlement. The amount expected each month is set once per period.
_Avoid_: Charge advance, provision, deposit

**Balance** (_Avance sur charges - Consommations_):
The tenant bill advances received so far minus the tenant shares owed so far, followed during the period and final at the settlement.

**Tenant share** (_Part Locataire_):
The part of a section's monthly bill the tenant owes.

**Landlord share** (_Part Bailleur_):
The part of a section's monthly bill the landlord keeps.

**Settlement** (_Régularisation_):
The comparison, at the end of a period, of the tenant bill advances received with the tenant shares owed, giving the final balance and the next period's monthly tenant bill advance.
_Avoid_: Reconciliation, regularization

**Provisional settlement** (_Régularisation provisoire_):
The settlement of an open period, computed from the months entered so far; it can still change.

**Estimated settlement** (_Régularisation estimée_):
The provisional settlement while the last month of the period is estimated; it gives the next period's monthly tenant bill advance before the last reading is taken.

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
