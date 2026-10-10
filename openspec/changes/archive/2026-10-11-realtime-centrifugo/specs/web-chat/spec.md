## MODIFIED Requirements

### Requirement: Realtime delivery
A sent message SHALL appear in the recipient's open thread and inbox within 2 seconds while their live connection is open, carrying its content as the recipient sees it, so showing it needs no further request. The sender's other open tabs SHALL show it the same way. A message's content SHALL reach only the two members of its conversation.

After a drop of up to 5 minutes, the client SHALL receive every event it missed, in order, without refetching. After a longer drop, or when missed events can no longer be replayed, the client SHALL fetch every message newer than the newest it holds, so no message is lost while disconnected. When a live message arrives and the client holds the thread but not the message before it, the client SHALL fetch the messages it is missing instead of only adding the new one, so a live event that was never delivered can't leave a permanent gap. Sending SHALL work while the connection is down.

#### Scenario: Live
- **WHEN** both users have the thread open and one sends a message
- **THEN** it appears for the other within 2 seconds without a reload, and no thread or inbox request is made to show it

#### Scenario: Viewer's own view
- **WHEN** a user sends a message that the scam scan flags
- **THEN** the recipient's live copy shows the caution and the sender's other tabs show it without one, as the thread endpoint would

#### Scenario: Short drop
- **WHEN** the recipient's connection was down for 30 seconds while 3 messages arrived and then reconnects
- **THEN** all 3 appear in order without a thread refetch

#### Scenario: Offline then back
- **WHEN** the recipient's connection was down for 10 minutes while 3 messages arrived and then reconnects
- **THEN** the client fetches newer messages and all 3 appear in order

#### Scenario: A lost live event
- **WHEN** the live event for message 41 never reached the recipient, and the event for message 42 arrives while the thread is open
- **THEN** the client fetches the missing messages, and 41 and 42 both appear in order

#### Scenario: Not a member
- **WHEN** a signed-in user who is not in a conversation tries to subscribe to another user's live events
- **THEN** the subscription is refused and nothing is delivered
