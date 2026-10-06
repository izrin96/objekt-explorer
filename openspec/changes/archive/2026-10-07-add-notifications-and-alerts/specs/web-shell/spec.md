## ADDED Requirements

### Requirement: Notification bell in the frame
When a session exists, the frame SHALL show the notification bell (see `web-notifications`) next to the account area on desktop. Below the `md` breakpoint, it SHALL show the bell in the top bar, outside the navigation sheet, so it is reachable without opening the sheet.

#### Scenario: Mobile
- **WHEN** a signed-in user loads any page at 390 px
- **THEN** the bell is visible in the top bar and opens the notification popover without opening the sheet
