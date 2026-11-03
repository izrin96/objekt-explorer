## MODIFIED Requirements

### Requirement: Trade line in the list form
The edit form of a have, want or sale list SHALL show one Trade line: the post that holds the list, with its tags, pair and option, or that the list is off Trade. A sale list's line in a post SHALL also name its Open to (Sell only or Sell or swap) and Market. It SHALL offer Edit post when the list is in a post and Post it otherwise, each opening the composer with this list picked (see `web-trade-browse`). Creating a have or want list, or a sale list bound to a profile, SHALL offer Post it, except from the composer, which picks the new list instead (see `web-trade-browse` New list form).

#### Scenario: List in a post
- **WHEN** the owner edits want list "binary hunt", which is in a Swap post with "spares" that would also pay
- **THEN** the Trade line reads "In your Swap post" with WTT and WTB, "Paired with spares · Would also pay", and Edit post

#### Scenario: Paired, off Trade
- **WHEN** the owner took that Swap post off Trade and edits "binary hunt"
- **THEN** the Trade line reads "Paired with spares · Off Trade" with Post it, which opens the composer on Swap with both lists picked

#### Scenario: Not on Trade
- **WHEN** the owner edits a want list in no post and paired with nothing
- **THEN** the Trade line reads "Not on Trade" with Post it

#### Scenario: Just created
- **WHEN** the owner creates have list "spares"
- **THEN** the dialog offers Post it, which opens the composer with "spares" picked

#### Scenario: Sale list, Sell only
- **WHEN** the owner edits sale list "store stock", alone in a Sell post and Sell only
- **THEN** the Trade line reads "In your Sell post" with WTS, "Sell only · Also on Market", and Edit post

#### Scenario: Sale list, Sell or swap with a want list
- **WHEN** the owner edits sale list "binary sale", in a Sell post with want list "binary hunt" that would also pay
- **THEN** the Trade line reads "In your Sell post" with WTS, WTT and WTB, "Sell or swap · Paired with binary hunt · Would also pay · Also on Market", and Edit post, which opens the composer on Sell with both lists picked

#### Scenario: Sale pair off Trade
- **WHEN** the owner took that Sell post off Trade and edits "binary sale"
- **THEN** the Trade line reads "Paired with binary hunt · Off Trade", says posting it again brings back the same Sell post, and offers Post it, which opens the composer on Sell with both lists picked and "Also open to swaps" ticked

#### Scenario: Sale list never posted
- **WHEN** the owner edits a bound sale list in no post and paired with nothing
- **THEN** the Trade line reads "Not on Trade", says posting it shows it on Market, in Browse and in others' matches, and offers Post it, which opens the composer on Sell with the list picked

#### Scenario: Sale list just created
- **WHEN** the owner creates sale list "binary sale" bound to a Cosmo profile
- **THEN** the dialog offers Post it, which opens the composer on Sell with "binary sale" picked

#### Scenario: Unbound sale list just created
- **WHEN** the owner creates a sale list not bound to a Cosmo profile
- **THEN** the dialog closes without offering Post it

#### Scenario: Want list in a Sell post
- **WHEN** the owner edits want list "binary hunt", in a Sell post with sale list "binary sale", open to swaps, that would also pay
- **THEN** the Trade line reads "In your Sell post" with WTS, WTT and WTB, and "Paired with binary sale · Would also pay", naming neither Open to nor Market

#### Scenario: Want list paired with a sale list, off Trade
- **WHEN** the owner took that Sell post off Trade and edits "binary hunt"
- **THEN** the Trade line reads "Paired with binary sale · Off Trade", says posting it again brings back the same Sell post, and offers Post it, which opens the composer on Sell with both lists picked

#### Scenario: Created from the composer
- **WHEN** the owner creates have list "spares" through New have list… in the composer
- **THEN** the dialog closes without offering Post it, and "spares" is picked in the composer

