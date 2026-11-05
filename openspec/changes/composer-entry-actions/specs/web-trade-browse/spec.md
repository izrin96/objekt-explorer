## ADDED Requirements

### Requirement: Objekt menu in the composer
Each objekt thumbnail of a picked side of the preview, and of its "+N" sheet, SHALL open a menu of the list page's entry actions for that objekt: Set price on a sale list with a currency, Set ratio on a side that swaps, and Remove from list on every side. Each SHALL open the list page's own dialog, Remove asking first. A save SHALL apply to the list at once and keep the composer's picks, also when the viewer leaves without posting. A refused save SHALL say why and keep the dialog open.

#### Scenario: Remove while posting
- **WHEN** the viewer picks Swap with have list "spares" holding Lynn SCO #12 and Lynn SCO #30, opens the menu of Lynn SCO #12, chooses Remove from list and confirms
- **THEN** Lynn SCO #12 leaves "spares" and the Has side, Swap and both lists are as before, and focus is on Lynn SCO #30

#### Scenario: Price a sale objekt
- **WHEN** the viewer picks Sell with sale list "binary sale" in MYR, opens the menu of Lynn SCO #12, chooses Set price, enters 5 and saves
- **THEN** Lynn SCO #12 on "binary sale" is priced MYR 5, the picks are as before, and Set price on it opens with 5

#### Scenario: What each side offers
- **WHEN** the viewer opens the menu of an objekt on a sale list, on a Swap post's have list, and on a Buy post's want list
- **THEN** the sale objekt offers Set price and Remove from list, the have objekt Set ratio and Remove from list, and the Buy want objekt only Remove from list

#### Scenario: From the "+N" sheet
- **WHEN** "spares" holds 30 objekts, the viewer opens "+7", and removes Lynn SCO #30 from its menu in the sheet
- **THEN** Lynn SCO #30 leaves the sheet and "spares", the sheet stays open, and focus is on the next objekt

#### Scenario: Post already on Trade
- **WHEN** the viewer edits their Sell post of "binary sale" and removes Lynn SCO #12 from it in the composer, then leaves without saving the post
- **THEN** Lynn SCO #12 is gone from "binary sale" and from the live post at once, as with Add objekts

### Requirement: Prices in the composer's "+N" sheet
On a sale list with a currency, the "+N" sheet SHALL show each objekt's price and note under its card, the price opening Set price. The preview's thumbnails SHALL show no price.

#### Scenario: Prices in the "+N" sheet
- **WHEN** "binary sale" in MYR holds 30 objekts, Lynn SCO #12 priced MYR 5, and the viewer opens "+7"
- **THEN** Lynn SCO #12's card shows MYR 5 under it, and choosing that price opens Set price with 5

### Requirement: Focus after an objekt action
After a remove from an objekt's menu, focus SHALL move to the next thumbnail, else the side's Add objekts tile; in the "+N" sheet, to the next objekt, else the sheet's title. Saving a price or ratio, or cancelling any of the dialogs, SHALL return focus to the thumbnail.

#### Scenario: Remove the last objekt
- **WHEN** "spares" holds only Lynn SCO #30 and the viewer removes it from its menu
- **THEN** the Has side shows only the Add objekts tile, and focus is on it

#### Scenario: The next objekt moves up a row
- **WHEN** the "+N" sheet shows 3 objekts a row and the viewer removes the last objekt of the first row
- **THEN** focus is on the objekt that moved up into that row

#### Scenario: Cancel
- **WHEN** the viewer chooses Remove from list on Lynn SCO #12 and cancels
- **THEN** "spares" is unchanged and focus is on the thumbnail of Lynn SCO #12

## MODIFIED Requirements

### Requirement: Ratio on post tiles
A Trade post's objekt tile and rule tile SHALL show its ratio (its own, or else its list's) as a chip ("1:2" on a have side, "2:1" on a want side) on Browse, For you and the full side list, when the side swaps: a have list, or a want list open to swaps. On an objekt tile the chip SHALL lie over the card's bottom-end corner, with the worded ratio as the tile's hover tooltip. The chip's accessible name SHALL use words ("They ask 2 for this"). A ratio SHALL NOT change any count, ring or order on the page.

#### Scenario: Have tile
- **WHEN** jinsoul.blue's WTT post holds Lynn SCO with ratio 2 on its have list
- **THEN** that tile shows "1:2", named "They ask 2 for this", and the row's counts are as without it

#### Scenario: Full side list
- **WHEN** the viewer opens Show all of that post's have side and points at Lynn SCO
- **THEN** its card shows "1:2" over its bottom-end corner and the tooltip "They ask 2 for this"

#### Scenario: Rule tile
- **WHEN** the post's want list holds the rule "any Cream02 SCO" with ratio 2
- **THEN** that rule tile shows "2:1"

### Requirement: Ratios in the preview
On a side that swaps (a have list, or a want list unless the post is Buy), the preview SHALL offer "Ratio for all" by the list's name, saved as it is picked, and let the viewer give a thumbnail its own ratio through Set ratio in its menu (see Objekt menu in the composer) or tap a rule to give it its own, with the choice 1:1 or 2 to 5 (see `web-lists` Trade ratio). Each choice SHALL save to the list at once. A thumbnail or rule following the list's ratio SHALL show it apart from one set on its own. A sale list and a Buy post's want list SHALL offer no ratio.

#### Scenario: Ratio for all, one override
- **WHEN** the viewer sets "Ratio for all" on "spares" to 1:2, then opens the menu of Lynn SCO, chooses Set ratio, picks 1:3 and saves
- **THEN** every thumbnail of "spares" shows 1:2 as following the list, Lynn SCO shows its own 1:3, and both are saved

#### Scenario: Buy post
- **WHEN** the viewer picks Buy and want list "store hunt"
- **THEN** the preview offers no ratio
