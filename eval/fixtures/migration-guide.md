# Field guide: running reliable migrations

## Why migrations fail

Most migrations do not fail because of the new system. They fail because the old system was never fully understood. Hidden callers, undocumented retry behavior, and silent data contracts surface only when traffic shifts. The first job of any migration is archaeology: finding every path that touches the thing you intend to move, including the paths nobody remembers writing.

Treat the discovery phase as a deliverable in itself. A written inventory of callers, data shapes, and failure modes is the artifact that makes every later step cheaper. Teams that skip it pay for the same knowledge later, at incident prices, with an audience.

## The dual-write pattern

Dual-writing means every write goes to both the old and the new system, while reads still come from the old one. It is the safest way to build confidence in a new store because it lets you compare reality against reality instead of against expectations. The comparison job, not the write path, is where the value lives: run it continuously, alert on divergence, and make divergence counts a first-class dashboard.

The common mistake is treating dual-write as a switch you flip rather than a phase you staff. Someone must own the divergence budget, decide what an acceptable mismatch rate is, and have authority to pause the rollout when the budget is exceeded.

## Read cutover

Cut reads over gradually, by percentage or by tenant, never all at once. A canary read path with automatic rollback beats a heroic weekend cutover every time. Watch latency, error rate, and business metrics together; a migration that is technically clean but shifts a checkout metric by half a percent is not clean.

Keep the old read path warm for at least one full business cycle after the cutover reaches a hundred percent. Warm means tested, not merely present: run a synthetic read against it daily so the rollback path cannot rot.

## Backfills

A backfill is a batch job with production consequences. Throttle it like a customer, checkpoint it like a workflow, and verify it like a release. The two properties that matter are resumability and observability: you should be able to stop a backfill at any moment and know exactly which records remain, and you should be able to prove completeness without rerunning it.

Never backfill and dual-write the same records without a reconciliation rule. Decide explicitly which writer wins when both have written, and write that rule down where the on-call engineer will find it at 3 a.m.

## Rollback rehearsal

A rollback plan that has never been executed is a hypothesis. Rehearse it in staging with realistic data volume, time it, and record the steps as a runbook rather than a wiki page nobody trusts. The rehearsal almost always surfaces at least one step that depends on a person, a permission, or a system that will not be available during a real incident.

## Communication

Migrations fail socially before they fail technically. Every team with a caller on the old system needs a named contact, a timeline they agreed to, and a clear statement of what changes for them on which date. Surprises during a migration read as incompetence even when the engineering is sound, and the trust cost outlives the migration itself.

## The last ten percent

The final slice of any migration is disproportionately expensive: the long-tail caller with the custom client, the one report that runs quarterly, the integration owned by a team that no longer exists. Budget for it explicitly, decide early what you will deprecate rather than migrate, and write the deprecation notices before you are tired. The migration is finished when the old system is off, not when the new one works.
