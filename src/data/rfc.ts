export const sections = [
 {id:'context',number:'01',title:'Context & pressure',kind:'Problem',minutes:4,question:'What operational failure are we actually trying to prevent?'},
 {id:'requirements',number:'02',title:'Decision criteria',kind:'Criteria',minutes:5,question:'Which requirement is genuinely non-negotiable?'},
 {id:'options',number:'03',title:'Options considered',kind:'Explore',minutes:8,question:'Where does each option move complexity rather than remove it?'},
 {id:'decision',number:'04',title:'Decision',kind:'Commit',minutes:4,question:'What must be true for this choice to remain correct?'},
 {id:'consequences',number:'05',title:'Consequences',kind:'Trade-offs',minutes:6,question:'Which cost will surprise us six months after launch?'},
];
export const documentHtml = `
<h1 id="context">RFC-014: Selecting an event backbone for operational workflows</h1>
<p class="lead">A deliberately ordinary infrastructure decision, made difficult by reliability, team autonomy, and the cost of operating what we choose.</p>
<div class="callout"><strong>Reading mission</strong><span>Decide whether the recommendation remains valid when the organisation grows from 12 to 40 product teams.</span></div>
<h2>1. Context and pressure</h2>
<p>Several services currently coordinate work through synchronous APIs, database polling, and a small number of ad-hoc queues. This has worked while the workflows were short and owned by one team. It is beginning to fail as workflows cross team boundaries and need to survive retries, regional interruptions, and changes in downstream availability.</p>
<p>The immediate trigger is mundane: order status updates sometimes arrive out of sequence, and reconciliation takes hours of manual work. The larger concern is architectural. Each team is inventing a different delivery contract, retry policy, and observability model. The platform does not need another messaging product; it needs one dependable set of operating assumptions.</p>
<blockquote>Question to hold: are we choosing transport, or choosing an organisational contract?</blockquote>
<h2 id="requirements">2. Decision criteria</h2>
<p>The event backbone must support at-least-once delivery, replay for selected streams, explicit ownership, schema evolution, and enough throughput for projected growth. It must also remain operable by a central platform team of fewer than six engineers.</p>
<table><thead><tr><th>Criterion</th><th>Weight</th><th>Why it matters</th></tr></thead><tbody>
<tr><td>Operational burden</td><td>High</td><td>A theoretically superior system fails if it needs a specialist team.</td></tr>
<tr><td>Replay and retention</td><td>High</td><td>Audit and recovery depend on rebuilding state.</td></tr>
<tr><td>Developer usability</td><td>High</td><td>Teams will bypass a platform that is slow or obscure.</td></tr>
<tr><td>Cloud portability</td><td>Medium</td><td>Useful, but not worth large present-day complexity.</td></tr>
<tr><td>Peak throughput</td><td>Medium</td><td>Our expected load is significant, not internet-scale.</td></tr>
</tbody></table>
<h2 id="options">3. Options considered</h2>
<h3>Apache Kafka</h3><p>Kafka offers durable logs, strong replay semantics, a mature ecosystem, and predictable partition-based scaling. Its weakness is not capability but operational gravity. Managed Kafka reduces infrastructure effort, but topic design, partitioning, consumer lag, schema governance, and cost management still require expertise.</p>
<h3>NATS JetStream</h3><p>NATS provides a simple developer model, low latency, flexible subject-based routing, and a smaller operational footprint. JetStream adds persistence and replay. The trade-off is a narrower ecosystem and fewer engineers with deep production experience. It is easier to start, though some complexity reappears when retention, ordering, and multi-region recovery become central.</p>
<h3>AWS EventBridge plus SQS</h3><p>EventBridge and SQS minimize infrastructure ownership and integrate cleanly with AWS. They are attractive for routing business events and isolating consumers. Replay, ordering, and cross-account governance become a composition of services rather than one coherent log. Portability is low, though the more important concern is debugging behaviour spread across multiple managed primitives.</p>
<div class="diagram"><div><b>Producer</b><small>publishes domain event</small></div><span>→</span><div class="accent"><b>Event contract</b><small>schema · ownership · retention</small></div><span>→</span><div><b>Consumers</b><small>independent pace and failure</small></div></div>
<h2 id="decision">4. Decision</h2>
<p>Adopt <strong>NATS JetStream</strong> as the default event backbone for operational workflows, with a deliberately constrained platform contract. Use durable streams for domain events that require replay. Use ordinary core NATS only for ephemeral signals where loss is acceptable. Do not position NATS as the solution for every asynchronous workload.</p>
<p>The decision is based less on benchmark superiority and more on organisational fit. It gives teams a coherent model while remaining operable by the platform team we actually have. Kafka remains the escalation path when a workload demonstrates a need for deep log-processing capabilities, large retention windows, or an ecosystem dependency that materially changes the economics.</p>
<h2 id="consequences">5. Consequences and guardrails</h2>
<ul><li>Every event has an owning team, versioned schema, retention class, and documented idempotency strategy.</li><li>Consumers must assume duplicate delivery and observable lag.</li><li>The platform provides local development, dashboards, dead-letter handling, and paved-path client libraries.</li><li>We review the decision after two production migrations, not after an arbitrary calendar period.</li></ul>
<p>The largest risk is false simplicity. NATS is easier to approach than Kafka, but reliable event-driven systems still demand disciplined contracts. If the platform presents the technology as “just publish a message,” teams will recreate the same ambiguity that this RFC is intended to remove.</p>`;
