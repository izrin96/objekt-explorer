## MODIFIED Requirements

### Requirement: Notification settings
The Notifications section of the account page (`/account/notifications`) SHALL have one setting per notification type:
- "Someone has what you want": a choice of Off, Any or Can swap, Can swap by default;
- "Someone wants what you have": a choice of Off, Any or Can swap, Can swap by default;
- Offers: a switch, on by default;
- Trades: a switch, on by default.

Each choice SHALL say what it does: Any alerts for every match, Can swap alerts only when the other person also wants something the user has, inside one of the user's posts (see Want-list alerts), and Off sends none. Can swap SHALL say that it leaves out sale listings, and that a list with no link alerts on swap listings. A change SHALL save on its own, as the switches do.

A user who had turned either alert type off before this choice existed SHALL keep it Off. Every other setting of those two types, the default or turned on, SHALL become Can swap.

Turning a type off SHALL stop new notifications of that type. Changing between Any and Can swap SHALL apply to matches the alert job reads after the change. Notifications already created SHALL stay, and SHALL keep the target they were created with.

#### Scenario: Default choice
- **WHEN** a user who has never changed their notification settings opens `/account/notifications`
- **THEN** "Someone has what you want" and "Someone wants what you have" both show Can swap selected

#### Scenario: Earlier opt-out is kept
- **WHEN** a user had turned "Someone has what you want" off before this change
- **THEN** it shows Off, and no want-list alert is created for them

#### Scenario: Turn off "Someone has what you want"
- **WHEN** the user picks Off for "Someone has what you want" and a matching objekt is listed afterwards
- **THEN** no new notification is created for it

#### Scenario: Turn off offers
- **WHEN** the user turns Offers off and then receives an offer
- **THEN** no notification is created, and the offer still appears in the conversation and in My trades

#### Scenario: Turn off trades
- **WHEN** the user turns Trades off and a leg of their trade verifies
- **THEN** no notification is created, and the trade page still shows the leg Verified

### Requirement: Want-list alerts
For each of a user's want lists, whether or not it is on Trade, the system SHALL notify the user when an entry for a collection on that want list is newly added to another account's discoverable have list bound to a Cosmo profile, or to such a sale list set to Sell or swap, when the want list is open to swaps, or to such a sale list when the want list is open to buying (see `web-lists` Want list match option and Sale list Open to). Which of another account's lists take part SHALL follow the same rules as For you (see `web-trade-for-you` Account-wide matches): an idle list does not alert, and neither does a hidden, blocking, blocked or trade-blocked account's list. It SHALL also notify when such a list becomes discoverable. The alert SHALL arrive within 10 minutes, including when entries are committed out of order. An entry SHALL still alert when its save commits up to 10 minutes after it began. A stop of the alert job SHALL delay alerts, not drop them: once the job runs again, every entry added in the meantime SHALL alert, each at most once. Losing the cache server SHALL neither skip nor repeat an alert. Alerts SHALL be grouped as one unread notification per want list per day. While that notification is unread, further matches SHALL update its count and the latest objekts instead of creating new ones. A given want list, source list and collection SHALL alert at most once, even if the entry is removed and added again.

**Any or Can swap.** Which matches alert SHALL follow the user's "Someone has what you want" choice (see Notification settings):
- Any: every match above;
- Can swap: a match only while the other account is one of the people For you lists under Can swap (its Mutual) on the page the alert opens: Compare with naming the alert's list, which compares that list and its linked list (see `web-trade-browse` Matches and Compare with). That means one of the other account's posts can swap with the alert's pair: it holds a collection on the alert's want list, and its want list, open to swaps, wants a collection the user still owns on the have list linked to that want list (see `web-trade-browse` Matches to the signed-in viewer). The post holding the new match need not be that post. A match from a sale list set to Sell only SHALL never alert under Can swap, since a sale is not a swap; one from a sale list set to Sell or swap counts like a have list's.
- A want list with no link can never make Can swap, so under Can swap it SHALL alert for a match from a have list or a sale list set to Sell or swap without asking whether the other account also wants something of the user's, and SHALL never alert for a sale list set to Sell only. Such an alert counts as made under Any.

The alert's target SHALL be For you with Compare with naming that want list (see `web-trade-browse`): `/trade/for-you?match=any&list=<want-list-slug>` for an alert made under Any, and `/trade/for-you?match=mutual&list=<want-list-slug>` for one made under Can swap. A grouped notification SHALL lead to the target of its latest match. A notification made before this choice existed SHALL lead to `match=any`.

No alert SHALL be created for:
- the user's own lists;
- a hidden partner;
- an entry its have or sale list's owner cannot trade, because none of their linked addresses holds it or it is not transferable;
- a collection the user already owns a copy of.

An entry left out only because its owner cannot trade it yet, or, under Can swap, only because the match is not mutual yet, SHALL be checked again on every alert run for 24 hours after the run that first left it out (for an entry added to a list already on Trade, about 24 hours after it was added). It SHALL alert on the first run that finds it passes, and after those 24 hours it SHALL not alert.

#### Scenario: Objekt arrives after it is listed
- **WHEN** another account adds SeoYeon 204Z to a have list on Trade, SeoYeon 204Z is on the user's want list "Binary hunt", and the objekt reaches that account's linked address 20 minutes later
- **THEN** within 10 minutes of the transfer being indexed, the user has an alert for it

#### Scenario: Objekt arrives too late
- **WHEN** the objekt reaches the lister's linked address 30 hours after it was added to their have list
- **THEN** no alert is created for that entry

#### Scenario: New sale listing matches a want list
- **WHEN** the user has "Someone has what you want" on Any, another account adds SeoYeon 204Z to a sale list set to Sell only and shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to buying
- **THEN** within 10 minutes the user has an unread notification for "Binary hunt" naming that objekt and seller, linking to `/trade/for-you?match=any&list=<slug>`

#### Scenario: Sale listing under Can swap
- **WHEN** the user has "Someone has what you want" on Can swap, and the same sale listing matches "Binary hunt"
- **THEN** no alert is created for that entry

#### Scenario: Mutual match
- **WHEN** the user has Can swap, another account adds SeoYeon 204Z to a have list on Trade, SeoYeon 204Z is on "Binary hunt", and that account's want list open to swaps holds a collection the user owns on a bound have list
- **THEN** within 10 minutes the user has an unread notification for "Binary hunt", linking to `/trade/for-you?match=mutual&list=<slug>`

#### Scenario: One-sided match under Can swap
- **WHEN** the user has Can swap, and another account adds SeoYeon 204Z to a have list on Trade, but wants nothing on the user's have lists
- **THEN** no alert is created for that entry

#### Scenario: Match across the user's posts under Can swap
- **WHEN** the user has Can swap, "Binary hunt" is linked to have list "spares", and another account adds SeoYeon 204Z (on "Binary hunt") to its post while that post wants only a collection on the user's have list "doubles", which is linked to a different want list
- **THEN** no alert is created for that entry

#### Scenario: Unlinked want list under Can swap
- **WHEN** the user has Can swap, their want list "wishlist", open to swaps, has no link, and another account that wants nothing of the user's adds a collection on "wishlist" to a have list on Trade
- **THEN** within 10 minutes the user has an alert for "wishlist", linking to `/trade/for-you?match=any&list=<slug>`

#### Scenario: Unlinked want list and a sale listing under Can swap
- **WHEN** the user has Can swap, their want list "wishlist", open to swaps or buying, has no link, and another account adds a collection on "wishlist" to a sale list set to Sell only
- **THEN** no alert is created for that entry

#### Scenario: Becomes mutual within 24 hours
- **WHEN** under Can swap, a one-sided entry was left out, and 3 hours later the other account adds to their want list a collection on the user's have list
- **THEN** a later alert run within 10 minutes of that edit alerts for the entry

#### Scenario: Becomes mutual after 24 hours
- **WHEN** the same happens 30 hours after the entry was first left out
- **THEN** no alert is created for that entry

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
- **WHEN** another account adds SeoYeon 204Z to a sale list set to Sell only and shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to swaps only
- **THEN** no alert is created for that entry

#### Scenario: Sell or swap listing and a Trade only want list
- **WHEN** the user has "Someone has what you want" on Any, another account adds SeoYeon 204Z to a sale list set to Sell or swap, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to swaps only
- **THEN** within 10 minutes the user has an alert for "Binary hunt" naming that objekt, as for a have list

#### Scenario: Have listing and a Buying only want list
- **WHEN** another account adds SeoYeon 204Z to a have list on Trade, and SeoYeon 204Z is on the user's want list "Binary hunt", which is set to Buying only
- **THEN** no alert is created for that entry

#### Scenario: Late commit
- **WHEN** another account's save of SeoYeon 204Z to a matching have list takes 8 minutes to commit, and an alert run passes in the meantime
- **THEN** the user still gets an alert for it, within 10 minutes of the commit

#### Scenario: Alert job down for an hour
- **WHEN** the alert job is stopped for an hour while matching entries are added, and then starts again
- **THEN** every one of those entries alerts as the job catches up, and none alerts twice

#### Scenario: Cache server lost
- **WHEN** the cache server is flushed or recreated between two alert runs
- **THEN** the next run carries on from where the last one stopped: no entry added in between is skipped and none alerts twice

### Requirement: Reverse-direction alerts
Unless the user has "Someone wants what you have" on Off, the system SHALL notify them when another account adds, to a discoverable want list, a collection that is on one of the user's have lists bound to a Cosmo profile, or on such a sale list set to Sell or swap, when that want list is open to swaps, or on such a sale list when that want list is open to buying (see `web-lists` Want list match option and Sale list Open to). The same grouping, once-only, timing and exclusion rules as want-list alerts SHALL apply, grouped per the user's list. The same Any or Can swap rules SHALL apply from the user's side: under Can swap, the other account must be one of the people For you lists under Can swap for the user's list and the want list linked to it, a match against only the user's sale lists set to Sell only SHALL never alert, and the user's have list, or sale list set to Sell or swap, with no link SHALL alert for a match from a want list open to swaps without asking whether the other account has something the user wants, and never for a match that only buying makes, that alert counting as made under Any. The target SHALL be `/trade/for-you?match=any&list=<that-list-slug>` for an alert made under Any, and `/trade/for-you?match=mutual&list=<that-list-slug>` for one made under Can swap.

#### Scenario: Can swap by default
- **WHEN** a user has never changed the setting, someone adds to a want list open to swaps a collection on the user's have list, and that person has on a have list a collection on the user's want list
- **THEN** the user gets a reverse-direction alert

#### Scenario: Off by default
- **WHEN** a user has never changed the setting and someone wants a collection on their have list, but has nothing the user wants
- **THEN** no notification is created, since a one-sided match does not alert under Can swap

#### Scenario: Off
- **WHEN** the user has the setting on Off and someone wants a collection on their have list
- **THEN** no notification is created

#### Scenario: Trade only want list and the user's sale list
- **WHEN** the user has the setting on Any, and another account adds to a want list open to swaps only a collection that is only on the user's sale list set to Sell only
- **THEN** no alert is created

#### Scenario: Buying only want list and the user's have list
- **WHEN** the user has the setting on Any, and another account adds to a want list set to Buying only a collection that is only on the user's have list
- **THEN** no alert is created

#### Scenario: Opening the alert
- **WHEN** the user opens a reverse-direction alert for have list "spares" made under Can swap
- **THEN** the browser is at `/trade/for-you?match=mutual&list=spares`

#### Scenario: Unlinked have list under Can swap
- **WHEN** the user has the setting on Can swap, their have list "extras" has no link, and someone who has nothing the user wants adds to a want list open to swaps a collection on "extras"
- **THEN** the user gets a reverse-direction alert for "extras", linking to `/trade/for-you?match=any&list=extras`

#### Scenario: Unlinked sale list and a buyer under Can swap
- **WHEN** the user has the setting on Can swap, their sale list "for sale", set to Sell only, has no link, and someone adds to a want list open to buying a collection on "for sale"
- **THEN** no notification is created

