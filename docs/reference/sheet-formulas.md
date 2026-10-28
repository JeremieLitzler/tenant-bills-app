# Line-by-line formulas

Regenerated on 2026-10-28 from the sheet `Période-092025-092026` of "Suivi des charges de location (v2).xlsx", the golden record (ADR 0003 superseded). Formulas are shown for column C (October); every month column uses the same formula with its own letter. Column B (the first month) types its previous indexes and its "Du" date instead of referencing the column before it. Column N holds the period totals.

Water indexes are typed in litres in this sheet, so the water deltas divide by 1000. The sheet `Période-092026-092027` still types them in m³ and has no division; the shares are the same.

## Header

### Line 1: "Parts" (column headers)

`=if(MONTH(B1)=12,date(year(B1)+1,1,14),date(year(B1),month(B1)+1,14))`

A label only: the 14th of the month after the previous column's.

### Lines 2-3: "Nb d'occupants Bailleur" / "Nb d'occupants Locataire"

`=B2` and `=B3`: inherited from the previous month.

## Section "Reconciliation annuelle"

### Line 6: "Avance sur charges - Consommations" (column N)

`=N8-sum(N12:N92)`

Advances received minus the tenant totals of every section (column N holds them on lines 29, 49, 79, 86, 90 and 92; the other N cells of the range are empty or text).

### Line 5: settlement text (column A) and amount (column N)

```xlsx
=if(N6>0, "Bailleur doit au Locataire la somme de ","Locataire doit au Bailleur la somme de ")
```

`=if(N6>0,N6,-N6)`

## Section "Avance sur charges"

### Line 8 (column N)

`=SUM(B8:M8)`

## Section "Période"

### Line 10: "Du"

`=B11`: the previous month's "Au" (line 11). Typed in column B.

## Section "Consommation Eau"

### Lines 13, 16, 19: previous indexes

`=B14`, `=B17`, `=B20`: the previous month's current index. Typed in column B.

### Line 15: "Delta Compteur Général"

`=(C14-C13)/1000`

### Line 18: "Delta Index Compteur Studio (eau non adoucie)"

`=(C17-C16)/1000`

### Line 21: "Delta Index Compteur Studio (eau adoucie)"

`=(C20-C19)/1000`

### Line 28: "Part Bailleur"

```xlsx
=ROUND(
  (C$15)*(C$22+C$23+C$24+C$25)*C$27+
  (C$2/sum(C$2:C$3))*C$26*C$27,
2)
```

### Line 29: "Part Locataire"

```xlsx
=ROUND(
  (C$18+C$21)*(C$22+C$23+C$24+C$25)*C$27+
  (C$3/sum(C$2:C$3))*C$26*C$27,
2)
```

Column N: `=SUM(B29:M29)`

### Line 30: "Facture"

`=SUM(C28:C29)`

## Section "Assainissement Eau"

### Lines 33-41: indexes and deltas

`=C13` to `=C21`: copies of lines 13 to 21 of "Consommation Eau".

### Line 48: "Part Bailleur"

`=round((C44+C45+C46)*(C35-C38-C41)*C47,2)`

### Line 49: "Part Locataire"

`=round((C44+C45+C46)*(C38+C41)*C47,2)`

Column N: `=SUM(B49:M49)`

### Line 50: "Facture"

`=SUM(C48:C49)`

Lines 42-43 ("Abonnement collecte") are typed but used by no formula.

## Section "Electricité"

### Lines 52, 54, 56, 58, 60, 62: previous indexes

`=B53`, `=B59`, `=B61`, `=B63` (and `=K55`, `=K57` for the main HC/HP registers once read): the previous month's current index. Typed in column B and in a tariff-switch month: the main HC/HP registers are typed until July 2026, and the studio Base previous index is typed (2343.6) in August 2026.

### Line 64: "Delta Index Base"

`=C53-C52`

### Line 65: "Delta Index HC"

`=C55-C54`

### Line 66: "Delta Index HP"

`=C57-C56`

### Line 67: "Delta Index Base Studio"

`=C59-C58`

### Line 68: "Delta Index HC Studio"

`=C61-C60`

### Line 69: "Delta Index HP Studio"

`=C63-C62`

### Line 74: "Nombre d'unité (1 = mois ; >1 = jours)"

`=C11-C10` (days between "Du" and "Au") while the subscription is per day; a typed `1` once it is per month.

### Line 78: "Part Bailleur"

```xlsx
=ROUND(
(C64)*(C70+C71)*C77+
(C65)*(C70+C72)*C77+
(C66)*(C70+C73)*C77+
(C2/sum(C2:C3))*C74*C75*C77+
(C2/sum(C2:C3))*C76*C77,2)
```

### Line 79: "Part Locataire"

```xlsx
=ROUND(
(C67)*(C70+C71)*C77+
(C68)*(C70+C72)*C77+
(C69)*(C70+C73)*C77+
(C3/sum(C2:C3))*C74*C75*C77+
(C3/sum(C2:C3))*C76*C77,2)
```

Column N: `=SUM(B79:M79)`

### Line 80: "Facture"

`=C79+C78`

## Section "Adoucisseur"

### Line 85: "Part Bailleur"

`=round((C2/sum(C2:C3))*C83*C84,2)`

### Line 86: "Part Locataire"

`=round((C3/sum(C2:C3))*C83*C84,2)`

Column N: `=SUM(B86:M86)`

## Section "Internet"

### Line 89: "Part Bailleur"

`=Round((C2/sum(C2:C3))*C88,2)`

### Line 90: "Part Locataire"

`=round((C3/sum(C2:C3))*C88,2)`

Column N: `=SUM(B90:M90)`

## Section "Entretien annuel PAC Air-Air"

### Line 92: "Facture"

The tenant pays all of it. Column N: `=SUM(B92:M92)`.

2025-2026 types 154 in August only. 2026-2027 splits the annual amount (`[annual_rate]` = 154):

`=round([annual_rate]/12,2)`

Except for the last month, where we have `=[annual_rate]-round([annual_rate]/12,2)*11`.
