## MODIFIED Requirements

### Requirement: Make offer on a post
Each row that shows Message SHALL also offer Make offer. It opens the offer builder for the person, addressed to the row's lead post's own list: the have list of a pair, or the post's only list. You get SHALL ask from all of the person's have and sale lists on Trade, as from a conversation, its picker opening on All their lists; or, for a person who takes asks from one post, from the post chosen under Offer on, which opens on the post the row's matches came from, else the row's lead post (see `web-trade-offers` Choosing the post).

The builder SHALL open with the viewer's matches with the person already added, chosen from those the row counts under the current Compare with list by the rule the row's chip follows (see `web-trade-offers` Matches added when the builder opens), and with none when the row has no match. Add SHALL open the full picker.

A person with no linked Cosmo profile has no Trade handle and so no offer page (see `web-trade-person-pages` Trade handle), and an offer to them could never be accepted. For them, Make offer SHALL show disabled, staying focusable, and say that offers need a linked Cosmo profile, which they have not linked yet; activating it SHALL say the same. It SHALL never be left out without a reason while Message shows.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's row, whose lead post is the have list "doubles" with the most matches, and rin.trades also has the sale list "spares" on Trade
- **THEN** the builder opens addressed to rin.trades, and You get's picker lists the entries of "doubles" and "spares"

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a row whose only post is a WTB post wanting HaSeul 302Z open to swaps, and holds a sendable copy of it on a have list
- **THEN** the builder opens with that copy under You give and the line "Added 1 you give from your match", You give's picker lists the copy as picked, and You get's picker asks from the person's have and sale lists, or their collection when they have none and let people ask for anything they hold

#### Scenario: Row with no match
- **WHEN** a user activates Make offer on a row with no header sentence, since nothing matches
- **THEN** the builder opens with nothing under You give or You get

#### Scenario: Person with no Cosmo profile
- **WHEN** a signed-in user sees the row of hana, whose account links no Cosmo profile and whose only post is a want list
- **THEN** the row shows Message and a disabled Make offer, and focusing or activating Make offer says that offers need a linked Cosmo profile, which hana hasn't linked yet

