# web-trade-near-matches Specification

## Purpose
Show a signed-in viewer what almost matches on Trade, a collection that would count if one side were open the other way, and what would make it count, without changing any count.

## Requirements

### Requirement: What a near match is

A collection on another person's list SHALL be a near match for a signed-in viewer when it does not count for that list but would if one side's Open to allowed it. Holdings, binding, ownership and transfer checks SHALL be those matches use. Each near match SHALL carry one verb, what the viewer would do: sell, swap or buy. A list's near matches always share one verb, set by the list's Open to.

#### Scenario: Their want is Buying only
- **WHEN** sodalove's want list "Set want tripleS" is Buying only, and JiWoo D337Z on it is on the viewer's bound have list "have 3" and on none of the viewer's sale lists
- **THEN** D337Z is a near match on "Set want tripleS" with the verb sell

#### Scenario: Their want is Swaps only
- **WHEN** a person's want list is Swaps only, and a collection on it is on the viewer's bound sale list set to Sell only and on none of the viewer's have lists or sale lists open to swaps
- **THEN** it is a near match with the verb swap

#### Scenario: Their have list, the viewer's want is Buying only
- **WHEN** a person's have list holds a collection that is only on the viewer's want lists set to Buying only
- **THEN** it is a near match on that have list with the verb swap

#### Scenario: Their Sell only sale list, the viewer's want is Swaps only
- **WHEN** a person's sale list set to Sell only holds a collection that is only on the viewer's want lists set to Swaps only
- **THEN** it is a near match on that sale list with the verb buy

#### Scenario: Already a match
- **WHEN** a collection on the person's list counts for it through any of the viewer's lists
- **THEN** it is a match, ringed as today, and never also a near match

#### Scenario: Open both ways
- **WHEN** the person's list is a want list open to swaps or buying, or a sale list set to Sell or swap
- **THEN** it has no near matches

### Requirement: A near match is never counted

A near match SHALL NOT change any count or order: the row's header sentence and chip, a list's count, Can swap and the mutual score, For you's people, order and narrowing, the order of posts in a row, the "+N" tile and dialog tab counts, Show my matches' count, want-list alerts and notifications, chat post cards and their reply suggestions, or any API response outside the viewer's own reads described here.

#### Scenario: Counts stay
- **WHEN** sodalove's row holds 2 matches and 1 near match on "Set want tripleS"
- **THEN** the header still reads "You have 2 they want", the strip's count reads "2 you have", and sodalove's place in For you is unchanged

#### Scenario: No alert
- **WHEN** sodalove adds a collection to a Buying only want list that the viewer holds only on a have list
- **THEN** no "Someone wants what you have" alert is sent

### Requirement: Near matches on a strip

On another person's row, for a signed-in viewer, each near match SHALL be marked with a muted dashed ring and placed after the ringed objekts, before the rest. After the list's count, the strip SHALL read, muted, "N more if you sell" (or swap, or buy), N counting collections, also when the count is zero. The viewer's own row, a signed-out visitor and For you's strips, which show only matches, see neither. RULE tiles show no near count.

#### Scenario: sodalove's strip
- **WHEN** the viewer looks at sodalove's "Set want tripleS" strip
- **THEN** it reads "2 you have · 1 more if you sell", Kaede D338Z and D340Z are ringed, and JiWoo D337Z follows them with a dashed ring

#### Scenario: Only near matches
- **WHEN** a strip has no match and 3 near matches with the verb buy
- **THEN** it shows no count chip and reads "3 more if you buy"

#### Scenario: Accessible name
- **WHEN** a screen reader reaches the dashed thumbnail
- **THEN** its name says the objekt, that the viewer has it, and that it counts only if they sell it

### Requirement: Near lists in Matched with your lists

A strip's "Matched with your lists" popover SHALL, after the lists its count was taken against, name each of the viewer's lists holding its near matches, muted, with "N more if you sell" (or swap, or buy). A strip with only near matches SHALL open the popover from its near line.

#### Scenario: The list behind a near match
- **WHEN** the viewer opens the popover on sodalove's "Set want tripleS"
- **THEN** it names "spares sale" for the 2 matches, then, muted, "have 3" with "1 more if you sell"

### Requirement: Near matches in a list's dialog

A strip's "+N" dialog SHALL ring its near matches dashed, after the matches. When any are shown, a key SHALL name both rings: "On your lists" and "N more if you sell" (or swap, or buy). Its matching tab SHALL keep only matches; All SHALL hold the near matches.

#### Scenario: Tabs
- **WHEN** the viewer opens "Set want tripleS" from its "+N" tile
- **THEN** "2 you have" lists Kaede D338Z and D340Z, and All lists D337Z dashed after them

### Requirement: Why a near match isn't counted

Opening the objekt drawer from a near match SHALL show one line at the top of its body, above the card, saying why it isn't counted, naming the person and both lists, and one link that fixes it on the viewer's side. With the verb sell, the link SHALL open Add to list for the objekt, offering only the viewer's sale lists bound to a Cosmo profile. Otherwise it SHALL open the post composer on the viewer's list that sets its Open to.

#### Scenario: Sell
- **WHEN** the viewer opens JiWoo D337Z from sodalove's strip
- **THEN** the drawer reads that sodalove wants it for buying only and the viewer's copy is on "have 3", which only swaps, with the link "Add it to a sale list"

#### Scenario: Fixed
- **WHEN** the viewer adds D337Z to "spares sale" from that link
- **THEN** on the next load D337Z is ringed, the strip reads "3 you have", and its near line is gone

#### Scenario: Buy
- **WHEN** the viewer opens a near match with the verb buy, their want list "binary hunt" being Swaps only
- **THEN** the link reads "Open “binary hunt” to buying" and opens the composer on the post holding "binary hunt", where "also pay" can be ticked

### Requirement: Near matches in the offer builder

When the builder adds matches, near matches of the same person, or of the same post, SHALL NOT be added. Under the added-matches line, one line SHALL read "N more if you sell: " (or swap, or buy) with their names, and offer Add it, which adds one copy each by the rules for matches, sell and swap from a want list under You give, swap and buy from a have or sale list under You get. Remove matches SHALL also take out what Add it added; its line counts only matches and names the rest.

#### Scenario: Opened from the row
- **WHEN** the viewer activates Make offer on sodalove's row
- **THEN** You give holds Kaede D338Z and D340Z, and a line reads "1 more if you sell: JiWoo D337Z" with Add it

#### Scenario: Add it
- **WHEN** the viewer activates Add it
- **THEN** the viewer's copy of D337Z is added under You give and the near line is gone

#### Scenario: Only near matches
- **WHEN** the viewer activates Make offer on a row whose strips hold near matches and no match
- **THEN** the builder opens empty with the near line and Add it

#### Scenario: A full side
- **WHEN** You give already holds 50 and the viewer activates Add it on a near line for that side
- **THEN** nothing past 50 is added, so Send is not blocked by the side limit

#### Scenario: Make offer with it, no copy to offer
- **WHEN** the viewer activates Make offer with it and their copy is reserved or can't be sent
- **THEN** the builder opens with the matches and says the objekt couldn't be added

#### Scenario: Make offer with it
- **WHEN** the viewer activates Make offer with it in the drawer of D337Z from sodalove's strip
- **THEN** the builder opens with the matches added and D337Z already added, as after Add it

### Requirement: Top-up for a near sale or buy

When a near match with the verb sell or buy is added by Add it or Make offer with it and the offer holds no top-up, the builder SHALL open the top-up with no amount, its payer set: the person for sell, the viewer for buy. It SHALL say that the person wants it only to buy, or only sells it. The viewer can change the payer or remove the top-up. Remove matches SHALL also remove a top-up opened this way while it has no amount, and Undo SHALL bring it back.

#### Scenario: Sell
- **WHEN** D337Z is added to an offer to sodalove
- **THEN** the top-up opens with "sodalove pays" picked and the amount empty

### Requirement: Near tags in the picker

In the offer picker with "Only what they want" on, each copy that is a near match SHALL carry a tag under its card, "If you sell" (or swap, or buy), in the same muted style. A copy of a collection they want that is on none of the viewer's lists SHALL be tagged "Not on a list". A match carries no tag.

#### Scenario: sodalove's wants
- **WHEN** the viewer opens Add from your collection in an offer to sodalove with "Only what they want" on
- **THEN** D337Z is tagged "If you sell", Kaede D338Z has no tag, and a wanted copy the viewer keeps off every list is tagged "Not on a list"

### Requirement: Near matches under Show my matches

With Show my matches on, someone's list page SHALL also show the near matches, dashed and after the matches, and read "· N more if you sell" (or swap, or buy) after the count. The count and the grid's total SHALL count only matches. When nothing matches but near matches exist, the page SHALL say nothing matches and show the near matches under it.

#### Scenario: sodalove's list page
- **WHEN** the viewer turns on Show my matches on "Set want tripleS"
- **THEN** it reads "2 you have · 1 more if you sell", and the grid shows the 2 matches, then D337Z dashed

### Requirement: Dashed ring in the matching help

The matching help's Good to know table SHALL hold a "Dashed ring" row: it would match, but it counts only if the viewer sells, swaps or buys, as the line beside it says, and it never counts toward a list's count, the row or Can swap.

#### Scenario: Help
- **WHEN** the viewer opens the matching help
- **THEN** Good to know holds the Dashed ring row, as a table row like the others

### Requirement: Words in every language

Every near-match text SHALL be translated in English, Korean and Japanese, keeping the viewer as the one who acts: "1 more if you sell" reads in Korean and Japanese as what the viewer would do, never as what the person limits.

#### Scenario: Korean
- **WHEN** the app is in Korean and a strip has 1 near match with the verb sell
- **THEN** the strip's near line says that the viewer gets 1 more by selling
