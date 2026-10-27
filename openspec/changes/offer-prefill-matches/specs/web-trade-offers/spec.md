## ADDED Requirements

### Requirement: Matches added when the builder opens
Opened from a Trade row's Make offer, the builder SHALL add the sender's matches with the partner, swaps and sales alike, before it shows its sides. You give gets one copy of each collection the sender has that the partner wants; You get one of each the partner has that the sender wants. The matches SHALL be read live, by the rules and the Compare with list the row counts with, up to 50 a side.

#### Scenario: From a Trade row
- **WHEN** the sender chooses Make offer on rin.trades's row, which reads "They have 5 you want · You have 3 they want", 2 of the 5 only on a Sell only sale list
- **THEN** the builder opens with 3 objekts under You give and 5 under You get, one per matched collection

#### Scenario: Under Compare with
- **WHEN** the sender has Compare with set to their want list "ARTMS wants" on Browse, and chooses Make offer on rin.trades's row
- **THEN** You get holds only the collections on "ARTMS wants" that rin.trades has, as the row counted them

#### Scenario: Over the limit
- **WHEN** the sender has 60 collections rin.trades wants, and rin.trades has 5 the sender wants
- **THEN** You give holds 50 of them, the line says more matched than fit, and the side limit doesn't keep Send disabled

### Requirement: Reading the matches
While the read runs, the builder SHALL show its title, a status line reading "Adding your matches…", a placeholder for each side and Cancel, and no picker, footer hint or Send. The status line SHALL stay in one place from the first frame to the close, then say what was added or that the read failed. Focus SHALL start on the dialog's title.

#### Scenario: Loading
- **WHEN** the builder is reading the matches
- **THEN** it shows its title, the status line "Adding your matches…", a placeholder for each side and Cancel, with no picker, no "Add at least one objekt to either side." hint and no Send, and focus is on the title

#### Scenario: One status line throughout
- **WHEN** the read ends and the sides appear
- **THEN** "Adding your matches…" is replaced in the same status line by what was added, and no second status line or alert appears

### Requirement: Matches of one post
From Make offer on this post, or a conversation whose newest card is the partner's post card with a match, the builder SHALL add only the matches through that post's lists: under You get those on its have or sale list, under You give those on its want list. You get's picker SHALL open on the post's have or sale list, as from a Market listing, else on All their lists. What may be sent is not narrowed. The line SHALL name the post's list.

#### Scenario: One post of two
- **WHEN** rin.trades has the WTT post "doubles" and "wants", whose strips read "3 you want" and "3 you have", and the WTS post "spares", open to swaps, which reads "2 you want", and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with 3 under You give and 3 under You get, none from "spares", the line reads "Added from doubles: 3 you give and 3 you get", and You get's picker opens on "doubles"

#### Scenario: WTB post
- **WHEN** jun.k has the WTT post "extras" and the WTB post "hunting", which reads "2 you have", and the sender chooses Make offer on this post on "hunting"
- **THEN** the builder opens with 2 under You give, nothing under You get, the line "Added from hunting: 2 you give", and You get's picker on All their lists

#### Scenario: From a conversation with a post card
- **WHEN** the sender opens Make offer in their conversation with rin.trades, whose newest card is the post card for "doubles" with "They have 2 you want"
- **THEN** the builder opens with the matches through "doubles" and its want list read now, which may differ from the 2 saved on the card, and the line names "doubles"

#### Scenario: Asking past the post
- **WHEN** the builder opened from "doubles", and the sender switches You get's List to "spares" and adds an objekt from it
- **THEN** the offer sends with that objekt

### Requirement: Which copy a match adds
For You give, a match SHALL add the sender's copy with the highest serial they can send, preferring one in none of their other open offers. For You get, it SHALL ask for any serial where the partner listed the collection as any copy or on a list that hides serials, and otherwise for the partner's copy with the lowest serial they can send. A copy that isn't transferable or is reserved by a trade SHALL never be added.

#### Scenario: Highest serial given
- **WHEN** the sender holds SeoYeon 204Z #12 and #537, both sendable, and rin.trades wants 204Z
- **THEN** You give holds #537

#### Scenario: Copy in another open offer
- **WHEN** the sender's #537 is in their open offer to kaede.k and #12 is in none
- **THEN** You give holds #12

#### Scenario: Any serial asked
- **WHEN** rin.trades lists HaSeul 302Z as any copy on "doubles"
- **THEN** You get asks for one copy of 302Z, its tile showing any serial

#### Scenario: Lowest serial asked
- **WHEN** rin.trades lists HaSeul 302Z #88 and #140 by serial, both sendable
- **THEN** You get holds #88

### Requirement: The added-matches line
When matches were added, the status line SHALL say how many it added to each side, with Remove matches, its counts fixed when the builder opens, and SHALL say when more matched than fit a side. It SHALL be ink on the progress tint, led by the swap arrows, with its numbers in mono. With one side added it names that side only, and "from your match" for 1. From a post it starts "Added from {list}:".

#### Scenario: Line
- **WHEN** the builder opens with 3 under You give and 5 under You get from the matches
- **THEN** the line reads "Added 3 you give and 5 you get from your matches" with Remove matches

#### Scenario: One side only
- **WHEN** the matches add 2 under You give and nothing under You get
- **THEN** the line reads "Added 2 you give from your matches"

#### Scenario: One match
- **WHEN** the matches add 1 under You get and nothing under You give
- **THEN** the line reads "Added 1 you get from your match"

#### Scenario: More matched than fit
- **WHEN** 60 of the sender's collections match rin.trades's wants, and 5 of rin.trades's match the sender's
- **THEN** the line reads "Added 50 you give and 5 you get from your matches. Only 50 of the 60 that matched fit on You give."

### Requirement: Remove matches and Undo
Remove matches SHALL take out every pick the matches added that is still there and keep the picks the sender added. The line SHALL then keep its slot and read "Took out {count} matches" ("1 match" for one) with Undo, and focus SHALL move to Undo. Undo SHALL put those picks back and show the line as it read when the builder opened. Once the sender has removed every added pick one by one, the line SHALL go.

#### Scenario: Remove matches keeps the sender's picks
- **WHEN** the builder opened with 3 and 5 from the matches, and the sender adds JiWoo 101Z under You get and then chooses Remove matches
- **THEN** both sides lose the 8 added matches, You get keeps JiWoo 101Z, the line reads "Took out 8 matches" with Undo, and focus is on Undo

#### Scenario: Undo
- **WHEN** the line reads "Took out 8 matches" and the sender chooses Undo
- **THEN** the 8 picks are back, the line reads "Added 3 you give and 5 you get from your matches", and focus is on Remove matches

#### Scenario: Counts stay as opened
- **WHEN** the sender removes one added pick from You get
- **THEN** the line still reads "Added 3 you give and 5 you get from your matches"

#### Scenario: Every added pick removed by hand
- **WHEN** the sender removes each of the 8 added picks with its own remove button
- **THEN** the line goes

### Requirement: Closing after matches were added
Closing the builder SHALL ask nothing when the added picks are unchanged, or when the builder holds nothing (no picks, no top-up amount and no note), including after Remove matches. Otherwise closing SHALL ask as for any draft.

#### Scenario: Close unchanged
- **WHEN** the sender closes the builder without changing the added picks
- **THEN** it closes without asking to discard

#### Scenario: Close empty after Remove matches
- **WHEN** the sender chooses Remove matches with no picks of their own, no top-up amount and no note, and then closes the builder
- **THEN** it closes without asking to discard

#### Scenario: Close with the sender's own pick
- **WHEN** the sender chooses Remove matches while JiWoo 101Z they added is still under You get, and then closes the builder
- **THEN** it asks to discard, as for any draft

### Requirement: When no matches are added
The builder SHALL add no matches when it opens from a counter-offer, from a Market listing, from Make offer on this post on a post whose strips count no match, or from a conversation whose newest card is not the partner's post card with a match; those keep their own prefill or open empty, with no status line. No top-up SHALL be added for a match through a sale list: the sender sets one.

#### Scenario: Sale-only match
- **WHEN** rin.trades has HaSeul 302Z only on a Sell only sale list, and the sender wants it
- **THEN** You get holds 302Z and no top-up is set

#### Scenario: Wanted for buying only
- **WHEN** sodalove wants JiWoo D337Z on a want list open to buying only, and the sender has it on a sale list
- **THEN** You give holds D337Z and no top-up is set

#### Scenario: Counter-offer
- **WHEN** the sender counters rin.trades's offer
- **THEN** the builder holds the countered offer's objekts and no matches are added

#### Scenario: Conversation without a post card
- **WHEN** the sender opens Make offer in a conversation whose newest card is an objekt card
- **THEN** the builder opens empty

### Requirement: A failed read
If reading the matches fails, the builder SHALL open empty, and the status line SHALL read "Couldn't add your matches. Add objekts below." in the warning tone, never as an alert.

#### Scenario: Read fails
- **WHEN** reading the matches fails
- **THEN** the builder opens empty, the status line reads "Couldn't add your matches. Add objekts below." in the warning tone, and both pickers work
