# Line-by-line formulas

The formulas below apply to each month identically.

## Section "Consommation Eau"

### Line 11: "Delta Compteur Général"

`=B10-B9`

### Line 14: "Delta Index Compteur Studio (eau non adoucie)"

`=B13-B12`

### Line 17: "Delta Index Compteur Studio (eau adoucie)"

`=B16-B15`

### Line 24: "Part Bailleur"

```xlsx
=ROUND(
  (B$11)*(B$18+B$19+B$20+B$21)*B$23+
  (B$2/sum(B$2:B$3))*B$22*B$23;
2)
```

### Line 25: "Part Locataire"

```xlsx
=ROUND(
  (B$14+B$17)*(B$18+B$19+B$20+B$21)*B$23+
  (B$3/sum(B$2:B$3))*B$22*B$23;
2)
```

### Line 26: "Facture"

`=SUM(B24:B25)`

## Section "Assainissement Eau"

### Line 44: "Part Bailleur"

`=round((B40+B41+B42)*(B31-B34-B37)*B43;2)`

### Line 45: "Part Locataire"

`=round((B40+B41+B42)*(B34+B37)*B43;2)`

### Line 46: "Facture"

`=SUM(B44:B45)`

## Section "Electricité"

### Line: "Delta Index Base"

`=B49-B48`

### Line: "Delta Index HC"

`=B51-B50`

### Line: "Delta Index HP"

`=B53-B52`

### Line: "Delta Index Base Studio"

`=B55-B54`

### Line: "Delta Index HC Studio"

`=B57-B56`

### Line: "Delta Index HP Studio"

`=B59-B58`

### Line 72: "Nombre d'unité (1 = mois ; >1 = jours)"

`=B71-B70`

### Line: "Part Bailleur"

```xlsx
=ROUND(
(B60)*(B66+B67)*B75+
(B61)*(B66+B68)*B75+
(B62)*(B66+B69)*B75+
(B2/sum(B2:B3))*B72*B73*B75+
(B2/sum(B2:B3))*B74*B75;2)
```

### Line: "Part Locataire"

```xlsx
=ROUND(
(B63)*(B66+B67)*B75+
(B64)*(B66+B68)*B75+
(B65)*(B66+B69)*B75+
(B3/sum(B2:B3))*B72*B73*B75+
(B3/sum(B2:B3))*B74*B75;2)
```

### Line: "Facture"

`=B77+B76`

## Section "Adoucisseur"

### Line 83: "Part Bailleur"

`=round((B2/sum(B2:B3))*B81*B82;2)`

### Line 84: "Part Locataire"

`=round((B3/sum(B2:B3))*B81*B82;2)`

## Section "Internet"

### Line 87: "Part Bailleur"

`=Round((B2/sum(B2:B3))*B86;2)`

### Line 88: "Part Locataire"

`=round((B3/sum(B2:B3))*B86;2)`

## Section "Entretien annuel PAC Air-Air"

`[annual_rate]` = 154

`=round([annual_rate]/12;2)`

Except for the last month where we have `=[annual_rate]-round([annual_rate]/12;2)*11`.
