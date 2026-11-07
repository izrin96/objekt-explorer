# Spec Delta

## MODIFIED Requirements

### Requirement: Thread view
`/messages/$id` SHALL show the conversation with:
- the other account and a link to their profile;
- the messages;
- a message box with Attach objekt.

Attach objekt SHALL open a drawer from the bottom of the screen, sized like New post's Add objekts, that lets the user pick an objekt from their own collection or a collection from their lists. It SHALL offer the offer pickers' filters and one control for where the objekts come from: the user's linked Cosmo profiles under "My objekts", then their lists under "My lists", each list after its list type badge. The control SHALL show its current choice as "Profile · <name>" or "List · <name>", SHALL be there with a single linked profile, and SHALL stay in view below `sm` when the filters fold behind their Filters button. Switching source SHALL keep the filters. Picking a card SHALL attach it and close the drawer. With no linked profile and no list, the drawer SHALL offer to link a Cosmo profile. On viewports below `md`, the list and the thread SHALL be separate screens with a back control; the back control SHALL also be there while the thread loads and when it fails to load. The back control of a thread opened by a Message button SHALL return to the page Message was used on, and SHALL be named "Go back"; otherwise it SHALL lead to the list. The page title SHALL name the other account ("{name} · Messages"). A conversation the user is not part of SHALL show the not-found surface.

**Read state.** A message SHALL be marked read only once the user can see it: the page is visible and focused, and the thread is scrolled to the newest message. While the user is scrolled up, newer messages SHALL show a "New messages" control that scrolls to them, and reaching the newest message marks them read.

**Message box.** After a send, focus SHALL stay in the message box. Removing the attached card SHALL move focus to the message box. Text that was not sent SHALL be kept per conversation for the session: switching to another conversation and back keeps it, and a send that fails after the user has left the thread puts the text back in that conversation's box. Loading older messages SHALL not be read out by assistive technology as new messages.

#### Scenario: Not a member
- **WHEN** a user opens `/messages/<id>` for a conversation between two other accounts
- **THEN** the not-found surface is shown and no message is returned

#### Scenario: Phone
- **WHEN** a user opens a conversation at 390 px
- **THEN** only the thread is shown, with a back control to the list, and the page does not scroll sideways

#### Scenario: Load fails on a phone
- **WHEN** a conversation fails to load at 390 px
- **THEN** the screen offers Retry and a back control to the list

#### Scenario: Back from Message on a phone
- **WHEN** a user at 390 px activates Message on rin.trades's list and then uses the back control in the thread
- **THEN** they return to rin.trades's list, not to `/messages`

#### Scenario: Reading history
- **WHEN** the user is scrolled up reading older messages and the partner sends a message
- **THEN** it is not marked read, the partner sees no "Seen", and a "New messages" control appears; scrolling to it marks it read

#### Scenario: Draft kept
- **WHEN** the user types half a reply, opens another conversation, and comes back
- **THEN** the half-written reply is still in the box

#### Scenario: Attach from a list
- **WHEN** izrin96, with two linked profiles and a have list "Tradeables", opens Attach objekt, opens the source control, and picks Tradeables under My lists
- **THEN** the control reads "List · Tradeables", the drawer shows one card per collection on that list, and picking one attaches it and closes the drawer

#### Scenario: Filters kept across sources
- **WHEN** the user filters Attach objekt by a member on one profile and switches the source to a list
- **THEN** the list's cards are shown filtered by the same member

#### Scenario: Nothing to attach from
- **WHEN** a user with no linked Cosmo profile and no list opens Attach objekt
- **THEN** the drawer says to link a Cosmo profile and links to the profiles page
