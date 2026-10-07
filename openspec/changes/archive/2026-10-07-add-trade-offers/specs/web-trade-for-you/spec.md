## ADDED Requirements

### Requirement: Propose this trade
Each partner row that shows Message SHALL also offer Propose this trade. It opens the offer builder addressed to the partner, prefilled with the overlap:
- **You give**: objekts on the user's have lists that the partner wants and the user still owns;
- **You get**: the partner's have entries that the user wants.

Objekts that can't be offered SHALL be left out of the prefill.

#### Scenario: Prefilled overlap
- **WHEN** a user activates Propose this trade on rin.trades's mutual row, where rin.trades has 4 objekts the user wants and the user has 2 that rin.trades wants
- **THEN** the builder opens with those 2 under You give and those 4 under You get
