## MODIFIED Requirements

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Type: All, WTT, WTB or WTS (`type`). All is the default.
- Artist (`artist`): a row of toggles, All then each artist in the app's artist picker selection, before the other filters. All clears it. More than one artist MAY be on. The row SHALL be hidden when the selection holds one artist.
- Member (`member`), season (`season`), class (`class`), online/offline (`on_offline`) and collection number (`collection`), with the same controls, filter sheet, active chips and Reset as the other collection pages, and the same parameter names and values.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- Only matches (`matches=1`), a switch beside the Type tabs, off by default. On, it keeps only posts with at least one match to the viewer, counted the way the match chip counts (see Matches to the signed-in viewer).

The feed SHALL follow the artists selected in the app's artist picker, as Activity does. An `artist` value outside that selection SHALL be ignored. A `slug` link SHALL ignore the artist selection and the `artist` parameter, so a link from the objekt drawer lists every post holding that collection.

**Narrowing.** When a filter is active, each post SHALL show only the objekts related to it. An objekt is related when it passes every active filter:
- the collection filters (the artist selection, `artist`, `member`, `season`, `class`, `on_offline`, `collection`), when together they leave some collection out: its collection passes them;
- `slug`: its collection is that collection;
- Only matches: it matches the viewer, as the match chip counts it. On a have or sale side, its collection is on one of the viewer's want lists that can take it. On a want side, its collection is on one of the viewer's have or sale lists bound to a Cosmo profile and still tradeable by the viewer.

While any of these is active:
- each side SHALL show only its related objekts;
- its label SHALL read the shown count of the side's total, as "HAVE 4 of 27";
- after its thumbnails and any "+N" tile, the side SHALL show a "+N others" link to its list, counting its objekts that are not related;
- a side with no related objekt SHALL still be shown, reading "0 of N", with no thumbnails and its "+N others" link;
- a post with no related objekt on any side SHALL not be listed.

When none is active (every artist selected, no other filter, no `slug`, Only matches off), posts SHALL be shown whole, with no "of" and no "+N others". The Type filter SHALL not narrow sides.

The match chip SHALL count the whole post, whatever is shown. Rings SHALL mark matched objekts among those shown, so with Only matches on every shown objekt is ringed.

Only matches SHALL show only to a signed-in viewer with at least one list that takes part in Trade: a want list, or a have or sale list bound to a Cosmo profile. For anyone else `matches` SHALL be ignored.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of matching posts, newest bump first. The filters SHALL combine. With Only matches on and no matching post, the feed SHALL say that no posts match the viewer's lists and offer to turn Only matches off. With other filters set and no post listed, the feed SHALL offer Reset.

A filter value that does not parse SHALL be ignored.

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: Split by artist
- **WHEN** the viewer, with tripleS, ARTMS and idntt selected in the artist picker, turns on the ARTMS toggle
- **THEN** the URL carries `artist=artms`, only posts with at least one ARTMS objekt are listed, and each of their sides shows only its ARTMS objekts

#### Scenario: Narrowed side
- **WHEN** the viewer filters to member SeoYeon, and a WTT post's have list holds 27 objekts of which 4 are SeoYeon, and its want list holds 14 of which 1 is SeoYeon
- **THEN** the post shows "HAVE 4 of 27" with 4 thumbnails and "+23 others", and "WANT 1 of 14" with 1 thumbnail and "+13 others"

#### Scenario: Empty side under a filter
- **WHEN** the viewer filters to member SeoYeon, and a WTT post's have side holds SeoYeon objekts but its want side holds none
- **THEN** the post is listed, and its want side reads "WANT 0 of 8" with "+8 others" and no thumbnails

#### Scenario: Chip counts the whole post
- **WHEN** a post has 3 collections on the viewer's want lists, one of them SeoYeon, and the viewer filters to member SeoYeon
- **THEN** the chip still reads `3 ⇄ 0`, and only the SeoYeon objekt among the shown thumbnails is ringed

#### Scenario: Only matches narrows the post
- **WHEN** a signed-in viewer turns Only matches on, and a WTT post's have list holds 27 objekts of which 3 are on the viewer's want lists, and its want list holds 14 of which 2 are on the viewer's bound have lists and still owned
- **THEN** the post shows "HAVE 3 of 27" with those 3 thumbnails, all ringed, and "+24 others", and "WANT 2 of 14" with those 2, ringed, and "+12 others"

#### Scenario: One-way match under Only matches
- **WHEN** Only matches is on, and a post has 2 objekts the viewer wants but wants nothing the viewer has
- **THEN** the post is listed, its have side shows the 2, and its want side reads "WANT 0 of 8" with "+8 others"

#### Scenario: Only matches with a filter
- **WHEN** Only matches is on and the viewer filters to member SeoYeon, and a post's have side holds 3 objekts the viewer wants, one of them SeoYeon
- **THEN** the have side shows only that SeoYeon objekt, reading "HAVE 1 of 27"

#### Scenario: No filter
- **WHEN** the viewer has every artist selected, no other filter set, no `slug` and Only matches off
- **THEN** posts are shown whole, with no "of" count and no "+N others"

#### Scenario: From the objekt drawer
- **WHEN** the viewer opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** only posts with SeoYeon 204Z on a have, want or sale side are listed, whatever artists are selected, each shows only its SeoYeon 204Z objekts with "+N others" for the rest, and a removable chip names the collection

#### Scenario: Selected artists
- **WHEN** the viewer has only tripleS selected in the artist picker and opens `/trade`
- **THEN** only posts showing at least one tripleS objekt are listed, each side shows only its tripleS objekts, and there is no artist toggle row

#### Scenario: Old facet link
- **WHEN** the viewer opens `/trade?season=atom01&class=first` from an older link
- **THEN** the filters apply: only posts with an Atom01 First objekt are listed, narrowed to those objekts, and both filters show as active chips

#### Scenario: Only matches
- **WHEN** a signed-in viewer with a want list holding SeoYeon 204Z turns Only matches on
- **THEN** the URL carries `matches=1`, a post whose have side holds SeoYeon 204Z stays, showing SeoYeon 204Z and not its other objekts, and a post that matches none of the viewer's lists is no longer listed

#### Scenario: Pages stay full
- **WHEN** only 1 of every 10 posts matches the viewer and Only matches is on
- **THEN** the first page still lists up to a full page of matching posts, newest bump first, and loading more continues from the last one

#### Scenario: Combined with a type
- **WHEN** the viewer turns Only matches on and picks WTB
- **THEN** only want-list posts asking for a collection on the viewer's bound have lists are listed

#### Scenario: Nothing matches
- **WHEN** Only matches is on and no post matches the viewer's lists
- **THEN** the feed says no posts match the viewer's lists, with a control that turns Only matches off

#### Scenario: Nothing passes the filters
- **WHEN** the viewer filters to a season no post holds
- **THEN** the feed says no posts match the filters, with Reset

#### Scenario: No lists
- **WHEN** a signed-in viewer with no want list and no bound have or sale list opens `/trade?matches=1`
- **THEN** there is no Only matches switch and every post is listed
