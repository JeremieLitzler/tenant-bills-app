# Formulas

Reference for the formulas the app implements. The Excel examples come from the sheet `Période-092025-092026` of "Suivi des charges de location (v2).xlsx", shown for column C (October); every month column uses the same formula with its own letter. The "With variables" blocks are the formulas the code follows, with the occupant split written as a ratio.

Water indexes are typed in litres, so the water deltas divide by 1000 (a delta is the current index minus the previous index; the unit of a water delta is the cubic metre). Electricity deltas are in kWh. Every amount is rounded to cents with Excel's ROUND (half away from zero), and a figure whose input is missing is uncomputable ("—").

The water treatment shares include the collection subscription, as the Excel sheet already does (rows 42 and 43 of the period sheets, constant at 1.0208 and 0.735 in 2025-2026). Only the v1 formulas file and the v1 period file left it out.

## Occupants ratio

### For the Landord

Below [Landlord occupants ratio] = [Nb d'occupants Bailleur] / SUM([Nb d'occupants Bailleur];[Nb d'occupants Locataire])

### For the Tenant

Below [Tenant occupants ratio] = [Nb d'occupants Locataire] / SUM([Nb d'occupants Bailleur];[Nb d'occupants Locataire])

## Water consumption formula - for Landlord

Example from Excel

```text
=ROUND(
(B$15)(B$22+B$23+B$24+B$25)B$27+
(B$2/sum(B$2:B$3))B$26B$27;
2)
```

With variables:

```text
=ROUND(
(
[Delta Compteur Général] x SUM([Coût par m3];[Redevance Prélèvement Ressource en eau];[Redevance sur Consommation d'eau potable];[Redevance Performance des réseaux d'eaux potables]) +
[Abonnement] x [Landlord occupants ratio]
) x [TVA Unique];
2)
```

## Water consumption formula - for Tenant

Example from Excel

```text
=ROUND(
(B$18+B$21)(B$22+B$23+B$24+B$25)B$27+
(B$3/sum(B$2:B$3))B$26B$27;
2)
```

With variables:

```text
=ROUND(
(
SUM([Delta Index Compteur Studio (eau non adoucie)]; [Delta Index Compteur Studio (eau adoucie)]) x SUM([Coût par m3];[Redevance Prélèvement Ressource en eau];[Redevance sur Consommation d'eau potable];[Redevance Performance des réseaux d'eaux potables]) +
[Abonnement] x [Tenant occupants ratio]
) x [TVA Unique];
2)
```

## Water treatment formula - for Landlord

Example from Excel

```text
=round(
(
(B44+B45+B46)(B35-B38-B41)+
SUM(B42:B43)B2/SUM(B2:B3)
)B47;2)
```

With variables:

```text
=ROUND(
(
    ([Consommation collecte (part distributeur)] + [Consommation collecte (part communautaire)] + [Performance systèmes assainissement collectif]) x ([Delta Compteur Général]-[Delta Index Compteur Studio (eau non adoucie)]-[Delta Index Compteur Studio (eau adoucie)]) +
    (
        SUM([Abonnement collecte (part distributeur)]; [Abonnement collecte (part communautraire)]) x
        [Landlord occupants ratio]
    )
) x [TVA Unique];
2)
```

## Water treatment formula - for Tenant

Example from Excel

```text
=round(
(
(B44+B45+B46)(B38+B41)+
SUM(B42:B43)B3/SUM(B2:B3)
)B47;2)
```

With variables:

```text
=ROUND(
(
    ([Consommation collecte (part distributeur)] + [Consommation collecte (part communautaire)] + [Performance systèmes assainissement collectif]) x ([Delta Index Compteur Studio (eau non adoucie)]+[Delta Index Compteur Studio (eau adoucie)]) +
    (
        SUM([Abonnement collecte (part distributeur)]; [Abonnement collecte (part communautraire)])
        x
        [Tenant occupants ratio]
    )
) x [TVA Unique];
2)
```

## Electricty - for Landlord

Example from Excel

```text
=ROUND(
(
(B64)(B70+B71)+
(B65)(B70+B72)+
(B66)(B70+B73)+
B74B75(B2/sum(B2:B3))+
B76(B2/sum(B2:B3)))
B77
;2)
```

With variables:

```text
=ROUND(
(
[Delta Index Base] x SUM([Assiette Taxe CSPE/Accise (par somme de kWh consommés)]; [Coût kWh (tarif base)(HT)]) +
[Delta Index HC] x SUM([Assiette Taxe CSPE/Accise (par somme de kWh consommés)]; [Coût kWh (tarif HC)(HT)]) +
[Delta Index HP] x SUM([Assiette Taxe CSPE/Accise (par somme de kWh consommés)]; [Coût kWh (tarif HP)(HT)]) +
[Nombre d'unité (1 = mois ; >1 = jours)] x [Abonnement (par unité, HT)(au prorata)] x [Landlord occupants ratio] +
[Assiette Taxe CTA (au prorata)] x [Landlord occupants ratio]
) x [TVA unique]
; 2)
```

## Electricty - for Tenant

Example from Excel

```text
=ROUND(
(
(B67)(B70+B71)+
(B68)(B70+B72)+
(B69)(B70+B73)+
B74B75(B3/sum(B2:B3))+
B76(B3/sum(B2:B3)))
B77
; 2)
```

With variables:

```text
=ROUND(
(
[Delta Index Base Studio] x SUM([Assiette Taxe CSPE/Accise (par somme de kWh consommés)]; [Coût kWh (tarif base)(HT)]) +
[Delta Index HC Studio] x SUM([Assiette Taxe CSPE/Accise (par somme de kWh consommés)]; [Coût kWh (tarif HC)(HT)]) +
[Delta Index HP Studio] x SUM([Assiette Taxe CSPE/Accise (par somme de kWh consommés)]; [Coût kWh (tarif HP)(HT)]) +
[Nombre d'unité (1 = mois ; >1 = jours)] x [Abonnement (par unité, HT)(au prorata)] x [Tenant occupants ratio] +
[Assiette Taxe CTA (au prorata)] x [Tenant occupants ratio]
) x [TVA unique]
; 2)
```

## Water softener - for Landlord

Example from Excel

```text
=round((B2/sum(B2:B3))B83B84;2)
```

With variables:

```text
=ROUND(
[Quantité] x
[Prix unitaire] x
[Landlord occupants ratio]
; 2)
```

## Water softener - for Tenant

Example from Excel

```text
=round((B2/sum(B2:B3))B83B84;2)
```

With variables:

```text
=ROUND(
[Quantité] x
[Prix unitaire] x
[Tenant occupants ratio]
; 2)
```

## Internet - for Landlord

Example from Excel

```text
=Round((B2/sum(B2:B3))B88;2)
```

With variables:

```text
= ROUND(
[Facture] x
[Landlord occupants ratio]
; 2)
```

## Internet - for Tenant

Example from Excel

```text
=round((B3/sum(B2:B3))B88;2)
```

With variables:

```text
= ROUND(
[Facture] x
[Tenant occupants ratio]
; 2)
```

## Heat pump maintenance

The tenant pays all of the bill, so there is no landlord/tenant split: the one figure per month is `bill`, equal to the month's `billedAmount` (0 when the month has none).

The annual amount (`heatPumpInvoiceEstimate`) is split when a month is initialized: `=round([annual_rate]/12,2)` for the first eleven months, and `=[annual_rate]-round([annual_rate]/12,2)*11` for the twelfth. The 2025-2026 period types 154 in August only.

## Settlement

### Balance

`[Balance] = SUM([tenant bill advances received]) - SUM([tenant shares of every section, over the months])`

The advances received minus the tenant totals of every section: water consumption, water treatment, electricity, water softener, internet and heat pump maintenance.

### Settlement text and amount

```xlsx
=if([Balance]>0, "Bailleur doit au Locataire la somme de ","Locataire doit au Bailleur la somme de ")
```

`=if([Balance]>0,[Balance],-[Balance])`
