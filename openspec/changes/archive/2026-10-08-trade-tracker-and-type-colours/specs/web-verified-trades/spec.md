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
  - an amber Waiting chip with a clock, and when the transfers were last checked;
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
