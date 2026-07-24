# RFC-014: Selecting an event backbone for operational workflows

**Status:** Proposed  
**Decision owner:** Platform Architecture  
**Reading mission:** Decide whether this recommendation remains valid when the organisation grows from 12 to 40 product teams.

## 1. Context and pressure

Several services currently coordinate work through synchronous APIs, database polling, and ad-hoc queues. This worked while workflows were short and owned by one team. It is beginning to fail as workflows cross team boundaries and must survive retries, regional interruptions, and downstream unavailability.

The immediate trigger is mundane: order status updates sometimes arrive out of sequence, and reconciliation takes hours of manual work. The larger concern is architectural. Each team is inventing a different delivery contract, retry policy, and observability model.

> Question to hold: are we choosing transport, or choosing an organisational contract?

## 2. Decision criteria

The backbone must support at-least-once delivery, replay for selected streams, explicit ownership, schema evolution, and projected throughput. It must remain operable by a central platform team of fewer than six engineers.

| Criterion | Weight | Why it matters |
|---|---:|---|
| Operational burden | High | A theoretically superior system fails if it needs a specialist team. |
| Replay and retention | High | Audit and recovery depend on rebuilding state. |
| Developer usability | High | Teams bypass platforms that are slow or obscure. |
| Cloud portability | Medium | Useful, but not worth large present-day complexity. |
| Peak throughput | Medium | Expected load is significant, not internet-scale. |

## 3. Options considered

### Apache Kafka
Kafka offers durable logs, strong replay semantics, a mature ecosystem, and predictable partition-based scaling. Its weakness is operational gravity: topic design, partitioning, consumer lag, schema governance, and cost management require expertise.

### NATS JetStream
NATS provides a simple developer model, low latency, subject-based routing, and a smaller operational footprint. JetStream adds persistence and replay. The trade-off is a narrower ecosystem and less deep production experience in the hiring market.

### AWS EventBridge plus SQS
EventBridge and SQS minimize infrastructure ownership and integrate cleanly with AWS. Replay, ordering, and cross-account governance become a composition of services rather than one coherent log. Debugging behaviour is spread across multiple managed primitives.

## 4. Decision

Adopt **NATS JetStream** as the default event backbone for operational workflows, with a constrained platform contract. Use durable streams for domain events requiring replay and core NATS only for ephemeral signals where loss is acceptable.

Kafka remains the escalation path when a workload demonstrates a need for deep log-processing, large retention windows, or an ecosystem dependency that changes the economics.

## 5. Consequences and guardrails

- Every event has an owning team, versioned schema, retention class, and documented idempotency strategy.
- Consumers assume duplicate delivery and observable lag.
- The platform supplies local development, dashboards, dead-letter handling, and paved-path clients.
- Review after two production migrations, not after an arbitrary calendar period.

The largest risk is false simplicity. NATS is easier to approach than Kafka, but reliable event-driven systems still require disciplined contracts.
