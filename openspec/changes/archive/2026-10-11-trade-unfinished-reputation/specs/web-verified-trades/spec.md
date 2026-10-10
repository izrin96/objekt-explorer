## ADDED Requirements

### Requirement: Objekts that can no longer be transferred
Within 3 minutes of the indexer recording that a specific objekt became non-transferable:
- **Open offer:** an open offer naming it on either side SHALL be Cancelled with the reason "an objekt can no longer be transferred", and both parties notified.
- **In-progress trade, nothing sent yet:** a trade giving it in a leg that hasn't verified, with no leg verified yet, SHALL be Cancelled with the same reason. Both parties SHALL be notified, and every reservation of the trade SHALL be released.
- **In-progress trade, something already sent:** both parties SHALL be notified once that the objekt can't be sent right now. The trade SHALL stay in progress. While the objekt stays non-transferable, its leg is **stuck**, and the trade page SHALL say so under that leg. A stuck leg is still owed: if the trade fails, it counts toward its giver's unfinished trades, since the owner can make an objekt non-transferable themselves by gridding it.

If the objekt becomes transferable again, its leg SHALL stop being stuck.

#### Scenario: Before anything was sent
- **WHEN** an objekt the user gives in T-1042 becomes non-transferable, and no leg has verified
- **THEN** T-1042 shows Cancelled with "an objekt can no longer be transferred", and both parties are notified

#### Scenario: After the other side sent
- **WHEN** binary.bin's leg verified, and then the objekt the user still owes becomes non-transferable
- **THEN** both parties are notified, the trade stays in progress, and the user's leg shows that it's stuck

#### Scenario: Open offer
- **WHEN** an objekt named in open offer O-882 becomes non-transferable
- **THEN** O-882 shows Cancelled with the reason, and both parties are notified

## MODIFIED Requirements

### Requirement: Feedback
After a trade completes, each party SHALL be able to rate the other Positive, Neutral or Negative, and change that rating for 14 days after completion.

After a trade fails, only a party who **delivered** SHALL be able to rate the other, on the same terms, for 14 days after it ended. A party delivered when every leg they gave verified while the other party still owed at least one transfer. The other party SHALL NOT be able to rate that trade.

Trades in progress and cancelled trades SHALL NOT accept feedback. Single ratings SHALL never be shown to anyone but their author; they count only toward totals.

#### Scenario: Rate a completed trade
- **WHEN** the user rates binary.bin Positive on completed T-1042
- **THEN** the page shows the user's rating, and binary.bin's positive share includes it

#### Scenario: Not completed
- **WHEN** a request rates a trade that is still in progress
- **THEN** it is refused

#### Scenario: Rate the party who never sent
- **WHEN** the user's leg of T-1042 verified, and the trade failed because binary.bin never sent theirs
- **THEN** the user's trade page offers the rating controls, and rating binary.bin Negative counts toward binary.bin's positive share

#### Scenario: The party who didn't deliver
- **WHEN** binary.bin opens that failed trade, or sends a request to rate it
- **THEN** no rating controls show, and the request is refused

### Requirement: Reputation
An account's reputation SHALL be:
- its count of completed trades, as this account;
- its count of **unfinished** trades: failed trades where it still owed at least one transfer while the other party had delivered everything they owed. An objekt that was stuck (see Objekts that can no longer be transferred) still counts as owed. The count also includes such trades where the side at fault was another account, if any address that side had linked when the trade was accepted is linked to this account now. Each trade counts at most once;
- its share of positive ratings among positive and negative ones (neutral ratings don't count), shown once it has at least one;
- the month the account was created.

It SHALL show as one line, for example "31 verified · 2 unfinished · 100% · since Mar 2025". The unfinished count SHALL show only when it is above 0, and SHALL explain itself to screen readers and on hover as failed trades where the account didn't send its part. An account with no completed trades reads "No verified trades yet", or for example "No verified trades · 1 unfinished" when it has unfinished ones. The line SHALL reflect a newly failed trade within 10 minutes. It SHALL show only where the account is already named.

#### Scenario: New trader
- **WHEN** a viewer sees a post by an account with no completed or unfinished trades
- **THEN** its line reads "No verified trades yet"

#### Scenario: Took and never sent
- **WHEN** rin.trades has 31 completed trades and 2 failed ones where they received and never sent back
- **THEN** their line reads "31 verified · 2 unfinished · …", with the positive share and month

#### Scenario: Same wallet, new account
- **WHEN** rin.trades has 1 unfinished trade, deletes the account, and links the same Cosmo wallet to a new account
- **THEN** the new account's line reads "No verified trades · 1 unfinished"

#### Scenario: Good history stays behind
- **WHEN** an account with 31 completed trades unlinks a wallet, and another account links it
- **THEN** the other account's verified count doesn't change

#### Scenario: Stuck objekt
- **WHEN** a trade fails while the objekt rin.trades still owed was stuck, and the other party had delivered
- **THEN** rin.trades's unfinished count goes up by one, as for any trade they didn't deliver

#### Scenario: Both still owed
- **WHEN** a trade fails while both parties still owed at least one transfer
- **THEN** neither party's unfinished count changes

### Requirement: Who sends first
The trade page SHALL suggest which party sends first, the same way to both. When only one party gives objekts (a cash buy or sale), that party is suggested. Otherwise:
- the party with more unfinished trades sends first;
- on a tie, the party with fewer verified trades sends first;
- on a tie, the newer account sends first.

It SHALL say when the suggested party has already sent ("You did, so it's their turn"). The suggestion SHALL NOT block either party.

#### Scenario: Newer trader
- **WHEN** binary.bin has 31 verified trades and the user has 2, and neither has unfinished trades
- **THEN** both see "We suggested you send first"

#### Scenario: Unfinished outweighs verified
- **WHEN** binary.bin has 31 verified trades and 1 unfinished, and the user has 2 verified and none unfinished
- **THEN** both see that binary.bin was suggested to send first
