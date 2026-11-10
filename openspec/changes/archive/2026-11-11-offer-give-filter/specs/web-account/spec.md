## MODIFIED Requirements

### Requirement: General settings
The General section SHALL let the user change the display name, toggle whether linked social handles
are shown publicly, toggle "Show when I'm online" (on by default; see `web-presence`), toggle the three
offer rules "Only offers with what I want", "Let people ask from more than one post" and "Let people
ask for anything I hold" (see `web-trade-offers`), and remove the profile picture. Saving SHALL persist through the server
and refresh every place the account is shown without a reload.

The Show when I'm online description SHALL say that turning it off hides the user's own dot and still
shows other people's. Once saved, other viewers SHALL follow by their next presence check.

Only offers with what I want SHALL be off by default. Its description SHALL open with what it does
(people can give the user only what they want), then say that an offer on a post with its own want list
can give only objekts on that list and one on a post without one anything, that an offer not on a post
can give only objekts on the user's want lists on Trade, and that cash-only offers and objekts the user
asked for still come through.

Let people ask from more than one post SHALL be on by default. Its description SHALL say that, on, one offer may ask from several of the user's posts, and off, each offer asks from one post the sender chooses.

Let people ask for anything I hold SHALL be off by default. Its description SHALL say that it applies
only while the user has no have or sale list on Trade (once they post one, people can ask only for what
is on it), and that turning it on lets people ask for any objekt at their linked addresses.

Once saved, each offer rule SHALL apply to the next offer sent; offers already open SHALL stay.

#### Scenario: Rename
- **WHEN** the user saves a new name
- **THEN** the nav menu header shows the new name without a reload

#### Scenario: Online off
- **WHEN** the user turns Show when I'm online off and saves
- **THEN** other viewers stop seeing the user's dot within 60 seconds, and the user still sees other people's dots

#### Scenario: Online switch default
- **WHEN** a user who never changed it opens `/account/general`
- **THEN** Show when I'm online is on

#### Scenario: Offer rules default
- **WHEN** a user who never changed them opens `/account/general`, whether their account is new or not
- **THEN** Only offers with what I want and Let people ask for anything I hold are off, and Let people ask from more than one post is on

#### Scenario: Wanted offers on
- **WHEN** the user turns Only offers with what I want on and saves
- **THEN** the next offer someone sends on a post paired with a want list, giving an objekt not on that list, is refused

#### Scenario: One post per offer
- **WHEN** the user turns Let people ask from more than one post off and saves
- **THEN** the next offer someone sends them asking from two of their posts is refused

#### Scenario: Collection asks on
- **WHEN** a user with no have or sale list on Trade turns Let people ask for anything I hold on and saves
- **THEN** people can ask them for any objekt they hold
