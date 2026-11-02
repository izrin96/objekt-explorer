## MODIFIED Requirements

### Requirement: Deal line wording
The row's deal line SHALL read as the table in "Wording by state" gives it, which is the source of truth for the row. A running trade's state SHALL be the first that holds in the order the trade page's `stepKind` uses. A countered offer's line SHALL follow the newest offer, the counter. N is the objekts the viewer can send now; v of t is the verified objekts of all.

#### Scenario: Wording by state
- **WHEN** the row's deal is in one of these states
- **THEN** the row reads its line, and the conversation is under Needs you where marked

| State | When | Row line | Needs you |
| --- | --- | --- | --- |
| Offer to you | open, not expired, sent to the viewer | O-n · Waiting for you | yes |
| Offer from you | open, not expired, sent by the viewer | O-n · Waiting for them | no |
| Asked to cancel | the partner asked to cancel and the viewer has not answered | T-n · They asked to cancel | yes |
| You asked to cancel | the viewer asked to cancel and the partner has not answered | T-n · Waiting for them to answer | no |
| You decide | the partner sent a different copy the viewer has not answered | T-n · Different copy to decide | yes |
| Your turn | the viewer owes objekts they can send | T-n · Your turn · send N | yes |
| Their turn | the viewer owes nothing more | T-n · Waiting for them · v of t | no |
| Stuck | what the viewer still owes can't be transferred | T-n · Can't be sent · v of t | no |
| They decide | the viewer sent a different copy the partner has not answered | T-n · Waiting for them to decide | no |
| Completed, to rate | completed; the viewer can rate and has not | T-n · Completed · rate them | no |
| Failed, to rate | failed; the viewer can rate and has not | T-n · Failed · rate them | no |

#### Scenario: Offer received
- **WHEN** dalgom sends izrin96 offer O-261
- **THEN** izrin96's row for dalgom reads "O-261 · Waiting for you", and dalgom's row for izrin96 reads "O-261 · Waiting for them"

#### Scenario: Countered
- **WHEN** izrin96 counters O-261 with O-262
- **THEN** both rows follow O-262: izrin96's reads "Waiting for them", dalgom's "Waiting for you"

#### Scenario: Waiting on the partner
- **WHEN** izrin96 sent all 4 objekts of T-87 and 3 of its 6 objekts are verified
- **THEN** izrin96's row reads "T-87 · Waiting for them · 3 of 6"

#### Scenario: Different copy
- **WHEN** the partner sent #1210 in place of the #1207 izrin96 is owed, and izrin96 has not answered
- **THEN** izrin96's row reads "Different copy to decide", even if izrin96 also owes objekts

#### Scenario: Asked to cancel
- **WHEN** dalgom asked to cancel T-87, and izrin96 also owes objekts
- **THEN** izrin96's row reads "T-87 · They asked to cancel", the conversation is under Needs you, and dalgom's row reads "T-87 · Waiting for them to answer"

#### Scenario: Stuck
- **WHEN** the only objekt izrin96 still owes in T-91 reads as non-transferable, and 2 of 6 are verified
- **THEN** izrin96's row reads "T-91 · Can't be sent · 2 of 6", and the conversation is not under Needs you

#### Scenario: To rate
- **WHEN** T-84 completed yesterday and yerinnie has not rated it
- **THEN** yerinnie's row reads "T-84 · Completed · rate them"

#### Scenario: Failed, to rate
- **WHEN** T-85 failed because kaede.moon never sent, and izrin96 can still rate it
- **THEN** izrin96's row reads "T-85 · Failed · rate them"
