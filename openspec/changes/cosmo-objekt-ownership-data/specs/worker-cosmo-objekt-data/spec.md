# Spec Delta

## Purpose

Recording what Cosmo shows a connected account about each objekt it holds (serial, transferability, non-transferable reason, grid use), correcting the site's transferability from it under rules that let newer chain data win, and keeping every fact it records about each token for good.

## ADDED Requirements

### Requirement: Per-objekt data comes from the pages the sync already reads
The site SHALL take per-objekt data only from the collection pages the collection-media sync already requests. Recording it SHALL NOT add any request to Cosmo, change the sync's request limits, or change which sessions are synced or when.

#### Scenario: Same request count
- **WHEN** rin.t holds 180 collections and is synced before and after this change
- **THEN** the sync sends Cosmo the same number of requests both times

#### Scenario: A malformed objekt
- **WHEN** one objekt entry on a page lacks its token id
- **THEN** that entry is skipped and counted, and the rest of the page's objekts and every collection's media are still recorded

### Requirement: What is recorded per objekt
For each objekt read, the site SHALL record, by token id: its collection, Cosmo's serial, whether Cosmo lets it be sent, Cosmo's non-transferable reason, whether it was used for a grid, when it was read, and when the chain last saw the token received as of the read. It SHALL NOT record which user, session, nickname or address the read came from, nor Cosmo's minted, acquired or updated dates.

#### Scenario: A challenge reward
- **WHEN** rin.t's page lists token 41200001 as serial 12, not transferable for `challenge-reward`, used for a grid
- **THEN** the record for 41200001 holds serial 12, not transferable, `challenge-reward`, used for a grid and the read time, and nothing naming rin.t or its owner

### Requirement: Only the connected account's own objekts are recorded
An objekt entry SHALL be recorded only when Cosmo names the connected account's own address as its holder and its status is minted. Any other entry SHALL be skipped and counted.

#### Scenario: Another holder
- **WHEN** a page lists an objekt whose holder is not rin.t's address
- **THEN** no record is written for it

### Requirement: Cosmo's transferability corrects the site's
When enabled for that direction, a recorded transferability that differs from the site's SHALL replace it, but only when the chain confirmed the read's holder when the read was recorded and the objekt has not been received since, no on-chain transferability change is newer than the read or still unapplied, its holder is not Cosmo's spin address, and the site's value is still the one compared.

#### Scenario: A challenge reward shown as transferable
- **WHEN** untransferable corrections are enabled and a read shows token 41200001 not transferable while the site shows it transferable, and it has not moved since
- **THEN** within 5 minutes the site shows 41200001 as not transferable everywhere it shows transferability

#### Scenario: The objekt moved after the read
- **WHEN** token 41200001 was received by another holder after the read
- **THEN** the site's transferability is left as it is

#### Scenario: The chain did not know the token at the read
- **WHEN** a read shows token 41200001 not transferable while the site had not indexed 41200001 yet
- **THEN** that read changes nothing, even after the site indexes the token

#### Scenario: A newer chain change wins
- **WHEN** an on-chain transferability change for token 41200001 was indexed after the read was taken
- **THEN** the site keeps the chain's value until a later read is judged, either because it differs or at the weekly re-judgement

#### Scenario: Cosmo's spin address
- **WHEN** a read differs from the site for an objekt held by Cosmo's spin address
- **THEN** the site's value is left as it is

### Requirement: Only trusted reasons make an objekt untransferable
A correction to not transferable SHALL be made only when Cosmo's non-transferable reason is `challenge-reward`, `welcome-objekt`, or a reason the operator added to the trusted list. Any other reason, or none, SHALL be counted as one the site would make untransferable and SHALL NOT change the site.

#### Scenario: An untrusted reason
- **WHEN** untransferable corrections are enabled and a read shows token 41200001 not transferable for a reason other than `challenge-reward` or `welcome-objekt`, or for none
- **THEN** the site's transferability is left as it is and the read is counted as one the site would make untransferable

### Requirement: Too many corrections at once stop the run
Before writing any correction in a run, the site SHALL count the corrections the run plans. When they exceed 200, or exceed 20% of the reads the run judged and 50, the run SHALL write none of them, SHALL leave them to be judged again, and SHALL report the counts to the operator.

#### Scenario: A burst of disagreements
- **WHEN** untransferable corrections are enabled and one run judges 1,000 reads of which 300 differ from the site
- **THEN** no transferability changes in that run, and the operator is told 300 corrections were planned over 1,000 reads

#### Scenario: A few corrections
- **WHEN** a run judges 40 reads of which 3 differ from the site with their direction enabled
- **THEN** the 3 corrections are written

### Requirement: Each direction of correction is switched on separately
Corrections that make an objekt untransferable and corrections that make one transferable SHALL each be off until the operator enables that direction. While a direction is off, the site SHALL still count the objekts it would change in that direction, by non-transferable reason.

#### Scenario: Default
- **WHEN** the worker starts with no correction enabled and a read differs from the site
- **THEN** no transferability changes, and the difference is counted as one the site would make untransferable or transferable

#### Scenario: Only untransferable corrections enabled
- **WHEN** untransferable corrections are enabled, transferable ones are not, and a read shows transferable an objekt the site shows not transferable
- **THEN** the site keeps it not transferable and counts it as one it would make transferable

### Requirement: Cosmo-confirmed transferability is kept for good
When a read passes every guard and its value is written to the site or already matches it, the site SHALL keep that value per token as Cosmo-confirmed, with when it was read and the chain height it was judged against, with no expiry. A later read that passes the guards and whose value is written or matches SHALL replace it, the newest read winning. A read that is not applied SHALL leave it as it is.

#### Scenario: A later read disagrees
- **WHEN** token 41200001 is confirmed not transferable, transferable corrections are enabled, and a newer read shows it transferable and passes every guard
- **THEN** the site shows 41200001 as transferable and the confirmed value becomes transferable

#### Scenario: A later read with its direction off
- **WHEN** token 41200001 is confirmed not transferable and a newer read shows it transferable while transferable corrections are off
- **THEN** the confirmed value stays not transferable and the read is counted as one the site would make transferable

### Requirement: The chain check never reverts a Cosmo-confirmed value
The chain check script SHALL NOT change an objekt's transferability away from its Cosmo-confirmed value, whatever its age and whether or not the objekt moved since, unless an on-chain transferability change at a block above the height that value was judged against exists. In that case the chain's value SHALL be applied and the confirmed value marked superseded. After an indexer rebuild, the stored reads SHALL be able to apply their corrections again under the same rules.

#### Scenario: Chain check after a correction
- **WHEN** token 41200001 was made not transferable from a Cosmo read and the operator applies the chain check script, which reads it transferable on chain
- **THEN** the script leaves 41200001 not transferable and counts it as held by Cosmo

#### Scenario: A newer on-chain change
- **WHEN** token 41200001 is confirmed not transferable and an on-chain change above that confirmation's chain height makes it transferable
- **THEN** the script sets it transferable and marks the confirmed value superseded

### Requirement: Facts about tokens outlive accounts and sessions
Every per-objekt record (serial, transferability, grid use, non-transferable reason), every Cosmo-confirmed transferable value, and the serials and corrections written from them SHALL be kept with no expiry. Disconnecting, a session ending, the deletion of dead session rows, a ban, and an account anonymize or delete SHALL NOT delete or undo any of them.

#### Scenario: A disconnected account
- **WHEN** rin.trades disconnects rin.t after its reads confirmed token 41200001 not transferable and token 51000250 as serial 251
- **THEN** 41200001 stays not transferable, its confirmed value, serial, grid use and `challenge-reward` reason stay recorded, and 51000250 = 251 still anchors its batch

#### Scenario: An anonymized account
- **WHEN** rin.trades' account is anonymized
- **THEN** every per-objekt record, confirmed value, confirmed serial and correction made from rin.t's reads stays as it was

### Requirement: Grid use and non-transferable reasons are kept, not shown
Grid use and the non-transferable reason SHALL be stored per token and SHALL NOT appear on any page or API response in this change.

#### Scenario: A challenge reward in the drawer
- **WHEN** a visitor opens the drawer of token 41200001, recorded as used for a grid and not transferable for `challenge-reward`
- **THEN** the drawer and the serial's public read show what they showed before this change, with neither detail

### Requirement: Never Objekt Tracker's own lock data
This feature SHALL NOT read or write Objekt Tracker's own lock data, and its stored values, switches and shown text SHALL use Cosmo's terms (transferable, non-transferable reason).

#### Scenario: A non-transferable objekt
- **WHEN** a read shows token 41200001 not transferable and it is corrected
- **THEN** Objekt Tracker's own lock data for 41200001 is unchanged

### Requirement: Operator previews every write
An operator SHALL be able to run a read-only report that shows, for the current records, the serials confirmed serials would move per collection with the conflicts they raise, the transferability corrections by direction, non-transferable reason and class, and the confirmed values with and without a newer on-chain change. It SHALL refuse to run on a connection that can write.

#### Scenario: Preview before enabling
- **WHEN** the operator runs the report on a read-only connection
- **THEN** it prints per collection the serials confirmed serials would move and the corrections per direction, and writes nothing
