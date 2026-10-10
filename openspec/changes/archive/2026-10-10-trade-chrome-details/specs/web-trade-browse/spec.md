## MODIFIED Requirements

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Type: All, WTT, WTB or WTS (`type`). All is the default.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- Only matches (`matches=1`), a switch beside the Type tabs, off by default. On, it keeps only posts with at least one match to the viewer, counted the way the match chip counts (see Matches to the signed-in viewer).

The feed SHALL follow the artists selected in the app's artist picker, as Activity does, and keep posts with at least one shown objekt from those artists. A `slug` link SHALL ignore the artist selection, so a link from the objekt drawer lists every post holding that collection. Browse SHALL offer no member, season, class, online/offline or collection-number filters.

Only matches SHALL show only to a signed-in viewer with at least one list that takes part in Trade: a want list, or a have or sale list bound to a Cosmo profile. For anyone else `matches` SHALL be ignored.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of matching posts, newest bump first. The filters SHALL combine. With Only matches on and no matching post, the feed SHALL say that no posts match the viewer's lists and offer to turn Only matches off.

A filter value that does not parse SHALL be ignored.

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: From the objekt drawer
- **WHEN** the viewer opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** only posts with SeoYeon 204Z on a have, want or sale side are listed, whatever artists are selected, and a removable chip names the collection

#### Scenario: Selected artists
- **WHEN** the viewer has only tripleS selected in the artist picker and opens `/trade`
- **THEN** only posts showing at least one tripleS objekt are listed

#### Scenario: Old facet link
- **WHEN** the viewer opens `/trade?season=atom01&class=first` from an older link
- **THEN** the unknown parameters are ignored and the feed lists posts as if they were absent

#### Scenario: Only matches
- **WHEN** a signed-in viewer with a want list holding SeoYeon 204Z turns Only matches on
- **THEN** the URL carries `matches=1`, a post whose have side holds SeoYeon 204Z stays, and a post that matches none of the viewer's lists is no longer listed

#### Scenario: Pages stay full
- **WHEN** only 1 of every 10 posts matches the viewer and Only matches is on
- **THEN** the first page still lists up to a full page of matching posts, newest bump first, and loading more continues from the last one

#### Scenario: Combined with a type
- **WHEN** the viewer turns Only matches on and picks WTB
- **THEN** only want-list posts asking for a collection on the viewer's bound have lists are listed

#### Scenario: Nothing matches
- **WHEN** Only matches is on and no post matches the viewer's lists
- **THEN** the feed says no posts match the viewer's lists, with a control that turns Only matches off

#### Scenario: No lists
- **WHEN** a signed-in viewer with no want list and no bound have or sale list opens `/trade?matches=1`
- **THEN** there is no Only matches switch and every post is listed

### Requirement: Trade tabs
`/trade`, `/trade/for-you` and `/trade/mine` SHALL share a tab bar with Browse, For you and My trades, marking the current one. For a signed-out visitor, For you and My trades SHALL lead to `/login?redirect=` with their path.

For a signed-in user, two tabs SHALL carry a count after their label, in monospace:
- For you: how many partners For you lists under Everyone with all of the user's lists;
- My trades: the open offers waiting on the user (Needs you) plus the trades in progress.

A count of zero SHALL show nothing, and a count above 99 SHALL read "99+". The tab's accessible name SHALL include the count. Counts SHALL be read when the tab bar loads and when the user moves between Trade tabs, and MAY be up to 5 minutes behind For you's own results. Browse SHALL carry no count.

#### Scenario: Switch tabs
- **WHEN** a signed-in user on `/trade` activates For you
- **THEN** the browser is at `/trade/for-you` and For you is marked current

#### Scenario: My trades signed out
- **WHEN** a signed-out visitor activates My trades
- **THEN** the browser is at `/login?redirect=/trade/mine`

#### Scenario: Counts
- **WHEN** a signed-in user has 4 partners under Everyone, 1 offer waiting on them and 1 trade in progress
- **THEN** the tabs read "For you 4" and "My trades 2", and a screen reader announces both counts

#### Scenario: Nothing waiting
- **WHEN** the user has no open offer to answer and no trade in progress
- **THEN** My trades shows no count

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/trade`
- **THEN** no tab shows a count and no count is requested
