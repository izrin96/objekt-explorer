## MODIFIED Requirements

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
- **WHEN** rin.trades has 1 unfinished trade, deletes the account, and 7 days later links the same Cosmo wallet to a new account
- **THEN** the new account's line reads "No verified trades · 1 unfinished"

#### Scenario: Good history stays behind
- **WHEN** an account with 31 completed trades unlinks a wallet, and another account links it once the 7-day wait is over
- **THEN** the other account's verified count doesn't change

#### Scenario: Stuck objekt
- **WHEN** a trade fails while the objekt rin.trades still owed was stuck, and the other party had delivered
- **THEN** rin.trades's unfinished count goes up by one, as for any trade they didn't deliver

#### Scenario: Both still owed
- **WHEN** a trade fails while both parties still owed at least one transfer
- **THEN** neither party's unfinished count changes

#### Scenario: Staff move
- **WHEN** an admin moves the wallet rin.trades failed to deliver from in T-1042 from rin.trades to rin.trades2
- **THEN** rin.trades2's line counts T-1042 as unfinished and none of rin.trades's verified trades, and rin.trades's line still counts T-1042
