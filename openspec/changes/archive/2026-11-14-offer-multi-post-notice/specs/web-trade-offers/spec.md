## ADDED Requirements

### Requirement: Asks from your posts mark
On an offer card, the recipient (never the sender) SHALL see "Asks from {count} of your posts: {posts}", in the place of "Offer on {post}", on an offer on no post whose asks were stored against two or more of their posts. The posts SHALL read by their current names, in the order of the asks, on Trade or not. A post deleted since, and an objekt the recipient offered in the offer being countered, SHALL not count. The mark SHALL block nothing.

#### Scenario: Mark shown
- **WHEN** rin.trades, with Let people ask from more than one post on, opens an offer that asks for one objekt on "doubles" and SeoYeon 204Z #537, which is only on "spares"
- **THEN** the card reads "Asks from 2 of your posts: doubles and spares", it has no "Offer on" line, and rin.trades can still accept

#### Scenario: Sender sees no mark
- **WHEN** the user who sent that offer opens it
- **THEN** their card reads neither "Asks from" nor "Offer on"

#### Scenario: Offer on one post
- **WHEN** rin.trades opens an offer on "doubles" whose asks are all on "doubles"
- **THEN** the card reads "Offer on doubles" and no "Asks from" mark

#### Scenario: Counter keeps their objekt
- **WHEN** rin.trades, with Let people ask from more than one post on, offered HyeRin 301Z #1203, which is on their have list "extras", and the user counters, keeping #1203 and asking for one objekt on "doubles" and SeoYeon 204Z #537, only on "spares"
- **THEN** rin.trades's card reads "Asks from 2 of your posts: doubles and spares": #1203 counts toward no post, since rin.trades offered it

#### Scenario: Counter keeps their objekt on one post
- **WHEN** rin.trades offered HyeRin 301Z #1203, which is on "extras", and the user counters on "doubles", keeping #1203 and asking for one objekt on "doubles"
- **THEN** rin.trades's card reads "Offer on doubles" and no "Asks from" mark

#### Scenario: Post deleted
- **WHEN** rin.trades deletes "spares" after an offer asking from "doubles" and "spares" was sent
- **THEN** the card reads neither "Asks from" nor "Offer on"

#### Scenario: Post taken off Trade
- **WHEN** rin.trades takes "spares" off Trade after an offer asking from "doubles" and "spares" was sent
- **THEN** the card still reads "Asks from 2 of your posts: doubles and spares"

#### Scenario: Closed offer
- **WHEN** rin.trades declines an offer asking from "doubles" and "spares", or it expires, is withdrawn or is accepted
- **THEN** the card still reads "Asks from 2 of your posts: doubles and spares"

### Requirement: Notice after declining an offer across posts
When the recipient declines an offer with the "Asks from" mark, while their "Let people ask from more than one post" is on and they have two or more have or sale lists on Trade, a notice SHALL offer Turn off, which saves the setting off, unless One notice per decline shows another notice instead. Once it has shown, that browser SHALL not show it again. Turning it off SHALL not touch open offers.

#### Scenario: Notice shown
- **WHEN** rin.trades, with the setting on and "doubles" and "spares" on Trade, declines an offer that reads "Asks from 2 of your posts: doubles and spares" and holds no "Not on your wants" item
- **THEN** a notice asks whether each offer should ask from one post, says that with Let people ask from more than one post off each offer asks from one post the sender chooses, and offers Turn off

#### Scenario: Turn it off
- **WHEN** rin.trades chooses Turn off in that notice
- **THEN** the setting is saved off, the notice closes, a message says it is off, Account › General shows Let people ask from more than one post off, and the next offer asking from "doubles" and "spares" is refused as from another post

#### Scenario: Save fails
- **WHEN** rin.trades chooses Turn off and the save fails
- **THEN** a message says it couldn't be turned off and to try again in Account › General, and the setting stays on

#### Scenario: Shown once
- **WHEN** the notice has shown, and rin.trades declines another offer across posts in the same browser
- **THEN** no notice about posts shows

#### Scenario: Setting already off
- **WHEN** rin.trades has the setting off and declines an offer across posts that was open before they turned it off
- **THEN** no notice about posts shows

#### Scenario: Offer on one post
- **WHEN** rin.trades declines an offer on "doubles"
- **THEN** no notice about posts shows

#### Scenario: One post left on Trade
- **WHEN** rin.trades has taken "spares" off Trade, so only "doubles" is on Trade, and declines an offer that reads "Asks from 2 of your posts: doubles and spares"
- **THEN** no notice about posts shows, since the setting would refuse nothing

#### Scenario: Open offers stay
- **WHEN** rin.trades turns the setting off from the notice while another user's offer asking from "doubles" and "spares" is open
- **THEN** that offer stays open, still reads the mark, and rin.trades may still accept it

### Requirement: One notice per decline
A decline SHALL show at most one notice about offer rules. When a declined offer qualifies for both the nudge to turn on Only offers with what I want and the notice to turn off Let people ask from more than one post, the nudge SHALL show if that browser has not shown it before, else the notice. The one not shown SHALL count as not shown, so a later decline can still show it.

#### Scenario: Both apply
- **WHEN** rin.trades, with Only offers with what I want off, "hunting" on Trade and Let people ask from more than one post on, declines an offer whose HyeRin 301Z #1203 reads "Not on your wants" and that reads "Asks from 2 of your posts: doubles and spares"
- **THEN** only the nudge to turn on Only offers with what I want shows

#### Scenario: The other one next
- **WHEN** rin.trades then declines another offer across posts in the same browser
- **THEN** the notice to turn off Let people ask from more than one post shows

#### Scenario: Nudge already shown
- **WHEN** the nudge to turn on Only offers with what I want has shown in this browser before, and rin.trades declines an offer that qualifies for both
- **THEN** the notice to turn off Let people ask from more than one post shows

## MODIFIED Requirements

### Requirement: The post an offer is on
An offer SHALL store the post its asks all come from: the Offer on choice or the post it started from, else the one list they fit. An offer asking across posts, giving only, or asking only for objekts the recipient offered, is on no post. After sending, the offer card and the offer page SHALL read "Offer on {post}" for both people. An offer on no post SHALL show no "Offer on" line, and a post deleted later SHALL drop it.

#### Scenario: Both sides see it
- **WHEN** an offer on "doubles" is sent
- **THEN** both the sender's and rin.trades's card in their conversation read "Offer on doubles"

#### Scenario: Gives only
- **WHEN** an offer to rin.trades gives objekts for a top-up and asks for nothing, whatever Offer on reads
- **THEN** neither card reads "Offer on"

#### Scenario: Partner with no lists
- **WHEN** a user asks rin.trades, who has no have or sale list on Trade and lets people ask for anything they hold, for an objekt from their collection
- **THEN** neither card reads "Offer on"

#### Scenario: Post deleted
- **WHEN** rin.trades deletes "doubles" after the offer was sent
- **THEN** neither card reads "Offer on"

#### Scenario: Across posts
- **WHEN** an offer to rin.trades asks from "doubles" and "spares"
- **THEN** neither card reads "Offer on", and rin.trades's card reads the Asks from your posts mark instead

### Requirement: Nudge after declining an unwanted offer
When the recipient declines an offer holding a "Not on your wants" item, while their "Only offers with what I want" is off and they have a want list shown on Trade, a notice SHALL offer to turn it on, with a button that saves the setting. Once it has shown, that browser SHALL not show it again, since a notice that closes on its own can't be told from one dismissed. Turning the setting on SHALL not touch other open offers.

#### Scenario: Nudge shown
- **WHEN** rin.trades, with the setting off and "hunting" on Trade, declines an offer whose HyeRin 301Z #1203 reads "Not on your wants"
- **THEN** a notice offers to turn on Only offers with what I want

#### Scenario: Turn it on
- **WHEN** rin.trades chooses Turn on in that notice
- **THEN** the setting is saved on, Account › General shows it on, and the notice closes

#### Scenario: Shown once
- **WHEN** the notice has shown, and rin.trades declines another such offer in the same browser
- **THEN** no notice to turn on Only offers with what I want shows

#### Scenario: No nudge for wanted gives
- **WHEN** rin.trades declines an offer whose gives are all on their want lists
- **THEN** no notice to turn on Only offers with what I want shows

#### Scenario: No nudge without a want list on Trade
- **WHEN** rin.trades has no want list shown on Trade and declines an offer with a "Not on your wants" item
- **THEN** no notice to turn on Only offers with what I want shows, since the setting would not filter anything

#### Scenario: Setting already on
- **WHEN** rin.trades has the setting on and declines an offer that was open before they turned it on, holding a "Not on your wants" item
- **THEN** no notice to turn on Only offers with what I want shows

## REMOVED Requirements

### Requirement: Notice of Only offers with what I want
**Reason**: The notice at the top of Messages introduced the setting when it was new. It stayed for everyone who never answered it, and with the notice after declining an offer across posts it put two requests about offer rules on one screen.
**Migration**: None. The nudge after declining an unwanted offer still offers the setting, and Account › General still holds it. A browser's stored answer to the notice is left as it is and read by nothing.
