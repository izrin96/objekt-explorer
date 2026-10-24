## MODIFIED Requirements

### Requirement: Sale list pairs
Only a sale list open to swaps SHALL be linkable to a want list; the pair is one post (see `web-trade-browse`), and its want side SHALL be open to swaps: Swaps only, or Swaps or buying when the seller would also pay. The server SHALL refuse linking a want list to a sale list set to Sell only, and setting a linked sale list to Sell only.

#### Scenario: Pair with a want list
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps only

#### Scenario: Pair that would also pay
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps, and ticks "also pay"
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps or buying

#### Scenario: Link to a Sell only list
- **WHEN** a request links want list "binary hunt" to sale list "store stock", set to Sell only
- **THEN** it is refused

#### Scenario: Sell only while linked
- **WHEN** a request sets linked sale list "binary sale" to Sell only
- **THEN** it is refused

