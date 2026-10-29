# Spec Delta

## MODIFIED Requirements

### Requirement: Indexer delay
The system SHALL know how far the indexer has read the chain: the time of the newest block whose transfers it has recorded, or, when a transfer is held waiting for its objekt's metadata, the time just before the oldest held transfer, whichever is earlier. It SHALL refresh this at least every 3 minutes. The indexer is **behind** when that time is more than 5 minutes old, or when it could not be determined for more than 5 minutes.

While the indexer is behind:
- every in-progress trade page SHALL show a notice once, as a neutral strip above the status card: transfers sent after a given time aren't seen yet, and nothing sent is lost;
- a trade SHALL NOT expire, and no stall reminder SHALL be sent, unless the indexer has read the chain past the moment the expiry or reminder was due;
- a request to cancel an in-progress trade SHALL be refused with "We can't see the latest transfers yet. Try again in a few minutes."

The notice SHALL disappear, and these rules SHALL lift, within 3 minutes of the indexer catching up. Any expiry or reminder that was held SHALL then happen as usual.

#### Scenario: Indexer stalled
- **WHEN** the indexer has recorded nothing past 14:02 and it is now 15:30
- **THEN** every in-progress trade page shows, above the status card, that transfers after 14:02 aren't seen yet

#### Scenario: Notice not repeated
- **WHEN** the indexer is behind and the trade is past its expiry
- **THEN** the strip is the only place that explains the delay; the deadline and the Timeline say only that the end is paused

#### Scenario: Expiry held
- **WHEN** a trade reaches 14 days after accept while the indexer is 3 hours behind, and the giver's transfer happened 2 hours ago
- **THEN** the trade doesn't expire; once the indexer catches up, the leg verifies instead

#### Scenario: Cancel while behind
- **WHEN** a party who just received an objekt asks to cancel while the indexer is behind
- **THEN** the cancel is refused with the message, and the trade stays in progress

#### Scenario: Caught up
- **WHEN** the indexer catches up
- **THEN** within 3 minutes the notice is gone, and cancel, expiry and reminders behave as before

#### Scenario: Held transfer holds the expiry
- **WHEN** the indexer has read the chain to 15:30, a giver's send of a fresh mint at 14:10 is held because Cosmo's metadata is down, and the trade's expiry falls at 14:30
- **THEN** the indexer counts as read only to just before 14:10, the trade doesn't expire, and once the send is replayed the leg verifies instead
