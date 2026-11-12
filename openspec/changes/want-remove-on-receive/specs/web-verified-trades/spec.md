# Spec Delta

## ADDED Requirements

### Requirement: Received objekts leave want lists
When a trade leg is verified, by its transfer, by the receiver marking it received, or by an accepted different copy, the leg's collection SHALL be removed from each of the receiver's want lists whose Remove objekts I get in a trade switch is on, where the entry was added by hand. It SHALL happen with the verification, whether or not the trade then completes. Entries on lists with the switch off, and entries a rule added, SHALL stay.

#### Scenario: Transfer verified
- **WHEN** the user's want list "binary hunt" has the switch on and holds Kim Lip 201A, and a leg sending the user Kim Lip 201A is verified
- **THEN** Kim Lip 201A is no longer on "binary hunt", and the partner no longer sees it as something the user wants

#### Scenario: Marked as received
- **WHEN** the user marks that leg as received
- **THEN** Kim Lip 201A leaves "binary hunt" as it does on a verified transfer

#### Scenario: Two want lists
- **WHEN** Kim Lip 201A is on "binary hunt" (switch on) and on "keepers" (switch off), and the leg is verified
- **THEN** it leaves "binary hunt" and stays on "keepers"

#### Scenario: Wanted through a rule
- **WHEN** "binary hunt" wants Kim Lip 201A only through a rule, and the leg is verified
- **THEN** no entry is removed by the trade, and the rule decides as it does today

#### Scenario: Added back after the trade
- **WHEN** Kim Lip 201A left "binary hunt" when its leg was verified, the user adds it to "binary hunt" again, and another leg of the same trade is then verified
- **THEN** Kim Lip 201A stays on "binary hunt"

#### Scenario: Switch turned on later
- **WHEN** the user received Kim Lip 201A while the switch on "keepers" was off, turns the switch on, and another leg of the same trade is then verified
- **THEN** Kim Lip 201A stays on "keepers"

#### Scenario: A copy accepted at expiry
- **WHEN** the trade expires unfinished and a different copy of Kim Lip 201A waiting on the user's leg is accepted automatically
- **THEN** Kim Lip 201A leaves "binary hunt", though the trade did not complete

#### Scenario: The trade does not complete
- **WHEN** the leg to the user is verified and the user's own leg is never sent, so the trade ends as failed
- **THEN** Kim Lip 201A stays off "binary hunt"

### Requirement: Still on a want list
On the trade page, You get SHALL list each collection the viewer received in a verified leg that was, before the leg verified, and still is a hand-added entry on one of their want lists with the switch off: a line naming the objekt and the list, with Remove and Always remove from this list. Remove SHALL take that entry off. Always remove from this list SHALL take off every collection the page lists for that list and turn its switch on. The partner SHALL never see the line.

#### Scenario: Offered after the trade
- **WHEN** the user received HaSeul 302Z in a verified leg, and it is on their want list "keepers", whose switch is off
- **THEN** You get says HaSeul 302Z is still on their want list "keepers" and offers Remove and Always remove from this list

#### Scenario: Remove
- **WHEN** the user activates Remove on that line
- **THEN** HaSeul 302Z leaves "keepers", the line goes, and the switch on "keepers" stays off

#### Scenario: Always remove
- **WHEN** the user activates Always remove from this list
- **THEN** HaSeul 302Z leaves "keepers" and the switch on "keepers" is on

#### Scenario: Always remove with two lines
- **WHEN** the user received HaSeul 302Z and HeeJin 301Z, both still on "keepers", and activates Always remove from this list on either line
- **THEN** both leave "keepers", both lines go, and the switch on "keepers" is on

#### Scenario: Added after the trade
- **WHEN** the user adds HaSeul 302Z to "keepers" a week after its leg was verified
- **THEN** the trade page shows no line for it

#### Scenario: Not yet verified
- **WHEN** the leg sending the user HaSeul 302Z is still waiting
- **THEN** You get shows no such line

#### Scenario: The partner's view
- **WHEN** the partner opens the same trade
- **THEN** their You give shows no such line
