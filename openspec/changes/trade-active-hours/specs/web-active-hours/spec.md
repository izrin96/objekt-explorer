## Purpose

Lets a trader say when they are usually around, and shows other people whether they are active now or when they will be, in each viewer's own time, on Trade and in chat.

## ADDED Requirements

### Requirement: Active hours setting
The Trade section of the account page (`/account/trade`) SHALL hold an Active hours setting with:
- a switch, off for every account until its owner turns it on;
- a timezone, from the IANA timezone list. With nothing saved, it SHALL default to the browser's timezone, labelled as detected;
- "Usually active": one or two ranges, each a start and an end time in 30-minute steps. A range whose end is earlier than its start SHALL run past midnight into the next day. A range SHALL not start and end at the same time, and two ranges SHALL not overlap;
- "Weekends differ": a switch that, when on, adds a second set of one or two ranges used on Saturday and Sunday in the chosen timezone.

A range that runs past midnight SHALL belong to the day it starts, so Friday's 20:00–01:00 covers Saturday 00:30 even when weekends differ.

Each change SHALL save at once, and an invalid change (an empty or overlapping range, an unknown timezone) SHALL be refused with the reason shown and not saved. Turning the switch off SHALL keep the timezone and ranges for when it's turned back on. Ranges SHALL be stored against the timezone, so a daylight-saving change in that timezone keeps the same local hours.

#### Scenario: First visit
- **WHEN** a user in Kuala Lumpur who never set Active hours opens `/account/trade`
- **THEN** the switch is off and the timezone shows Asia/Kuala_Lumpur, labelled as detected

#### Scenario: Two ranges
- **WHEN** the user turns Active hours on and sets 12:00–14:00 and 20:00–01:00
- **THEN** both ranges save at once and are shown again on reload

#### Scenario: Overlap refused
- **WHEN** the user sets 12:00–15:00 and 14:00–18:00
- **THEN** the second range is refused with a message that ranges can't overlap, and the saved ranges are unchanged

#### Scenario: Weekend ranges
- **WHEN** the user turns Weekends differ on and sets 10:00–23:00
- **THEN** Saturday and Sunday in the user's timezone use 10:00–23:00, and weekdays keep their own ranges

#### Scenario: Off keeps the hours
- **WHEN** the user turns Active hours off and on again
- **THEN** the timezone and ranges are as they were

### Requirement: Privacy of active hours
Another person SHALL never receive an account's timezone name or its ranges as written. They SHALL receive only the account's active periods as absolute times, covering at least the 24 hours before and the 7 days after the request, so they can be shown in the viewer's own time. An account with Active hours off SHALL send nothing, and SHALL show no active mark anywhere. Only the owner SHALL read their own timezone and ranges.

#### Scenario: Network response
- **WHEN** a viewer loads `/trade` with a post by an owner whose Active hours are on in Asia/Kuala_Lumpur
- **THEN** the post's data holds the owner's active periods as absolute times, and no timezone name

#### Scenario: Off
- **WHEN** an owner has Active hours off
- **THEN** their posts, For you rows and chat header show no active mark, and their data holds no active periods

### Requirement: Active mark
Where an account with Active hours on is named on Browse posts, For you rows and the chat thread header, its byline SHALL carry an active mark:
- "Active now", with a dot in the success colour, while the current time is inside one of its periods;
- otherwise "Active in" and the time until the next period starts, rounded: minutes under an hour, hours under a day, days beyond.

The mark SHALL be rendered by the browser from the viewer's clock and timezone, update at least every minute while shown, and render nothing until hydration. It SHALL be a button whose accessible name says the whole mark.

Activating it SHALL open a popover that says when the account is usually active today in the viewer's time ("usually active 19:00–21:00 and 23:00–02:00 your time"), with a 24-hour bar of the viewer's day, the account's periods marked on it, and a mark for now. The bar SHALL be decorative, with the sentence carrying the meaning. Times SHALL be in monospace and use the viewer's locale's hour format.

#### Scenario: Inside a range
- **WHEN** kimlynn is active 20:00–01:00 in Asia/Kuala_Lumpur, and a viewer in London opens `/trade` at 13:10 London time, during British Summer Time
- **THEN** kimlynn's post shows "Active now" with a green dot

#### Scenario: Outside a range
- **WHEN** jiwoo.cosmo is next active at 19:00 in the viewer's time, and the viewer's clock reads 13:10
- **THEN** jiwoo.cosmo's post shows "Active in 6 h", and after the clock passes 19:00 it shows "Active now" without a reload

#### Scenario: Popover in the viewer's time
- **WHEN** the viewer activates jiwoo.cosmo's mark
- **THEN** the popover reads that jiwoo.cosmo is usually active 19:00–21:00 and 23:00–02:00 the viewer's time, with both periods on the 24-hour bar and a line at 13:10

#### Scenario: Chat header
- **WHEN** the viewer opens a conversation with jiwoo.cosmo
- **THEN** the header shows jiwoo.cosmo's active mark under their reputation line

#### Scenario: For you row
- **WHEN** the viewer opens For you and hyerinbot's Active hours are on and current
- **THEN** hyerinbot's row byline shows "Active now"

### Requirement: Active now on Browse
Browse SHALL offer an Active now switch beside Only matches, off by default and kept in the URL (`active=1`). On, the feed SHALL keep only posts whose owner has Active hours on and is inside one of their periods at the time of the request. The server SHALL leave the other posts out, so pages stay full, as Only matches does. With Active now on and no post left, the feed SHALL say that nobody is active right now and offer to turn Active now off. The switch SHALL be shown to every visitor, signed in or not. A value of `active` that does not parse SHALL be ignored.

#### Scenario: Only active owners
- **WHEN** the viewer turns Active now on, while kimlynn is inside a range, jiwoo.cosmo is outside, and moonseller has Active hours off
- **THEN** the URL carries `active=1` and only kimlynn's posts are listed

#### Scenario: Combined
- **WHEN** Active now and Only matches are both on
- **THEN** only posts that match the viewer and whose owner is active now are listed

#### Scenario: Nobody active
- **WHEN** Active now is on and no post's owner is active
- **THEN** the feed says nobody is active right now, with a control that turns Active now off
