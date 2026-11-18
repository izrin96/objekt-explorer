# Spec Delta

## Purpose

How the worker numbers online objekts minted after Cosmo's v1 metadata cutoff, from mint order and from the serials connected accounts' Cosmo reads confirm.

## ADDED Requirements

### Requirement: Online serials follow mint order where nothing anchors them
An online objekt minted after the v1 cutoff, in a collection that is not pre-assigned, SHALL take the serial after the collection's highest pre-cutoff serial, counting its post-cutoff tokens in token id order, wherever no confirmed serial anchors it. Serials of objekts minted before the cutoff SHALL NOT change.

#### Scenario: A collection with no reads
- **WHEN** an online collection's highest pre-cutoff serial is 400 and its post-cutoff tokens are 61000010, 61000025 and 61000031, and no confirmed serial names the collection
- **THEN** they hold serials 401, 402 and 403

#### Scenario: Online anchors not enabled
- **WHEN** online anchors are not enabled and reads confirm serials in the collection
- **THEN** its serials follow mint order alone, and the reads are kept for when anchors are enabled

### Requirement: Confirmed serials anchor online collections
With online anchors enabled, an online token with a confirmed serial SHALL hold that serial. A later token SHALL hold the serial of the nearest anchored token before it plus the number of post-cutoff tokens between them in token id order. Tokens before the first anchored token SHALL keep mint order.

#### Scenario: Cosmo is ahead of mint order
- **WHEN** Atom02 HeeJin 101Z numbers token 27735402 as 1663 from mint order and rin.t's read shows it as 1990
- **THEN** 27735402 holds 1990, the next post-cutoff token of the collection holds 1991, and tokens before 27735402 keep their serials

#### Scenario: Two anchors with different shifts
- **WHEN** reads confirm token 61000100 as 120 and token 61000200 as 230, and 61000150 is the 20th post-cutoff token after 61000100
- **THEN** 61000150 holds 140 and 61000200 holds 230

#### Scenario: A read that matches mint order
- **WHEN** a read shows the serial mint order already gives
- **THEN** no serial moves

### Requirement: Online serials may repeat
Counting on from an anchor SHALL NOT be shortened or shifted to avoid a serial another token of the collection already holds. Two tokens of one collection MAY hold the same serial.

#### Scenario: Cosmo minted one serial twice
- **WHEN** reads confirm token 61000100 as 120 and token 61000105 as 124, and four post-cutoff tokens lie from 61000101 to 61000104
- **THEN** 61000101 to 61000104 hold 121 to 124, and 61000104 and 61000105 both hold 124

### Requirement: Online confirmed serials that run backwards are left out
When a collection holds two confirmed serials where the higher token id has the lower serial, none of that collection's confirmed serials SHALL anchor it, and each SHALL be reported to the operator as a conflict by count and token id.

#### Scenario: A read lower than an earlier one
- **WHEN** reads confirm token 61000100 as 120 and token 61000200 as 110 in one online collection
- **THEN** the collection's serials follow mint order, and the run reports two conflicts naming 61000100 and 61000200

### Requirement: A new online confirmed serial rewrites its collection
With online anchors enabled, a new or changed confirmed serial of an online collection SHALL rewrite that collection's post-cutoff serials within 10 minutes of being recorded, whether or not the collection holds an unnumbered objekt. When one sync brings more than 100 such collections, each further 100 MAY take 5 more minutes. Online reads SHALL NOT delay offline confirmed serials.

#### Scenario: An old collection gets its first read
- **WHEN** rin.t connects and its read confirms a serial in Atom02 HeeJin 101Z, which minted nothing in the last week
- **THEN** within 10 minutes the collection's serials follow the read

### Requirement: Only trusted reads become online confirmed serials
A read of an online objekt SHALL count as a confirmed serial only when the chain confirmed its holder when it was recorded and the objekt has not been received since, the token sits in the collection the read names, and the token was minted after the v1 cutoff. A read whose token was not yet indexed SHALL NOT count on Cosmo's word alone.

#### Scenario: A pre-cutoff online objekt
- **WHEN** a read shows a different serial for an online objekt minted before the v1 cutoff
- **THEN** its serial is unchanged and the difference is counted for the operator

#### Scenario: A token in another collection
- **WHEN** a read names token 61000100 for a collection the site files it under another one
- **THEN** the read anchors nothing

### Requirement: Reads recorded before this change count
Reads of post-cutoff online objekts recorded before this change SHALL be judged under these rules once, without waiting for the account's next sync.

#### Scenario: A read from yesterday
- **WHEN** rin.t's read of token 27735402 was recorded the day before deploy and judged not eligible as online
- **THEN** after the one-off judgement it is a confirmed serial and anchors Atom02 HeeJin 101Z

### Requirement: Online confirmed serials outlive accounts and indexer rebuilds
Online confirmed serials and the serials computed from them SHALL stay when the account that supplied them disconnects, its session ends, or its user is banned, anonymized or deleted. After an indexer rebuild the online serial job SHALL anchor on them again with no step of its own.

#### Scenario: The account disconnects
- **WHEN** token 27735402's confirmed serial of 1990 came from rin.t and rin.trades disconnects rin.t
- **THEN** 27735402 keeps 1990

### Requirement: Operator previews online moves
The read-only plan report SHALL show, per online collection, the serials its confirmed serials would move and by how much, and its conflicts.

#### Scenario: Preview before enabling
- **WHEN** the operator runs the report on a read-only connection
- **THEN** it lists Atom02 HeeJin 101Z with the serials that would move up by 327, and writes nothing

### Requirement: Online anchors have their own switch
The operator SHALL enable online anchors separately from offline anchors, and they SHALL ship off. Turning offline anchors on or off SHALL NOT change any online serial.

#### Scenario: Offline anchors on, online anchors off
- **WHEN** offline anchors are enabled, online anchors are not, and a read confirms token 27735402 as 1990
- **THEN** 27735402 keeps its mint-order serial, and offline batches are anchored as before
