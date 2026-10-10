## MODIFIED Requirements

### Requirement: Want-list alerts
For each of a user's want lists, whether or not it is on Trade, the system SHALL notify the user when an entry for a collection on that want list is newly added to another account's discoverable have list bound to a Cosmo profile, or to such a sale list when the want list is open to Trade or buy (see `web-lists`). It SHALL also notify when such a list becomes discoverable. The alert SHALL arrive within 10 minutes, including when entries are committed out of order. Alerts SHALL be grouped as one unread notification per want list per day. While that notification is unread, further matches SHALL update its count and the latest objekts instead of creating new ones. Its target SHALL be `/trade/for-you?list=<want-list-slug>`. A given want list, source list and collection SHALL alert at most once, even if the entry is removed and added again.

No alert SHALL be created for:
- the user's own lists;
- a hidden partner;
- an entry whose objekt the source list's owner no longer owns, or which is not transferable;
- a collection the user already owns a copy of.

#### Scenario: New sale listing matches a want list
- **WHEN** another account adds SeoYeon 204Z to a sale list shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to Trade or buy
- **THEN** within 10 minutes the user has an unread notification for "Binary hunt" naming that objekt and seller, linking to `/trade/for-you?list=<slug>`

#### Scenario: Grouped while unread
- **WHEN** three more matches for "Binary hunt" arrive the same day before the user opens the first notification
- **THEN** the user still has one unread notification for "Binary hunt", and it now counts four matches

#### Scenario: Re-added entry
- **WHEN** the seller removes the matched entry and adds it again
- **THEN** no new alert is created for it

#### Scenario: Already owned
- **WHEN** a matching objekt is listed but the user already owns a copy of that collection
- **THEN** no alert is created

#### Scenario: Sale listing and a Trade only want list
- **WHEN** another account adds SeoYeon 204Z to a sale list shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to Trade only
- **THEN** no alert is created for that entry

### Requirement: Reverse-direction alerts
When the user has "Someone wants what you have" turned on, the system SHALL notify them when another account adds, to a discoverable want list, a collection that is on one of the user's have lists bound to a Cosmo profile, or on such a sale list when that want list is open to Trade or buy (see `web-lists`). The same grouping, once-only, timing and exclusion rules as want-list alerts SHALL apply, grouped per the user's list. The target SHALL be `/trade/for-you?list=<that-list-slug>`.

#### Scenario: Off by default
- **WHEN** a user has never changed the setting and someone wants a collection on their have list
- **THEN** no notification is created

#### Scenario: Trade only want list and the user's sale list
- **WHEN** the user has the setting on, and another account adds to a want list open to Trade only a collection that is only on the user's sale list
- **THEN** no alert is created
