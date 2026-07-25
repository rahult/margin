# ADR-009: Adopt Postgres for billing state

## Context

Billing state is currently spread across three Redis keyspaces and a nightly export. Reconciliation jobs fail silently about twice a month, and each failure costs the finance team roughly half a day of manual diffing.

We need transactional guarantees, point-in-time recovery, and a query model the finance team can use without engineering help.

## Options

### Stay on Redis

Zero migration cost, but persistence semantics are wrong for money. Snapshots are coarse and the query model is opaque to non-engineers.

### Move to Postgres

ACID transactions, mature tooling, and the team already operates two clusters. The cost is a migration window and dual-write period.

### Adopt a ledger service

Purpose-built for money movement, but adds a vendor dependency for our most sensitive data and does not cover non-ledger billing metadata.

## Decision

Move billing state to Postgres with an append-only event table as the source of truth. Dual-write for one billing cycle, then cut over reads.

## Consequences

- Finance gets SQL access for reconciliation.
- Engineering owns one fewer bespoke datastore.
- The migration needs a rehearsed rollback plan before the dual-write period begins.
