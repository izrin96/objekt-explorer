## MODIFIED Requirements

### Requirement: Offer rules
The Trade section SHALL hold, under an Offers heading, the two offer rules "Only offers with what I
want" and "Let people ask for anything I hold" (see `web-trade-offers`). Each switch SHALL save on change, with no Save button, and refresh every place
the account is shown without a reload. A failed save SHALL put the switch back and say it couldn't be
saved.

Only offers with what I want SHALL be off by default. Its description SHALL open with what it does
(people can give the user only what they want), then say that an offer on one of the user's posts can
give only objekts on that post's want list, and no objekts on a post without one; that an offer started
from the user's Buy post can give only objekts on its want list; that any other offer can give only
objekts on the user's want lists on Trade; and that cash-only offers and objekts the user asked for in a
counter still come through.

There SHALL be no switch for asking across posts: every offer to the user asks from one of their posts (see `web-trade-offers` One post per offer). A save that still sends the removed setting "Let people ask from more than one post", as from a tab opened before it was removed, SHALL be accepted and SHALL store nothing.

Let people ask for anything I hold SHALL be off by default. Its description SHALL say that it applies
only while the user has no have or sale list on Trade (once they post one, people can ask only for what
is on it), and that turning it on lets people ask for any objekt at their linked addresses.

Once saved, each offer rule SHALL apply to the next offer sent; offers already open SHALL stay.

#### Scenario: Offer rules default
- **WHEN** a user who never changed them opens `/account/trade`, whether their account is new or not
- **THEN** the Offers heading holds two switches, Only offers with what I want and Let people ask for anything I hold, both off, and no switch named Let people ask from more than one post

#### Scenario: Wanted offers on
- **WHEN** the user turns Only offers with what I want on
- **THEN** it is saved with no Save button, and the next offer someone sends on a post paired with a want list, giving an objekt not on that list, is refused

#### Scenario: Post without a want list
- **WHEN** the user has Only offers with what I want on and the have list "extras" posted alone, and someone's offer on "extras" gives an objekt
- **THEN** the offer is refused; the same offer with only a top-up is sent

#### Scenario: Description
- **WHEN** the user opens `/account/trade`
- **THEN** Only offers with what I want's description says what a post with a want list, a post without one, a Buy post and any other offer can be given, and that cash-only offers and objekts asked for in a counter still come through

#### Scenario: One post per offer
- **WHEN** a tab opened before the switch was removed still shows Let people ask from more than one post, and the user turns it off
- **THEN** the save is accepted and nothing is stored, the next offer someone sends them is held to one post as every offer is, and after a reload the switch is gone

#### Scenario: Collection asks on
- **WHEN** a user with no have or sale list on Trade turns Let people ask for anything I hold on
- **THEN** people can ask them for any objekt they hold

#### Scenario: Save fails
- **WHEN** the user turns Only offers with what I want on and the save fails
- **THEN** the switch goes back off and a message says the account couldn't be updated
