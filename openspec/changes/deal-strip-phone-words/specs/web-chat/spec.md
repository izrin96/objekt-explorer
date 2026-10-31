# Spec Delta

## MODIFIED Requirements

### Requirement: Deal strip layout
The strip's line SHALL truncate as the row's deal line does, keeping the number and "v of t" whole. Below `md` the strip SHALL be one line, without its second line and without "v of t", and keep its action as a labelled button; the strip is never a link as a whole. It SHALL stay one line and in view under the header while the message box has focus and the on-screen keyboard is open.

Below `md`, a trade in the Your turn, Their turn or Stuck state SHALL read the Inbox row's short words in place of the "Strip by state" table's words: "Your turn", "Waiting for them" and "Can't be sent", so whose turn it is is not cut off; these SHALL fit whole from 360 px. Every other state SHALL read the table's words, and from `md` up every state SHALL read as the table gives it, "v of t" included.

#### Scenario: Phone
- **WHEN** izrin96 opens the thread with haneul_07 at 390 px and focuses the message box
- **THEN** the strip is one line, "T-89 · Your turn" with an "Open trade" button, and stays under the header above the keyboard

#### Scenario: Narrow phone, their turn
- **WHEN** izrin96 opens the thread for T-89 at 360 px while it waits on haneul_07, with 2 of 8 verified
- **THEN** the strip reads "T-89 · Waiting for them" in full, with "Open trade"

#### Scenario: Phone, a different copy to decide
- **WHEN** izrin96 opens the thread for a trade where izrin96 must decide on a different copy, at 390 px
- **THEN** the strip reads "T-n · In progress · you decide", truncating if it must

#### Scenario: Desktop keeps the full line
- **WHEN** izrin96 opens the thread with haneul_07 at 1280 px
- **THEN** the strip reads "T-89 · In progress · your turn · 2 of 8", with "Send 4 objekts to haneul_07 in Cosmo" under it
