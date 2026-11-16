# Spec Delta

## ADDED Requirements

### Requirement: Trade feed post ids
Each post of `GET /trade/people` SHALL carry `postId`, an integer that names the post and stays the same while the post does, beside `id`, the id of the post's anchor list. `id`, `swapPair.theirPostId` and every side's `list.id` SHALL keep naming lists. The document SHALL describe `postId`. It SHALL be null only for a post whose lists no stored post holds.

#### Scenario: Both ids on a post
- **WHEN** a client requests `GET /api/v1/trade/people`, and a person's post pairs have list 812 with want list 813
- **THEN** that post's `id` is 812 and its `postId` is the post's own id, a different number

#### Scenario: Anchor changes, post id stays
- **WHEN** a person's Buy post on want list 813 has `postId` 1000123, and the person then pairs have list 900 with it
- **THEN** the next response shows that post with `id` 900 and `postId` 1000123

#### Scenario: Can swap pair still names a list
- **WHEN** a signed-in client reads a person whose counts carry `swapPair`
- **THEN** `swapPair.theirPostId` equals the `id`, not the `postId`, of one of that person's posts in the same response
