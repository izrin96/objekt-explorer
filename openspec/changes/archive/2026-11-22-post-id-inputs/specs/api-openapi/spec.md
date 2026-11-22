## REMOVED Requirements

### Requirement: Trade feed post ids
**Reason**: A feed post's `id` now names the post, not its anchor list, and `swapPair.theirPostId` names a post too. Once `shared-lists` puts a list in several posts, a list id no longer names one post.
**Migration**: Replaced by "Trade feed posts named by post id", "Can swap pair names a post" and "Side items take a list id" here. A client reads the old `id` at `sides[0].list.id`; `postId` stays equal to `id` for one release.

## ADDED Requirements

### Requirement: Trade feed posts named by post id
Each post of `GET /trade/people` SHALL carry `id`, an integer that names the post, never null, unique in the response, and the same while the post is: a post stays the same post when its owner edits it, whichever of its lists the edit swaps or drops. Each post SHALL also carry `postId`, equal to `id`, which the document SHALL describe as deprecated. A post's sides SHALL come in the order have, sale, want, so the first side is the anchor list; each side's `list.id` SHALL keep naming its list.

#### Scenario: A post's id and its anchor
- **WHEN** a client requests `GET /api/v1/trade/people`, and a person's post pairs have list 812 with want list 813
- **THEN** that post's `id` is the post's own id, a number other than 812 or 813, its `postId` equals its `id`, and its first side's `list.id` is 812

#### Scenario: Anchor changes, post id stays
- **WHEN** a person's Buy post on want list 813 has `id` 1000123, and the person then pairs have list 900 with it
- **THEN** the next response shows that post with `id` 1000123 and first side `list.id` 900

#### Scenario: Edit post swaps the have list, post id stays
- **WHEN** a person's post pairing have list 812 with want list 813 has `id` 1000200, and the person edits it to swap 812 for have list 950
- **THEN** the next response shows that post with `id` 1000200 and first side `list.id` 950

#### Scenario: Edit post drops the have list, post id stays
- **WHEN** a person's post pairing have list 812 with want list 813 has `id` 1000200, and the person edits it into a Buy post of 813 alone
- **THEN** the next response shows the Buy post with `id` 1000200 and one side, `list.id` 813

### Requirement: Can swap pair names a post
`swapPair.theirPostId` on a person's counts in `GET /trade/people` SHALL name a post: it SHALL equal the `id` of one of that person's posts in the same response.

#### Scenario: Can swap pair names a post
- **WHEN** a signed-in client reads a person whose counts carry `swapPair`
- **THEN** `swapPair.theirPostId` equals the `id` of one of that person's posts in the same response

### Requirement: Side items take a list id
`GET /trade/lists/{listId}/items` SHALL take a side's `list.id` as `listId`. The document SHALL describe `listId` as a side's `list.id` and SHALL not offer a post's `id` there.

#### Scenario: Side items by a side's list
- **WHEN** a client requests `GET /api/v1/trade/lists/{listId}/items` with a side's `list.id` from `GET /api/v1/trade/people`
- **THEN** the response holds that side's items, and the operation's `listId` description names a side's `list.id` only
