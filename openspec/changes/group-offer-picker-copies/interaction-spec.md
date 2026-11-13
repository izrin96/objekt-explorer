> Reference for the tasks of `group-offer-picker-copies`. It was written for the interactive mock (https://claude.ai/artifact/C9RhCXhno4NmmDnjgpoBaD, private to the owner). The owner fixed its three switches on 2026-11-13: Group in = Both pickers, Single copy = Pick at once, Any serial on shown lists = Offered. Read every table at those positions. The mock page, its switches, its frame, "Fill You get to 48", Reset and the sample data (parts of section 2, section 7) are mock scaffolding and are not built. Where this file and `specs/web-trade-offers/spec.md` or `design.md` disagree, those two win.

# Grouped offer picker: interaction spec for the mock

A one-page React mock of the backlog item "Group copies by collection in the offer pickers". It shows the Make offer builder for an offer to the partner **rin.trades**, its two pickers (You give, You get) as side sheets, and a new serial dialog that opens over a sheet. The page lets the owner compare **Today** against **Grouped** and try each answer to three open questions.

This file sets structure, behaviour, copy and sample data. Another file sets the look of the chrome (colours, fonts, sizes). Card colours come from the sample data here.

Terms used below:

- **Copy**: one objekt (one token) of a collection, with its own serial.
- **Shown copy**: a copy on a list that shows serials. **Hidden copy**: a copy on a list that hides serials (its serial is never shown).
- **Available copy**: a copy that can be picked. Not transferable and in a trade in progress copies are unavailable. A copy in another of your open offers is available, with a warning.
- **Group**: all copies of one collection in one picker, from every list.
- **Any pick**: a pick of "any serial" of a collection. There is at most one any pick per collection, with a count.

---

## 1. Recommendation

| #   | Question                                                        | Answer (the switch's default)                                        | Why                                                                                                                                                                        |
| --- | --------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Both pickers, or only You get?                                  | **Both pickers**                                                     | Your own doubles crowd You give as much as the partner's crowd You get, and one picker should read the same way on both sides.                                             |
| 2   | A shown collection with a single copy: dialog or straight pick? | **Pick at once**                                                     | A dialog with one row has nothing to choose, so the tile shows the serial and a click picks it, as today.                                                                  |
| 3   | Can a shown group also be asked for as any copy?                | **Offered**, as one "Any serial" option in the dialog worth one copy | It keeps today's "Any serial" for shown lists (spec scenario "Copies shown by serial") and lets someone who doesn't care about the serial leave the choice to the partner. |

Q3 "Offered" follows the spec rule that an any pick over copies also offered by serial stays a single pick: in a shown-only group, "Any serial" is a checkbox worth one copy, not a counter. A count (− / +) appears only for hidden copies.

---

## 2. Page structure

Top to bottom:

1. **Title**: "Grouped offer picker". Below it, one line: "A mock of grouping copies by collection in Make offer. Sample data only, nothing is sent."
2. **Switch bar**: always usable, never inert, never covered by the sheet or the dialog. Each switch is a segmented control (radio group) with a visible label.
3. **Frame**: a bordered box that holds the fake builder. The picker sheet and the serial dialog open **inside this frame**, positioned against the frame and not portaled to `body`. Their backdrops cover only the frame. That way the switch bar stays usable while they are open.
   - Desktop: the frame is the full content width, 760 px tall. The builder scrolls inside it.
   - Phone: the frame is 390 × 844 px, centred.
   - If the real viewport is narrower than 640 px, the frame is always the phone layout at 100% width, and the Width switch is hidden.

### Switches

| Label                       | Options (in order)                | Default        | What it changes                                                                    |
| --------------------------- | --------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| "Picker"                    | "Today", "Grouped"                | "Grouped"      | Tile layout in both pickers (see 3 and 6).                                         |
| "Group in"                  | "Both pickers", "You get only"    | "Both pickers" | Q1. With "You get only", You give shows Today's tiles even when Picker is Grouped. |
| "Single copy"               | "Pick at once", "Open the dialog" | "Pick at once" | Q2. Applies to groups with exactly one shown copy and no hidden copy.              |
| "Any serial on shown lists" | "Offered", "Not offered"          | "Offered"      | Q3. Applies to You get only (You give never asks for any serial).                  |
| "Width"                     | "Desktop", "Phone"                | "Desktop"      | The frame size.                                                                    |

While Picker is "Today", the three question switches stay visible but disabled, with the line "These apply to Grouped." under them.

Two buttons at the end of the switch bar:

- "Fill You get to 48". This closes any open sheet or dialog and discards their unsaved changes. It then **replaces** You get's picks with every available copy in sample-data order (copies by ascending serial, hidden copies as any picks) until 48 copies are reached. With the sample data, that is all available copies of collections T1 to T12 plus HaSeul 305Z any × 7, and nothing of Choerry 206Z. Picking 2 more then fills the side.
- "Reset". This closes any open sheet or dialog and restores the starting picks (see 7.4) and the default switch positions.

### Effect of a switch flipped mid-flow

- If the serial dialog is open, it closes and its changes are discarded. If the sheet is still open, focus goes to the tile that opened the dialog.
- If the sheet is open, it stays open, and its grid re-renders over the same working selection.
- **Pick model, shared by both variants**: a set of picked copy ids, plus one any count per collection. Switching Today ↔ Grouped never changes picks.
- Turning Q3 to "Not offered" removes the any pick of every **shown-only** group, both from the open sheet's working selection and from the builder. Any picks of hidden or mixed groups stay. Switching Picker to "Grouped" while Q3 is "Not offered" removes them the same way, since an any pick made on a Today "Any serial" tile would otherwise have no control in the Grouped dialog.
- Turning Single copy or Group in changes only how the tiles behave from then on. Picks stay.

### The fake builder (inside the frame)

- Heading: "New offer to rin.trades".
- Two sides, each a section. Desktop: side by side, You give on the left. Phone: stacked, You give first.
- Each side has:
  - A heading, "You give" or "You get", followed by the count "{count} of 50" (for example "7 of 50").
  - An outline button with a plus icon: You give "Add from your collection", You get "Add from rin.trades's lists". It opens that side's picker sheet.
  - The picks grid (see 5), or when empty the dashed box: You give "Nothing yet. Leave it empty to buy with money alone.", You get "Nothing yet. Leave it empty to sell or give."
- Below both sides, shown once when any pick on either side has an estimated serial: "~ marks a serial we estimated. Cosmo may show a different number, so check the objekt in Cosmo before you send it."
- No top-up, no note, no Send (see 9).

### The picker sheet

- Opens from the right edge of the frame. Desktop: covers the frame's right part, leaving 300 px of the builder visible and dimmed on the left. Phone: covers the whole frame.
- Header: title (the Add button's label, e.g. "Add from rin.trades's lists") and a Close icon button named "Close" in the top corner.
- Description under the title. You get: "Entries on rin.trades's have and sale lists that you can see, checked against what they own now." You give: "Objekts held by your linked Cosmo profiles." On a phone the description is read to screen readers only (visually hidden).
- Body: one grid of tiles, scrolling. Desktop 6 columns, phone 3 columns. Tiles follow sample-data order. No toolbar, search or sections.
- Footer, one row:
  - Left: the live count "{count} of 50 picked" (`aria-live="polite"`). When the side is full, a second line: "This side is full. Remove one to pick another."
  - Then the buttons "Cancel" (outline) and "Done" (primary).
- The sheet works on a **working copy** of the side's picks:
  - Done writes the working copy to the builder, closes the sheet, and focuses the Add button.
  - Cancel, Close, Escape and a backdrop click discard the working copy, close the sheet, and focus the Add button.
- On open, focus goes to the first tile.

---

## 3. The grouped tile

Every tile is a CSS card plus label lines under it.

**The card**: a photocard shape, 55:85, with rounded corners, filled with the collection's background colour. Top left: the member name in the collection's text colour. Bottom right: the collection number in mono, same colour. No image.

**Line 1** is always the collection label "{member} {number}", for example "SeoYeon 304Z". The number is mono, the rest sans.

**Mark**: a picked tile shows a mark in the card's top-right corner. A single-copy or hidden tile shows a check. A group tile shows the number of copies picked from it, for example "2".

**Unavailable look**: an unavailable tile's card is dimmed and greyscale. A tile left out only because the side is full is dimmed less, with no greyscale. The look file sets the exact values.

Grouped tiles come in three kinds:

- **Toggle tile** (`role="button"`, `aria-pressed`): a single shown copy under "Pick at once".
- **Count tile** (`role="button"`, `aria-pressed`): a hidden-only group. It gets a − / + stepper once picked.
- **Group tile** (`role="button"`, `aria-haspopup="dialog"`): opens the serial dialog. Used for 2+ shown copies, for any mixed group, and for a single shown copy under "Open the dialog".

Every tile is one tab stop. Enter and Space both do what a click does. A tile that is unavailable keeps focus (`aria-disabled="true"`), so its reason is read with it. Click, Enter and Space then do nothing.

### Tile states

| State                                            | Example                              | Lines under the card (after line 1)                                                                           | Click / Enter / Space                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hidden group, not picked                         | ChaeYeon 105Z (3 hidden)             | "Any serial · 3 available"                                                                                    | Picks 1 any copy. The stepper appears under the tile, showing 1, with "They choose the serial" under it. Focus stays on the tile.                                 |
| Hidden group, picked                             | ChaeYeon 105Z, count 2               | "Any serial · 3 available". Under the tile: stepper "− 2 +", then "They choose the serial"                    | Removes the any pick (count to 0) and the stepper. − at 1 does the same and moves focus to the tile. + stops at the available count (3) or when the side is full. |
| Hidden, single copy                              | Kaede 209Z                           | "Any serial · 1 available"                                                                                    | As above. The stepper's + is disabled at 1.                                                                                                                       |
| Shown group, several copies, none picked         | HeeJin 101Z (12)                     | "Choose from 12 serials"                                                                                      | Opens the serial dialog.                                                                                                                                          |
| Shown, single copy, "Pick at once"               | HyeRin 301Z #1203                    | "#1203" (mono)                                                                                                | Toggles the copy picked and unpicked. Shows the check mark when picked.                                                                                           |
| Shown, single copy, "Open the dialog"            | HyeRin 301Z #1203                    | "#1203" (mono). Once picked, it keeps "#1203" and shows the check mark                                                       | Opens the serial dialog with one row.                                                                                                                             |
| Partly picked                                    | SeoYeon 304Z, #537 and #904 of 5     | "2 of 5 picked". Mark "2"                                                                                     | Opens the dialog with those rows checked.                                                                                                                         |
| Fully picked                                     | JiWoo 207Z, all 3                    | "All 3 picked". Mark "3"                                                                                      | Opens the dialog with every row checked.                                                                                                                          |
| Some copies unavailable                          | YooYeon 310Z (5 copies, 3 available) | "Choose from 3 serials" and, muted, "2 can't be offered". Once picked, the first line becomes "1 of 3 picked" | Opens the dialog. The unavailable rows show with their reasons.                                                                                                   |
| Every copy unavailable, single                   | JinSoul 203Z #77                     | "#77", then in the destructive colour "In a trade in progress"                                                | Nothing (`aria-disabled`).                                                                                                                                        |
| Every copy unavailable, several                  | (no sample; rule only)               | "None available", then muted "{n} can't be offered"                                                           | Opens the dialog read-only: every row is disabled and the confirm button is disabled.                                                                             |
| Estimated serials, group                         | Nien 402Z (4)                        | "Choose from 4 serials"                                                                                       | Opens the dialog. Rows read "~#12" and so on.                                                                                                                     |
| Estimated, single, "Pick at once"                | Choerry 206Z ~#31                    | "~#31" (mono; the "~" is `aria-hidden`, the accessible text is "estimated #31")                               | Toggles the pick.                                                                                                                                                 |
| Ratio, every copy shares one ratio               | Lynn 312Z, ratio 2                   | "Choose from 3 serials", then the ratio chip "1:2" with the accessible name "They ask 2 for this"             | Opens the dialog. The chip repeats in the dialog header.                                                                                                          |
| Ratio differs between copies                     | KimLip 108Z                          | "Choose from 2 serials" (no chip on the tile)                                                                 | Opens the dialog. Each row with a ratio shows its chip.                                                                                                           |
| Mixed: hidden and shown copies of one collection | SooMin 204Z (2 hidden + 2 shown)     | "Choose from 2 serials", then "Any serial · 2 more". Once picked: "{picked} of 4 picked"                      | Opens the dialog, which has the any-serial counter for the hidden copies and rows for the shown ones.                                                             |
| Copy in another open offer (single)              | (no single in sample; rule)          | "#n", then in the warning colour "Also in your open offer #12"                                                | Toggles the pick as usual.                                                                                                                                        |
| Side full, tile with no picks                    | any unpicked tile when 50 picked     | Its usual lines. The card is dimmed (side-full look)                                                                     | Nothing (`aria-disabled`, `aria-describedby` set to the footer's full line).                                                                                      |
| Side full, tile with picks                       | SeoYeon 304Z with 2 picked           | "2 of 5 picked"                                                                                               | Opens the dialog, where you can only remove copies (see 4.6). A count tile's + is disabled, and its − still works.                                                |

**Accessible name of a group tile**: line 1 plus the first detail line, joined by a comma, for example "SeoYeon 304Z, 2 of 5 picked". A toggle tile's name is "HyeRin 301Z #1203". A count tile's name is "ChaeYeon 105Z, Any serial · 3 available".

**Counting**: a group's "available" is its available shown copies plus its hidden copies. "picked" is its checked serials plus its any count.

### Today tiles (Picker = "Today", or You give under "You get only")

This reproduces the app now:

- One tile per shown copy: line 1, then the serial ("#537", or "~#12"), then a flag line if any. The flags are: destructive "Not transferable", destructive "In a trade in progress", warning "Also in your open offer #12". Lynn and KimLip #133 copies also carry the ratio chip. Click toggles the pick. Unavailable copies are `aria-disabled`.
- One count tile per collection with hidden copies, as in the hidden rows above. In SooMin 204Z it sits beside SooMin's two shown copy tiles.
- One extra "Any serial" tile for SeoYeon 304Z, which is a whole-collection entry. Its line is "Any serial · {n} available", where n is 5 minus the SeoYeon serials picked. Click toggles one any copy (no stepper). At n = 0 (all 5 serials picked) and no any pick held, the tile is unavailable (`aria-disabled`) and does nothing. A shown-only collection that holds an any pick made in Grouped also shows this tile, so the pick can be removed. If that pick's count is above 1, the tile shows the stepper so the count can come down.
- Within a collection, the any tile comes before the serial tiles, and the serial tiles go in ascending order.

---

## 4. The serial dialog

A modal dialog over the sheet: `role="dialog"`, `aria-modal="true"`, labelled by its title and described by its description. The sheet behind it is inert.

**Modality stays inside the frame**: do not use `<dialog>.showModal()` or any library dialog that portals to `body` or makes the whole document inert. Set `inert` only on the layers inside the frame (the builder under the sheet, the sheet under the dialog). Tab cycles within the top layer, and outside clicks inside the frame count as backdrop clicks. A pointer click on the switch bar still works, and then the mid-flow rule in section 2 applies.

**Rows, not tiles**: every copy shares the same card art, so rows put the one thing that differs (the serial and its state) in a list that scans and checks fast.

### 4.1 Layout (desktop)

The dialog is centred in the frame, a narrow column (the look file sets its width), at most 80% of the frame's height. The list scrolls. The header and footer stay put.

**Header**:

- Left: a small card of the collection (about a third of a picker tile's width).
- Beside it:
  - Title: "{member} {number}", for example "HeeJin 101Z" (number in mono).
  - A metadata line: You get "{artist} · {season} · {list names}"; You give "{artist} · {season}" only. The list names are joined by ", " in sample-data list order. For example "ARTMS · Atom01 · doubles", or for SooMin "tripleS · Binary01 · spares, quiet haves".
  - The ratio chip, when every copy shares one ratio.
- A Close icon button named "Close" in the top corner.

**Description**: You get "Pick the copies you want from rin.trades." You give "Pick the copies you'll give."

**Toolbar row**: two small text buttons, "Select all" and "Clear".

- "Select all" checks every available row that isn't checked, in list order, until the side is full. It leaves the any-serial control as it is, except that a checked "Any serial" over shown copies only is unchecked once every available row is checked.
- "Clear" unchecks every row and sets the any-serial control to 0 or unchecked.
- "Select all" is disabled when every available row is checked. "Clear" is disabled when nothing in the dialog is picked.

**The any-serial control**: shown first in the list, above the copy rows, only in these cases:

| Group                               | Q3            | Control                                                        | Label lines                                                 | Range                                                                                                                                                                                                           |
| ----------------------------------- | ------------- | -------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hidden copies present (mixed group) | either        | stepper "− n +", starting at the current any count (0 if none) | "Any serial", then "They choose the serial · {H} available" | 0 to H (the hidden copies). It ignores the serials checked, because those copies are different ones.                                                                                                            |
| Shown only, 2+ available copies     | "Offered"     | checkbox                                                       | "Any serial", then "They choose the serial"                 | Unchecked or checked, worth one copy. It is disabled, and cleared, once every available copy is checked by serial. If it is checked and you then check the last unchecked available serial, it unchecks itself. |
| Shown only, 2+ available            | "Not offered" | none                                                           | –                                                           | –                                                                                                                                                                                                               |
| Shown only, 1 copy                  | either        | none (any serial of one copy is that copy)                     | –                                                           | –                                                                                                                                                                                                               |
| You give                            | –             | none                                                           | –                                                           | –                                                                                                                                                                                                               |

The stepper buttons are named "One fewer copy of {member} {number}" and "One more copy of {member} {number}". The stepper's input is named "Any serial of {member} {number}".

**Copy rows**, one per shown copy, in ascending serial order (unavailable copies stay in place):

- A native checkbox labelled by the whole row, so the full row is one hit target.
- The serial in mono: "#537". For an estimated serial, "~#12", where the "~" is `aria-hidden` and visually-hidden text "estimated" comes before "#12".
- After the serial, a " · " metadata line holding only what applies, in this order:
  - the list name, only when the rows themselves come from more than one list (KimLip; SooMin's rows are all from "spares", so they name none);
  - the ratio chip, only when copies differ in ratio;
  - the flag.
- Flags:
  - "Not transferable" (destructive).
  - "In a trade in progress" (destructive).
  - "Also in your open offer #12" (warning). This row stays checkable.
- An unavailable row: the checkbox is `aria-disabled="true"` and stays focusable. Space does nothing. The text is muted.

**Estimated note**: when any row in the dialog is estimated, show once below the rows: "~ marks a serial we estimated. Cosmo may show a different number, so check the objekt in Cosmo before you send it."

**Footer**, one row:

- Left:
  - Line 1: "{picked} of {available} picked" (`aria-live="polite"`).
  - Line 2, muted: "{side total} of 50 on this side". The side total is the sheet's working total with this collection's dialog state in place of its saved picks.
  - When the side is full, line 2 is replaced by "This side is full. Remove one to pick another."
- Right: "Cancel" (outline) and the confirm button (primary). Its label:
  - picked ≥ 1: "Pick 1 copy" or "Pick {count} copies";
  - picked = 0 and the collection had picks when the dialog opened: "Remove all";
  - picked = 0 and no picks before: "Pick copies", disabled.

### 4.2 Opening

The dialog starts from the sheet's working selection for that collection: its checked serials and its any count. On open, focus goes to the first enabled control in the list: the any-serial control if shown, otherwise the first available row's checkbox. Tab order: Close, Select all, Clear, the any-serial control, the rows, Cancel, the confirm button. Focus is trapped in the dialog.

### 4.3 Confirm

The collection's picks in the sheet's working selection are replaced by the dialog's state. Then the dialog closes, focus returns to the group tile, and the tile and the sheet footer's live count update. Nothing reaches the builder until the sheet's Done.

### 4.4 Cancel, Close, Escape, backdrop click

All four discard the dialog's changes, close only the dialog (the sheet stays open), and return focus to the group tile. Escape while the dialog is open never closes the sheet.

### 4.5 Enter

Enter on a checkbox does nothing; Space toggles it. Enter on a button activates it. Enter never submits the dialog.

### 4.6 The 50 limit inside the dialog

Room = 50 − (the sheet's working total without this collection). When the dialog's picked count reaches the room:

- every unchecked available row becomes `aria-disabled`, and Space and click do nothing;
- the any-serial stepper's + and an unchecked any-serial checkbox become disabled;
- "Select all" is disabled;
- the footer's line 2 becomes "This side is full. Remove one to pick another." Disabled rows point to it with `aria-describedby`.

Unchecking frees room again. If "Select all" can't check every row, it checks rows in order until the room is used.

### 4.7 Phone

- The dialog covers the whole frame (full screen), over the full-screen sheet.
- The header has the small card, the title, the metadata line and the Close button. The description is visually hidden (still read by screen readers).
- The "Select all" and "Clear" row sticks under the header. The rows scroll.
- The footer is one row stuck to the bottom: a single text line, "{picked} of {available} picked" (or "This side is full. Remove one to pick another." when full), then "Cancel" and the confirm button. The "{n} of 50 on this side" line is dropped.
- Rows are at least 44 px tall.
- The behaviour is the same as on desktop.

---

## 5. Result in the builder

Each side shows its picks as a grid of small cards: 6 a row on desktop, 4 on a phone. The grid grows with the page and does not scroll inside the side.

**One card per serial.** A collection with 3 picked serials shows **three cards**, side by side. Each copy carries its own flag, its own refusal and its own remove button, as the spec's "Picks in the builder" requires. "× N" stays for any picks, whose copies have no serial yet.

**Order**: collections in sample-data order. Within a collection, the any card comes first, then the serials in ascending order. The same order applies in Today and Grouped.

**Card**: the CSS card with a round remove button (an × icon) at its top-right corner. Under the card:

- Line 1: "{member} {number}".
- Line 2: the serial ("#537", "~#12"), or for an any pick "any serial".
- An any pick with count > 1 also shows "× {count}" on the card's bottom-left corner.
- Note lines, when they apply:
  - an any pick: "Any serial · {n} available" (You get);
  - a copy in an open offer: warning "Also in your open offer #12";
  - the ratio chip "1:2" for a You get pick that carries a ratio.

**Remove button**: named "Remove {member} {number} {serial}", for example "Remove SeoYeon 304Z #537", "Remove Nien 402Z estimated #12", or "Remove ChaeYeon 105Z any serial". It removes that card's pick. For an any pick with a count, it removes the whole any pick. Focus then moves to the next card's remove button, or the previous one when it was the last, or the side's Add button when the side is empty. The side's count drops.

**Changing picks later**:

- Remove a single card with its × button.
- Or open the picker again. Its tiles show the current state ("2 of 5 picked", or the stepper at its count), and the dialog opens with those serials checked and the any control at its count.

---

## 6. Rules

### 6.1 You get, Picker = Grouped

H = hidden copies, S = available shown copies, U = unavailable shown copies.

| List kind          | Copies                | Single copy (Q2) | Any serial on shown (Q3) | Tile shows                                                  | Click does                                                                                                                                      |
| ------------------ | --------------------- | ---------------- | ------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Hides serials      | 1                     | either           | either                   | "Any serial · 1 available"                                  | Picks any × 1. The stepper shows, max 1.                                                                                                        |
| Hides serials      | many                  | either           | either                   | "Any serial · H available"                                  | Picks any × 1. The stepper shows, max H.                                                                                                        |
| Shows serials      | 1                     | Pick at once     | either                   | "#serial"                                                   | Toggles that copy.                                                                                                                              |
| Shows serials      | 1                     | Open the dialog  | either                   | "#serial" (once picked: the same, with the check mark)                     | Opens the dialog with one row and no any control.                                                                                               |
| Shows serials      | many                  | either           | Offered                  | "Choose from S serials" (+ "U can't be offered" when U > 0) | Opens the dialog: an "Any serial" checkbox, then the rows.                                                                                      |
| Shows serials      | many                  | either           | Not offered              | "Choose from S serials" (+ "U can't be offered" when U > 0) | Opens the dialog: rows only.                                                                                                                    |
| Both kinds (mixed) | 1 shown + hidden      | either           | either                   | "Choose from 1 serial" + "Any serial · H more"              | Opens the dialog: the "Any serial" stepper (0 to H), then the row. Q2 does not apply, because there is more than one way to pick.               |
| Both kinds (mixed) | many shown + hidden   | either           | Offered                  | "Choose from S serials" + "Any serial · H more"             | Opens the dialog: the "Any serial" stepper (0 to H), then the rows. There is no extra checkbox: the one any pick per collection is the stepper. |
| Both kinds (mixed) | many shown + hidden   | either           | Not offered              | "Choose from S serials" + "Any serial · H more"             | Same as the row above. Q3 doesn't change a mixed group.                                                                                         |
| Shows serials      | all unavailable, 1    | either           | either                   | "#serial" + the flag                                        | Nothing (`aria-disabled`).                                                                                                                      |
| Shows serials      | all unavailable, many | either           | either                   | "None available" + "U can't be offered"                     | Opens the read-only dialog.                                                                                                                     |

Once a group tile is picked, its first detail line becomes "{picked} of {S + H} picked", or "All {S + H} picked" when every available copy is picked.

### 6.2 You give

| Group in (Q1) | Copies | Single copy (Q2) | Tile shows                                       | Click does                                          |
| ------------- | ------ | ---------------- | ------------------------------------------------ | --------------------------------------------------- |
| Both pickers  | 1      | Pick at once     | "#serial"                                        | Toggles the copy.                                   |
| Both pickers  | 1      | Open the dialog  | "#serial"                                        | Opens the dialog with one row.                      |
| Both pickers  | many   | either           | "Choose from S serials" (+ "U can't be offered") | Opens the dialog: rows only. Q3 never applies here. |
| You get only  | any    | either           | Today tiles: one per copy                        | Toggles that copy.                                  |

### 6.3 Picker = Today (both sides)

| List kind                                                 | Tile shows                                                 | Click does                             |
| --------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| Hides serials                                             | One count tile, "Any serial · H available"                 | Picks any × 1, then the stepper.       |
| Shows serials                                             | One tile per copy, "#serial" + its flag                    | Toggles that copy.                     |
| Shows serials, whole-collection entry (SeoYeon 304Z only) | Also an "Any serial · {S − serials picked} available" tile | Toggles one any copy, with no stepper. |

---

## 7. Sample data

### 7.1 Lists

| Owner      | List              | Type | Serials                                     | Ratio                                    |
| ---------- | ----------------- | ---- | ------------------------------------------- | ---------------------------------------- |
| rin.trades | doubles           | have | shown                                       | per entry (Lynn 312Z and KimLip #133: 2) |
| rin.trades | spares            | sale | shown                                       | none                                     |
| rin.trades | quiet haves       | have | hidden                                      | none                                     |
| you        | (your collection) | –    | shown (your own copies always show serials) | none                                     |

List order for metadata lines: doubles, spares, quiet haves.

### 7.2 You get: rin.trades (14 collections, 52 available copies)

Copy states: "ok" unless marked. NT = not transferable, TIP = in a trade in progress, OO#12 = also in your open offer #12 (still available), ~ = estimated serial. Hidden copies are listed as a count only. The mock never shows their serials.

| #   | Member   | Artist  | Season   | No.  | Bg      | Text    | List(s)                                     | Copies                                                                      |
| --- | -------- | ------- | -------- | ---- | ------- | ------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| T1  | SeoYeon  | tripleS | Cream01  | 304Z | #F2C6D3 | #4A1F2E | doubles (shown, **whole-collection entry**) | #537, #812, #904, #1120, #1388                                              |
| T2  | JiWoo    | tripleS | Binary01 | 207Z | #A9D8F0 | #10324A | doubles (shown)                             | #221, #640, #1002                                                           |
| T3  | HyeRin   | tripleS | Cream01  | 301Z | #F7E08A | #4A3B00 | spares (shown)                              | #1203                                                                       |
| T4  | ChaeYeon | tripleS | Atom01   | 105Z | #C7B7F2 | #2B1A5E | quiet haves (hidden)                        | 3 hidden                                                                    |
| T5  | Kaede    | tripleS | Binary01 | 209Z | #FBD0A8 | #5A2A00 | quiet haves (hidden)                        | 1 hidden                                                                    |
| T6  | YooYeon  | tripleS | Cream01  | 310Z | #B8E6C9 | #12452A | spares (shown)                              | #44, #318 NT, #702 TIP, #955 OO#12, #1460                                   |
| T7  | Nien     | tripleS | Divine01 | 402Z | #1F2A44 | #F4F1EA | spares (shown)                              | ~#12, ~#57, ~#88, ~#140                                                     |
| T8  | Lynn     | tripleS | Cream01  | 312Z | #E9A3B8 | #3F0F1E | doubles (shown), ratio 2 on every copy      | #301, #455, #1290                                                           |
| T9  | SooMin   | tripleS | Binary01 | 204Z | #9FD3D6 | #0E3A3C | spares (shown) + quiet haves (hidden)       | spares: #615, #1077; quiet haves: 2 hidden                                  |
| T10 | HeeJin   | ARTMS   | Atom01   | 101Z | #F3EFE6 | #2A2620 | doubles (shown)                             | #8, #73, #140, #266, #391, #402, #588 OO#12, #717, #846, #903, #1150, #1499 |
| T11 | JinSoul  | ARTMS   | Binary01 | 203Z | #2E5AAC | #FFFFFF | spares (shown)                              | #77 TIP                                                                     |
| T12 | KimLip   | ARTMS   | Atom01   | 108Z | #C8102E | #FFFFFF | doubles (shown) + spares (shown)            | doubles: #133 (ratio 2); spares: #2048 (no ratio)                           |
| T13 | HaSeul   | ARTMS   | Cream01  | 305Z | #8FBF5A | #1E3307 | quiet haves (hidden)                        | 10 hidden                                                                   |
| T14 | Choerry  | ARTMS   | Binary01 | 206Z | #5B2A86 | #F6EEFF | spares (shown)                              | ~#31                                                                        |

Available: T1 5, T2 3, T3 1, T4 3, T5 1, T6 3, T7 4, T8 3, T9 4, T10 12, T11 0, T12 2, T13 10, T14 1, for a total of 52.

### 7.3 You give: your collection (8 collections)

| #   | Member   | Artist  | Season   | No.  | Bg      | Text    | Copies                              |
| --- | -------- | ------- | -------- | ---- | ------- | ------- | ----------------------------------- |
| G1  | HyeRin   | tripleS | Binary01 | 211Z | #FFB3A7 | #5C1A10 | #1203, #1588, #1720, #2001          |
| G2  | YuBin    | tripleS | Cream01  | 306Z | #D9C2A3 | #3D2B14 | #88                                 |
| G3  | NaKyoung | tripleS | Atom01   | 102Z | #A7C7E7 | #13304D | #402, #719 NT, #1033                |
| G4  | SeoAh    | tripleS | Divine01 | 403Z | #2B2B2B | #F2F2F2 | ~#19, ~#64                          |
| G5  | Mayu     | tripleS | Binary01 | 210Z | #F5D7E8 | #4D1838 | #57, #212, #498, #760, #1104, #1377 |
| G6  | HeeJin   | ARTMS   | Cream01  | 302Z | #E6E1F5 | #2C2450 | #455                                |
| G7  | Choerry  | ARTMS   | Atom01   | 104Z | #3E1F5C | #F3E8FF | #902, #1415 OO#9                    |
| G8  | HaSeul   | ARTMS   | Binary01 | 201Z | #9CCB7E | #0F2408 | #333 TIP                            |

For You give, "OO#9" reads "Also in your open offer #9".

### 7.4 Starting picks (also restored by Reset)

- You give (1 of 50): HyeRin 211Z #1203.
- You get (7 of 50): SeoYeon 304Z #537 and #904 (partly picked); JiWoo 207Z #221, #640 and #1002 (fully picked); ChaeYeon 105Z any × 2 (stepper visible).

---

## 8. Copy

"Existing" means the string ships in the app today (`apps/web/messages/en.json`). "New" means it is added by this design. "Mock" means it exists only on the mock page and is never part of the product.

### Mock page

| String                                                                                      | Status |
| ------------------------------------------------------------------------------------------- | ------ |
| "Grouped offer picker"                                                                      | Mock   |
| "A mock of grouping copies by collection in Make offer. Sample data only, nothing is sent." | Mock   |
| "Picker", "Today", "Grouped"                                                                | Mock   |
| "Group in", "Both pickers", "You get only"                                                  | Mock   |
| "Single copy", "Pick at once", "Open the dialog"                                            | Mock   |
| "Any serial on shown lists", "Offered", "Not offered"                                       | Mock   |
| "Width", "Desktop", "Phone"                                                                 | Mock   |
| "These apply to Grouped."                                                                   | Mock   |
| "Fill You get to 48", "Reset"                                                               | Mock   |

### Builder

| String                                                                                                               | Status   |
| -------------------------------------------------------------------------------------------------------------------- | -------- |
| "New offer to rin.trades" (`New offer to {name}`)                                                                    | Existing |
| "You give", "You get"                                                                                                | Existing |
| "{count} of {max}" (e.g. "7 of 50")                                                                                  | Existing |
| "Add from your collection"                                                                                           | Existing |
| "Add from rin.trades's lists" (`Add from {name}'s lists`)                                                            | Existing |
| "Nothing yet. Leave it empty to buy with money alone."                                                               | Existing |
| "Nothing yet. Leave it empty to sell or give."                                                                       | Existing |
| "any serial"                                                                                                         | Existing |
| "× {count}"                                                                                                          | Existing |
| "Remove {name}" (e.g. "Remove SeoYeon 304Z #537")                                                                    | Existing |
| "estimated" (screen reader, before an estimated serial)                                                              | Existing |
| "~ marks a serial we estimated. Cosmo may show a different number, so check the objekt in Cosmo before you send it." | Existing |

### Sheet

| String                                                                                             | Status                                                                                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| "Entries on rin.trades's have and sale lists that you can see, checked against what they own now." | Existing                                                                                                           |
| "Objekts held by your linked Cosmo profiles."                                                      | Existing, shortened. Today it adds "Your have lists come first.", which the mock drops because it has no sections. |
| "{count} of {max} picked"                                                                          | Existing                                                                                                           |
| "This side is full. Remove one to pick another."                                                   | Existing                                                                                                           |
| "Cancel", "Done", "Close"                                                                          | Existing                                                                                                           |

### Tiles

| String                                                 | Status                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| "Any serial · {count} available"                       | Existing                                                                 |
| "They choose the serial"                               | Existing                                                                 |
| "One fewer copy of {name}", "One more copy of {name}"  | Existing                                                                 |
| "Not transferable", "In a trade in progress"           | Existing                                                                 |
| "Also in your open offer {offers}" (e.g. "#12")        | Existing                                                                 |
| "1:2" with "They ask 2 for this"                       | Existing                                                                 |
| "Choose from {count} serials" / "Choose from 1 serial" | New                                                                      |
| "{picked} of {count} picked"                           | New                                                                      |
| "All {count} picked"                                   | New                                                                      |
| "{count} can't be offered"                             | New (the wording follows the existing banner "{count} can't be offered") |
| "Any serial · {count} more"                            | New                                                                      |
| "None available"                                       | New                                                                      |

### Serial dialog

| String                                                                                | Status                                      |
| ------------------------------------------------------------------------------------- | ------------------------------------------- |
| Title "{member} {number}"                                                             | New (it uses the existing collection label) |
| "{artist} · {season} · {lists}"                                                       | New                                         |
| "Pick the copies you want from rin.trades." (`Pick the copies you want from {name}.`) | New                                         |
| "Pick the copies you'll give."                                                        | New                                         |
| "Select all", "Clear"                                                                 | New                                         |
| "Any serial"                                                                          | New (the label of the control)              |
| "They choose the serial · {count} available"                                          | New (joins two existing strings)            |
| "Any serial of {name}" (the stepper input's accessible name)                          | New                                         |
| "{picked} of {count} picked"                                                          | New (same as the tile)                      |
| "{count} of 50 on this side"                                                          | New                                         |
| "Pick 1 copy" / "Pick {count} copies"                                                 | New                                         |
| "Pick copies" (disabled, nothing picked)                                              | New                                         |
| "Remove all"                                                                          | New                                         |
| "Cancel", "Close"                                                                     | Existing                                    |
| "This side is full. Remove one to pick another."                                      | Existing                                    |

Every count string uses plural rules ("1 serial", "2 serials"). Strings are built whole with placeholders, never from fragments.

---

## 9. Out of scope for the mock

The builder leaves these out:

- search, the filter bar (artist, member, season, class, collection number, online/offline), Reset filters, and the Filters button on a phone;
- the List select in either picker. Grouping spans lists by itself, and the dialog's metadata line and per-row list names show where copies come from, so no List select is needed to make sense of it;
- the "Only what I want" and "Only what they want" switches, near-match tags, and the "From your have lists" / "All your objekts" sections;
- paging, loading states, skeletons, errors and empty pickers;
- the top-up, the note, Send, the footer's send hint, blocked-pick banners and refused picks;
- posts ("Offer on", "Add from {post}", one-post partners), counters and matches added on open;
- the partner's collection picker (a partner with no lists);
- real objekt images, the objekt detail sheet, and any link or navigation;
- persistence: a reload starts from the starting picks.
