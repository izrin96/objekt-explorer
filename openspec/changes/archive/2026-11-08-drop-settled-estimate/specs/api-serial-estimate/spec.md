# Spec Delta

## Purpose

How many serials an offline collection has, as `collections.metadata` estimates it from the reserved token ranges and returns it on `/rpc` and `/api/v1` for the objekt drawer's "Max serial (est.)".

## ADDED Requirements

### Requirement: A drop still minting reads as at least
For an offline collection of an A drop in a block season, the estimate's `max` SHALL be null while any collection of its drop carries no grid fit time and the drop's earliest collection was created less than 7 days ago. `min` SHALL be the stored ranges' total, floored by the highest known serial, with no rounding toward the next foreign mint. A drop is the offline collections sharing season, collection number and artist.

#### Scenario: Cream02 355A while three members have not minted
- **WHEN** a viewer opens the drawer of `cream02-sullin-355a` 4 hours after the drop's first mint, and no collection of Cream02 355A carries a fit time
- **THEN** the estimate has `max: null` and the Serials tab reads "≥ N"

#### Scenario: The drop has been fitted
- **WHEN** every collection of Cream02 355A carries a fit time
- **THEN** the estimate is computed from the ranges as before, and can read an exact number

#### Scenario: One member lost its fit
- **WHEN** Cream02 355A is 3 days old and one of its collections has had its fit time cleared
- **THEN** every collection of the drop reads `max: null` again

#### Scenario: A drop that never fits
- **WHEN** a drop's earliest collection is 7 days old or more and some of its collections carry no fit time
- **THEN** the estimate is computed from the ranges as before

#### Scenario: A Z collection
- **WHEN** a viewer opens the drawer of an offline Z collection created an hour ago
- **THEN** the estimate is computed from the ranges as before

### Requirement: The estimate's response shape is unchanged
The open-drop rule SHALL NOT add, remove or rename any field of `collections.metadata`, so a tab opened before the deploy and `/api/v1` callers read it as before.

#### Scenario: An open tab after the deploy
- **WHEN** a tab built before the deploy reads `collections.metadata` for a collection of a drop still minting
- **THEN** it receives `serialEstimate` with `max: null` and shows "≥ N"
