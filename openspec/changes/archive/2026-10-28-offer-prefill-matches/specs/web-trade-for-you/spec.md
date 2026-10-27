## MODIFIED Requirements

### Requirement: Make offer to a partner
Make offer on a person's row, on Browse or For you, SHALL follow `web-trade-browse` Make offer on a post: it opens the offer builder addressed to the person and the row's lead post, with the matches the row counts, swaps and sales alike, already added (see `web-trade-offers` Matches added when the builder opens).

#### Scenario: Prefilled overlap
- **WHEN** a user activates Make offer on rin.trades's row on For you, which reads "They have 5 you want · You have 3 they want": rin.trades has 3 the user wants on have list "doubles" and 2 on sale list "spares", open to swaps, and the user has 3 on rin.trades's want list "wants"
- **THEN** the builder opens addressed to rin.trades and "doubles", with the user's 3 under You give, rin.trades's 5 under You get, and the line "Added 3 you give and 5 you get from your matches"

#### Scenario: Can swap under Compare with
- **WHEN** For you shows Can swap with Compare with set to the user's have list "doubles", and the user activates Make offer on kaede.k's row
- **THEN** You give holds only the matches from "doubles", as the row counted them
