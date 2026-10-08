## ADDED Requirements

### Requirement: Indexer delay
The system SHALL know how far the indexer has read the chain: the time of the newest block whose transfers it has recorded. It SHALL refresh this at least every 3 minutes. The indexer is **behind** when that time is more than 5 minutes old, or when it could not be determined for more than 5 minutes.

While the indexer is behind:
- every in-progress trade page SHALL show a notice above the transfers table: transfers sent after a given time aren't seen yet, and nothing sent is lost;
- a trade SHALL NOT expire, and no stall reminder SHALL be sent, unless the indexer has read the chain past the moment the expiry or reminder was due;
- a request to cancel an in-progress trade SHALL be refused with "We can't see the latest transfers yet. Try again in a few minutes."

The notice SHALL disappear, and these rules SHALL lift, within 3 minutes of the indexer catching up. Any expiry or reminder that was held SHALL then happen as usual.

#### Scenario: Indexer stalled
- **WHEN** the indexer has recorded nothing past 14:02 and it is now 15:30
- **THEN** every in-progress trade page shows that transfers after 14:02 aren't seen yet

#### Scenario: Expiry held
- **WHEN** a trade reaches 14 days after accept while the indexer is 3 hours behind, and the giver's transfer happened 2 hours ago
- **THEN** the trade doesn't expire; once the indexer catches up, the leg verifies instead

#### Scenario: Cancel while behind
- **WHEN** a party who just received an objekt asks to cancel while the indexer is behind
- **THEN** the cancel is refused with the message, and the trade stays in progress

#### Scenario: Caught up
- **WHEN** the indexer catches up
- **THEN** within 3 minutes the notice is gone, and cancel, expiry and reminders behave as before

## MODIFIED Requirements

### Requirement: Verification progress
The trade page SHALL show the trade's progress as a stepper of four steps:
1. Proposed, with its time;
2. Accepted, with its time;
3. Transfers, with "n of m";
4. Complete, with its time once the trade completes.

A done step is marked green and the current step indigo. On a failed trade the Transfers step is marked red; on a cancelled trade the steps after the last one reached stay unmarked.

Below the stepper, a table SHALL list each leg with three columns:
- **Objekt**: the thumbnail, the name, and the serial or "any copy";
- **Direction**: from whom to whom, as "You → rin.trades";
- **Status**, one of:
  - a green Verified chip with a check, the shortened transaction hash and how long ago;
  - an amber Waiting chip with a clock, and how recent the transfers the site has seen are ("transfers seen up to 1 minute ago");
  - a red Closed chip for a leg of an ended trade that never verified.

Below `sm` each row SHALL stack, with the status beside the objekt.

The trade's status chip SHALL be indigo in progress, green when completed and red when cancelled or failed. The summary "n of m transfers verified" SHALL also appear on the accepted offer's card in chat, linking to the trade page. Progress SHALL update in open tabs without a reload.

From `lg` up, a side panel SHALL sit beside the table; below `lg` it SHALL follow it. It holds, in order:
- **Who sends first?**, tinted indigo, while the trade is in progress (see Who sends first);
- **Rating**: before completion, what a rating counts toward, with the rating controls disabled; once completed, Rate this trade with the controls live (see Feedback);
- **If it stalls**, while the trade is in progress: the 72-hour reminder and when Report a problem becomes available.

#### Scenario: One leg in
- **WHEN** the first of two legs verifies while both parties have the trade open
- **THEN** both pages show that leg as a green Verified chip, the Transfers step as "1 of 2", and "1 of 2 transfers verified" without a reload

#### Scenario: Completed
- **WHEN** the user opens a completed trade
- **THEN** all four steps are green, the status chip reads Completed in green, and the side panel shows Rate this trade with the controls live

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** the side panel follows the transfers table, each leg's row stacks, and the page doesn't scroll sideways

#### Scenario: Seen up to
- **WHEN** a leg is waiting and the indexer has read the chain up to 40 seconds ago
- **THEN** its Waiting chip reads "transfers seen up to 40 seconds ago", worded as other relative times are
