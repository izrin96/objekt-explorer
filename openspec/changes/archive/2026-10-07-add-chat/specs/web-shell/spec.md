## ADDED Requirements

### Requirement: Messages icon in the frame
When a session exists, the frame SHALL show a Messages icon with its unread badge (see `web-chat`) beside the notification bell. Below the `md` breakpoint, it SHALL sit in the top bar beside the bell, outside the navigation sheet.

#### Scenario: Mobile
- **WHEN** a signed-in user loads any page at 390 px
- **THEN** the Messages icon is visible in the top bar and opens `/messages` without opening the sheet

#### Scenario: Signed out
- **WHEN** a visitor without a session loads any page
- **THEN** no Messages icon is shown
