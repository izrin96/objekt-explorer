# Spec Delta

## MODIFIED Requirements

### Requirement: Hide a partner
The user SHALL be able to hide a person:
- from the ⋯ menu of that person's row.

A hidden person's row SHALL leave Browse and For you at once, and a toast SHALL offer Undo. A hidden person SHALL not count toward Mutual, Mutual N, the list-header counts or want-list alerts.

When the user has hidden anyone or any post, Browse's footer note SHALL say that posts they hid, and posts from people they hid, aren't shown, and offer Hidden. Hidden SHALL open a dialog listing Hidden people, each with Unhide, and Hidden posts (see Hide a post). Account's Hidden page SHALL list Hidden people too.

#### Scenario: Hide and unhide
- **WHEN** the user activates Hide on rin.trades's row, and later unhides rin.trades from the footer note's Hidden dialog
- **THEN** rin.trades's row leaves the feed at once, and returns after unhiding

#### Scenario: Undo
- **WHEN** the user hides rin.trades from their row and activates Undo on the toast
- **THEN** rin.trades is not hidden, and their row is listed again

## ADDED Requirements

### Requirement: Hide a post
A signed-in user SHALL be able to hide one of another person's posts through Hide post in that post's ⋯ menu on Browse and For you, without hiding the person. The post SHALL leave the feed at once, and a toast SHALL offer Undo. Their own posts SHALL offer no Hide post. The hide SHALL last until the user unhides the post, or until its owner deletes the post's lead list.

#### Scenario: Hide one post
- **WHEN** rin.trades has two posts on Browse and the user activates Hide post on the first
- **THEN** that post leaves rin.trades's row at once, the second post stays and becomes the row's lead post, and a toast offers Undo

#### Scenario: Undo a post hide
- **WHEN** the user hides a post and activates Undo on the toast
- **THEN** the post is listed again in its place

#### Scenario: Own post
- **WHEN** the user opens the ⋯ menu on one of their own posts
- **THEN** it offers no Hide post

### Requirement: Hidden posts leave matching
A post the user hid SHALL take no part in the user's Trade. Its lists SHALL not count toward the header sentences, list counts, Any, Mutual or Mutual N, and SHALL not be shown on Browse or For you. When every post of a person is hidden, the person's row SHALL leave both feeds. Hiding a post SHALL not hide its owner's other posts, and unhiding the owner SHALL not unhide the post.

#### Scenario: Only the hidden post stops counting
- **WHEN** rin.trades's two posts each match the user's want list, and the user hides one
- **THEN** rin.trades's row counts only the other post's matches, and Mutual and Mutual N count rin.trades by that post alone

#### Scenario: Last post hidden
- **WHEN** the user hides rin.trades's only post
- **THEN** rin.trades's row leaves Browse and For you

#### Scenario: Person hidden and unhidden
- **WHEN** the user hides a post of rin.trades, then hides rin.trades and later unhides them
- **THEN** rin.trades's row returns without the hidden post

### Requirement: Hidden posts list
The Hidden dialog and Account's Hidden page SHALL list the posts the user hid, newest hide first, each naming the post's lists and its owner as a partner card names them (see Partner identity), linking to the post page, with Unhide. Unhide SHALL bring the post back to Browse and For you. With no hidden post, the list SHALL say so and say that Hide post is in a post's ⋯ menu.

#### Scenario: Unhide from Account
- **WHEN** the user opens `/account/hidden` and activates Unhide on a hidden post of rin.trades
- **THEN** the post leaves the list, and is listed again on rin.trades's row on Browse

#### Scenario: No hidden posts
- **WHEN** the user has hidden no post and opens `/account/hidden`
- **THEN** the Hidden posts section says no post is hidden and that Hide post is in a post's ⋯ menu
