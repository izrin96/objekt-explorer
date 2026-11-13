# Spec Delta

## ADDED Requirements

### Requirement: All objekts sheet in the composer
The composer's All objekts sheet SHALL rise from the bottom at Add objekts' size: 88% of the viewport's height, and below `sm` all but its top 3rem. Its title SHALL read "All of {list}". Its description SHALL give the list's count and say to tick cards, then change or remove them together. Add objekts' filter bar SHALL filter the list's objekts. Each card SHALL show its name and serial, in the list's order, and on a side that swaps its ratio chip.

#### Scenario: Opens like Add objekts
- **WHEN** have list "spares" holds 30 objekts with Ratio for all 1:2, and the viewer activates its "+8" at 1280 px
- **THEN** a sheet rises from the bottom as tall as Add objekts', titled "All of spares", saying "30 on this list", with the filter bar over a grid of all 30 objekts, each named with its serial and showing its ratio chip

#### Scenario: Filter
- **WHEN** the viewer searches "Lynn" in the sheet's filter bar
- **THEN** the grid shows only the Lynn objekts of "spares", and clearing the search shows all 30 again

#### Scenario: Nothing matches
- **WHEN** no objekt of "spares" matches the filters
- **THEN** the grid says "Nothing matches these filters"

#### Scenario: Emptied from the sheet
- **WHEN** the viewer ticks every objekt of "spares" in the sheet and removes them
- **THEN** the sheet stays open, says "Nothing on this list yet", and its Add objekts button still works

#### Scenario: Entries fail to load
- **WHEN** the list's objekts fail to load
- **THEN** the sheet shows the error with Retry in place of the grid

### Requirement: Add objekts from All objekts
The All objekts sheet SHALL offer Add objekts in its header, which SHALL replace the sheet with that list's Add objekts sheet, at the same size and without closing, and move focus to its title. Adding, Cancel or closing it SHALL close the sheet and return focus to the control that opened All objekts. Closing All objekts SHALL return focus to that control, or to the side's Add objekts tile when that control is no longer on the page.

#### Scenario: Add from the sheet
- **WHEN** the viewer opens "+8" on "spares", activates Add objekts, ticks Lynn SCO #40 and adds it
- **THEN** the Add objekts sheet replaced All objekts without closing, "spares" holds 31 objekts, the sheet closes, and focus is on the "+9" tile

#### Scenario: The opener is gone
- **WHEN** "spares" holds 23 objekts, the viewer opens "+1", ticks 2, removes them and closes the sheet
- **THEN** the "+N" tile is gone, and focus is on the Has side's Add objekts tile

### Requirement: Ticked column in All objekts
From the `md` width, a 16rem column beside the grid SHALL hold Add objekts' Ticked tray, with Tick all beside Clear. Under the tray it SHALL offer Set ratio on a side that swaps, Set price on a sale list with a currency, Add to another list, and Remove with the count, in that order. Each SHALL be disabled while nothing is ticked, act on every ticked objekt, and open the list page's own dialog, applying to the list at once and keeping the composer's picks.

#### Scenario: Column on a sale side
- **WHEN** the viewer opens All objekts of sale list "binary sale" in MYR at 1280 px and ticks 3 objekts
- **THEN** the column shows "Ticked 3" with the three, then Set price, Add to another list and "Remove 3", and no Set ratio

#### Scenario: Nothing ticked
- **WHEN** the viewer opens All objekts and ticks nothing
- **THEN** Clear and every action in the column are disabled, and the tray says "Tap cards to tick them."

#### Scenario: Untick from the tray
- **WHEN** the viewer has ticked three objekts and removes one from the tray
- **THEN** the tray and Remove show two, that objekt is unticked in the grid, and focus is on the next ticked objekt's untick control

### Requirement: Tick all in All objekts
Tick all SHALL tick every objekt of the list. While a filter is on it SHALL read Tick shown and tick only the objekts the filter shows. Once all it would tick are ticked it SHALL read Untick all, or Untick shown, and untick them. It SHALL be disabled while the grid shows no objekt. Ticks SHALL survive a filter change: the tray keeps showing ticked objekts the filter hides, and the actions apply to them too.

#### Scenario: Tick shown
- **WHEN** "spares" holds 30 objekts, 4 of them Lynn, and the viewer filters to Lynn and activates Tick shown
- **THEN** those 4 are ticked, the button reads Untick shown, and the other 26 are not ticked

#### Scenario: Ticks survive the filter
- **WHEN** the viewer ticks 2 Lynn objekts, then changes the filter to SeoYeon and ticks 1
- **THEN** the tray shows all 3, and Remove reads "Remove 3"

### Requirement: All objekts on a phone
Below the `md` width, one row under the grid SHALL hold the ticked count, which opens the tray in a popover; a Change menu holding Set ratio, Set price and Add to another list as the side offers them; and Remove with the count, as the column's reads. Change and Remove SHALL be disabled while nothing is ticked. The row's controls SHALL keep their places as the count changes. The sheet's description SHALL be for screen readers only, as Add objekts' is.

#### Scenario: Phone
- **WHEN** at 390 px the viewer opens All objekts of have list "spares" and ticks 2 objekts
- **THEN** the row under the grid shows 2, Change and "Remove 2", and Change offers Set ratio and Add to another list

### Requirement: Accessible ticking in All objekts
Each card SHALL be one control named by its objekt and serial ("Lynn SCO #12"), read as pressed while ticked, and ticked by a tap, Enter or Space. A change in the ticked count SHALL be announced politely at every width. Disabled actions SHALL be left out of the tab order. From `md` the column SHALL follow the grid in tab order.

#### Scenario: Tick by keyboard
- **WHEN** a screen reader user moves to Lynn SCO #12 in the sheet and presses Space
- **THEN** it is read as "Lynn SCO #12", pressed, and "1 ticked" is announced

## MODIFIED Requirements

### Requirement: Post preview
The composer SHALL show the post as Trade will show it: its tags, Has (Selling for a sale list) and Wants, each with its list's name, an Add objekts tile and up to 22 objekt thumbnails followed by "+N", the want list's rules, and who it matches. "+N" SHALL open every objekt of that side in the All objekts sheet (see All objekts sheet in the composer). The preview SHALL follow every pick as it changes.

#### Scenario: Preview follows picks
- **WHEN** the viewer picks Swap, have list "spares" holding 30 objekts and want list "binary hunt" holding the rule CC366
- **THEN** the preview shows WTT, "spares" with 22 thumbnails and "+8", and "binary hunt" with the CC366 rule

#### Scenario: All objekts
- **WHEN** the viewer activates "+8"
- **THEN** a sheet rising from the bottom, as tall as Add objekts', shows all 30 objekts of "spares"

### Requirement: Objekt menu in the composer
Each objekt thumbnail of a picked side of the preview SHALL open a menu of the list page's entry actions for that objekt: Add to list… on every side, Set price on a sale list with a currency, Set ratio on a side that swaps, and Remove from list on every side. Each SHALL open the list page's own dialog, Remove asking first; Add to list… offers the lists the list page's does, a bound list's objekts also going to that profile's other bound lists. A save SHALL apply to the list at once and keep the composer's picks, also when the viewer leaves without posting. A refused save SHALL say why and keep the dialog open.

#### Scenario: Remove while posting
- **WHEN** the viewer picks Swap with have list "spares" holding Lynn SCO #12 and Lynn SCO #30, opens the menu of Lynn SCO #12, chooses Remove from list and confirms
- **THEN** Lynn SCO #12 leaves "spares" and the Has side, Swap and both lists are as before, and focus is on Lynn SCO #30

#### Scenario: Price a sale objekt
- **WHEN** the viewer picks Sell with sale list "binary sale" in MYR, opens the menu of Lynn SCO #12, chooses Set price, enters 5 and saves
- **THEN** Lynn SCO #12 on "binary sale" is priced MYR 5, the picks are as before, and Set price on it opens with 5

#### Scenario: What each side offers
- **WHEN** the viewer opens the menu of an objekt on a sale list, on a Swap post's have list, and on a Buy post's want list
- **THEN** the sale objekt offers Add to list…, Set price and Remove from list, the have objekt Add to list…, Set ratio and Remove from list, and the Buy want objekt Add to list… and Remove from list

#### Scenario: From the "+N" sheet
- **WHEN** "spares" holds 30 objekts, the viewer opens "+8", and taps Lynn SCO #30 in the sheet
- **THEN** no menu opens, and Lynn SCO #30 is ticked (see Select several objekts in the composer)

#### Scenario: Post already on Trade
- **WHEN** the viewer edits their Sell post of "binary sale" and removes Lynn SCO #12 from it in the composer, then leaves without saving the post
- **THEN** Lynn SCO #12 is gone from "binary sale" and from the live post at once, as with Add objekts

### Requirement: Prices in the composer's "+N" sheet
On a sale list with a currency, the All objekts sheet SHALL show each objekt's price and note under its card, outside the control that ticks it: the price is plain text, and the note opens from its own button without ticking the card. A price changes through Set price on the ticked objekts. The preview's thumbnails SHALL show no price.

#### Scenario: Prices in the "+N" sheet
- **WHEN** "binary sale" in MYR holds 30 objekts, Lynn SCO #12 priced MYR 5 with a note, and the viewer opens "+8"
- **THEN** Lynn SCO #12's card shows MYR 5 and a note button under it, and opening the note leaves the card unticked

#### Scenario: Reprice one objekt
- **WHEN** the viewer ticks only Lynn SCO #12 in that sheet, chooses Set price, enters 6 and saves
- **THEN** Lynn SCO #12 shows MYR 6 under its card and stays ticked

### Requirement: Select several objekts in the composer
Each picked side with at least one objekt SHALL offer Select by its list's name, opening the same All objekts sheet as "+N", whatever the side holds. In that sheet a tap on a card SHALL tick or untick it; no card opens a menu, and there is no select mode to enter or leave. Ticks SHALL stay within one sheet, so they never hold objekts of two lists, and SHALL clear when it closes. An objekt that leaves the list SHALL leave the ticks; other saves SHALL keep them.

#### Scenario: Select on a short list
- **WHEN** have list "spares" holds 5 objekts, so its side has no "+N", and the viewer chooses Select by "spares"
- **THEN** the All objekts sheet of "spares" opens with its 5 objekts, none ticked

#### Scenario: Remove several at once
- **WHEN** the viewer picks Swap with have list "spares" holding 5 objekts, chooses Select by "spares", ticks 3 of them, chooses Remove 3 and confirms
- **THEN** those 3 leave "spares", the sheet shows the other 2 with none ticked, and the picks are as before

#### Scenario: Price several sale objekts
- **WHEN** the viewer picks Sell with sale list "binary sale" in MYR, ticks 4 objekts in its sheet and sets their price to 5
- **THEN** all 4 are priced MYR 5 on "binary sale" and stay ticked

#### Scenario: What the bar offers
- **WHEN** the viewer ticks objekts on a Buy post's want list
- **THEN** the sheet offers Add to another list and Remove, and no Set price or Set ratio

#### Scenario: Closing clears the ticks
- **WHEN** the viewer ticks 2 objekts, closes the sheet and opens "+8" again
- **THEN** nothing is ticked

### Requirement: Focus after an objekt action
After a remove from a preview thumbnail's menu, focus SHALL move to the next thumbnail, else the side's Add objekts tile. Saving a price or ratio, or cancelling a dialog, opened from that menu SHALL return focus to the thumbnail. In the All objekts sheet, closing an action's dialog SHALL return focus to the control that opened it: the column's button, the phone row's Remove, or the Change menu's button. After a remove there, focus SHALL go to the sheet's title.

#### Scenario: Remove the last objekt
- **WHEN** "spares" holds only Lynn SCO #30 and the viewer removes it from its menu
- **THEN** the Has side shows only the Add objekts tile, and focus is on it

#### Scenario: The next objekt moves up a row
- **WHEN** the preview shows 6 thumbnails a row and the viewer removes the last thumbnail of the first row from its menu
- **THEN** focus is on the thumbnail that moved up into that row

#### Scenario: Cancel
- **WHEN** the viewer chooses Remove from list on Lynn SCO #12 and cancels
- **THEN** "spares" is unchanged and focus is on the thumbnail of Lynn SCO #12

#### Scenario: Remove in the sheet
- **WHEN** the viewer ticks 2 objekts in the All objekts sheet, chooses Remove 2 and confirms
- **THEN** both leave "spares", and focus is on the sheet's title

#### Scenario: Price from the phone row
- **WHEN** at 390 px the viewer ticks 2 objekts of "binary sale", chooses Set price from Change and saves
- **THEN** focus is on the Change button
