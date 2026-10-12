## MODIFIED Requirements

### Requirement: Find matches shortcut
On their own want list, or their own have or sale list bound to a Cosmo profile, the owner SHALL see a Find matches control in the list header. Once it is known, and only for a list that compares both ways, the control SHALL show the number of mutual people for that list: the number the Mutual option reads (Mutual N) when the link opens, so people whose posts are all idle are left out of both and the two numbers never disagree. A list that opens on Any SHALL show no number. Activating it SHALL open Browse with Compare with naming that list:
- `/trade?match=mutual&list=<slug>` when the list compares both ways, because its linked list also takes part in Trade;
- `/trade?match=any&list=<slug>` otherwise.

Other visitors SHALL not see the control.

#### Scenario: Owner opens matches
- **WHEN** the owner of have list "spares", linked to want list "binary hunt", activates Find matches
- **THEN** the browser is at `/trade?match=mutual&list=spares`, with Matches on Mutual and Compare with naming "spares"

#### Scenario: Owner opens matches for a lone list
- **WHEN** the owner of sale list "duplicates" activates Find matches
- **THEN** the browser is at `/trade?match=any&list=duplicates`, with Matches on Any and Compare with naming "duplicates"

#### Scenario: Visitor
- **WHEN** a signed-in user opens someone else's have list
- **THEN** no Find matches control is shown

#### Scenario: Count agrees with Mutual
- **WHEN** have list "spares" has 3 mutual people, one of whom has only idle posts, and the owner views its header
- **THEN** Find matches reads 2, and the link opens on Mutual reading "Mutual 2"

#### Scenario: Lone list has no count
- **WHEN** the owner views sale list "duplicates"
- **THEN** Find matches shows no number

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set when it is created or edited and shown only for want lists, whether or not it is linked to a have list:
- **Swaps only**, the default for a new want list: it matches entries on have lists only;
- **Swaps or buying**: it matches entries on have lists and on sale lists.

Have, sale and general lists carry no choice. A have list's entry SHALL count against every want list. A sale list's entry SHALL count against a want list only when that want list is open to swaps or buying. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Browse match counts, in both directions, and the person sheet;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

A request to create a want list that leaves the choice out SHALL save Swaps only. An update that leaves it out SHALL keep the list's current choice. A want list made before Swaps only became the default keeps the choice it had, Swaps or buying.

#### Scenario: New want list
- **WHEN** a user creates a want list without touching Open to
- **THEN** Swaps only is selected and saved

#### Scenario: Trades only skips a sale list
- **WHEN** the user's want list is open to swaps only, and a partner's sale list holds a collection on it
- **THEN** that collection does not count toward the partner on Browse, and no want-list alert is sent for it

#### Scenario: Trades and sales
- **WHEN** the user switches the same want list to Swaps or buying
- **THEN** the partner's sale entry counts toward them on the next load

#### Scenario: The other direction
- **WHEN** a partner's want list is open to swaps only and the user's sale list holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: Pairing does not change matching
- **WHEN** the user links their have list "spares" to their want list "binary hunt", which is open to swaps only
- **THEN** "binary hunt" matches the same have lists as before and still no sale lists, and "spares" matches the same want lists as before, whether those are open to swaps only or Swaps or buying

#### Scenario: Older want list
- **WHEN** a user opens the edit dialog of a want list made before this default
- **THEN** Swaps or buying is selected, and saving without touching it keeps it

#### Scenario: Not a want list
- **WHEN** a user creates a have list
- **THEN** the form shows no Open to choice
